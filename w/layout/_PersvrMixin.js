define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/query",
	"dojo/request",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/Deferred",
	"dlagua/c/store/JsonRest",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dojox/json/ref"
],function(declare,lang,array,query,request,domConstruct,domAttr,Deferred,JsonRest,Memory,Cache,jsonref) {

return declare("dlagua.w.layout._PersvrMixin", [], {
	store:null,
	stores:{},
	schema:null,
	schemata:{},
	templateModule:"",
	template:"",
	useItemChildren:false,
	_fetchTpl: function(template) {
		// TODO add xdomain fetch
		return request(require.toUrl(this.templateModule)+"/"+template);
	},
	_getSchema:function(){
		var d = new Deferred;
		// prevent getting schema again
		if(this.schemata[this.store.schemaUri]) {
			this.schemaUri = this.store.schemaUri;
			var schema = this.schema = this.schemata[this.schemaUri];
			for(var k in schema.properties) {
				if(schema.properties[k].primary) this.idProperty = k;
				if(schema.properties[k].hrkey) this.hrProperty = k;
			}
			this.store.idProperty = this.idProperty;
			d.resolve(true);
			return d;
		}
		if(!this.schemaUri || this.schemaUri!=this.store.schemaUri) {
			this.schemaUri = this.store.schemaUri;
			this.store.getSchema(this.store.schemaUri,{useXDomain:(this.useXDomain)}).then(lang.hitch(this,function(schema){
				this.schema = schema;
				this.schemata[this.schemaUri] = schema;
				for(var k in schema.properties) {
					if(schema.properties[k].primary) this.idProperty = k;
					if(schema.properties[k].hrkey) this.hrProperty = k;
				}
				this.store.idProperty = this.idProperty;
				d.resolve(true);
			}));
		} else {
			d.resolve(true);
		}
		return d;
	},
	loadFromItem:function(){
		this.inherited(arguments);
		if(this.servicetype=="persvr") {
			var item = lang.mixin({},this.currentItem);
			if(!item.service) item.service = (this.service || "/persvr/");
			if(!item.model) return;
			var model = item.model;
			var target = item.service+model+"/";
			var schemaUri = item.service+"Class/"+model;
			// reset if triggered by currentItem
			if(arguments.length>0) {
				this.sort = this.filter = this.orifilter = "";
				this.filters = this.orifilters = null;
			}
			if(!this.newsort && item.sort) this.sort = item.sort;
			if(item.filter) this.orifilter = this.filter = item.filter;
			if(!this.store) {
				this.store = new JsonRest({
					target:target,
					schemaUri:schemaUri
				});
				if(this.stores) {
					if(!this.stores[target]) {
						this.stores[target] = new Cache(this.store, new Memory());
					}
				}
			} else {
				this.store.target = target;
				this.store.schemaUri = schemaUri;
			}
			this.rebuild(item);
		}
	},
	rebuild:function(){
		this.inherited(arguments);
		if(this.servicetype=="persvr") {
			this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
				this.parseTemplate(tpl).then(lang.hitch(this,function(tplo){
					this._tplo = tplo;
					this._getSchema().then(lang.hitch(this,function(){
						var q = this.createQuery();
						var start = this.start;
						this.start += this.count;
						var results = this.results = this.store.query(q,{
							start:start,
							count:this.count,
							useXDomain:this.useXDomain
						});
						if(!this.useItemChildren){
							results.total.then(lang.hitch(this,function(total){
								this.total = total;
								if(total===0 || isNaN(total)) this.onReady();
							}));
							results.forEach(lang.hitch(this,this.addItem));
						} else {
							results.then(lang.hitch(this,function(res){
								this.total = res[0].children.length;
								if(this.total===0 || isNaN(this.total)) this.onReady();
								jsonref.refAttribute = "_ref";
								var store = this.store;
								var item = jsonref.resolveJson(res[0],{
									loader:function(callback,d){
										store.get(this["_ref"]).then(function(item){
											callback(item,d);
										});
									}
								});
								item.children.forEach(lang.hitch(this,this.addItem));
							}));
						}
					}));
				}));
			}));
		}
	},
	parseTemplate: function(tpl){
		tpl = tpl.replace(/[\n\t\u200B\u200C\u200D\uFEFF]+/g,"").replace(/\>\s+\</g,"><");
		var div = domConstruct.create("div",{
			innerHTML:tpl
		});
		query("span.templaField",div).forEach(function(node){
			var p = node.parentNode;
			var inner = node.firstChild;
			p.insertBefore(inner, node);
			p.removeChild(node);
		});
		var types = [];
		// look for nesting
		var partials = {};
		var partialcount = 0;
		var getNode = function(node){
			var type = domAttr.get(node,"data-templa-type");
			types.push(type);
			var props = domAttr.get(node,"data-templa-props");
			var pre = document.createTextNode("{{#_mod}}"+type+"|"+(props || "")+"|");
			var post = document.createTextNode("{{/_mod}}");
			domConstruct.place(pre,node,"first");
			domConstruct.place(post,node);
			return node;
		}
		query("span[data-templa-type] span[data-templa-type]",div).forEach(function(node){
			node = getNode(node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
			var partname = "_mod"+partialcount;
			partials[partname] = p.innerHTML;
			p.innerHTML = "{{>"+partname+"}}";
			partialcount++;
		});
		query("span[data-templa-type]",div).forEach(function(node){
			node = getNode(node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
		});
		var reqs = [];
		array.forEach(types,function(type){
			if(type.indexOf("::")) {
				var ar = type.split("::");
				type = ar[0];
				reqs.push(type.replace(/\./g,"/"));
			}
		});
		tpl = div.innerHTML.toString();
		tpl = tpl.replace(/\{\{&gt;/g,"{{>");
		var d = new Deferred();
		if(reqs.length) {
			require(reqs,function(){
				d.resolve({
					tpl:tpl,
					partials:partials
				});
			})
		} else {
			d.resolve({
				tpl:tpl,
				partials:partials
			});
		}
		return d;
	}
});

});