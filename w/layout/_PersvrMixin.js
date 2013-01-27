define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/query",
	"dojo/request",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/Deferred"
],function(declare,lang,array,query,request,domConstruct,domAttr,Deferred) {

return declare("dlagua.w.layout._PersvrMixin", [], {
	store:null,
	stores:{},
	schema:null,
	schemata:{},
	templateModule:"",
	template:"",
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
		// TODO: wait for requires to return
		if(reqs.length) require(reqs);
		tpl = div.innerHTML.toString();
		tpl = tpl.replace(/\{\{&gt;/g,"{{>");
		return {tpl:tpl,partials:partials};
	}
});

});