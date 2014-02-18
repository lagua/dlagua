define([
	"require",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/query",
	"dojo/request",
	"dojo/aspect",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/Deferred",
	"dlagua/c/store/JsonRest",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dlagua/w/layout/TemplaMixin",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dojo/store/Observable",
	"dojox/json/ref",
	"rql/query",
	"rql/parser"
],function(require,declare,lang,array,fx,query,request,aspect,domConstruct,domAttr,Deferred,JsonRest,ScrollableServicedPaneItem,TemplaMixin,Memory,Cache,Observable,jsonref,rqlQuery,rqlParser) {

var ScrollableTemplatedPaneItem = declare("dlagua.w.layout.ScrollableTemplatedPaneItem",[ScrollableServicedPaneItem,TemplaMixin],{
});

return declare("dlagua.w.layout._ModelMixin", [], {
	store:null,
	stores:{},
	schema:null,
	schemata:{},
	templateModule:"",
	template:"",
	query:"",
	start:0,
	count:25,
	total:Infinity,
	filterByItemProperties:"",
	useItemChildren:false,
	_tplo:null,
	partials:"",
	startup:function(){
		if(this._started) return;
		if(this.store) {
			this.stores[this.store.target] = this.store;
			this.template = this.getTemplate();
			this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
				this.parseTemplate(tpl).then(lang.hitch(this,function(tplo){
					this._tplo = tplo;
					var openStore = lang.hitch(this,function(){
						this.store = this.stores[this.store.target] = new Observable(this.store);
						
						var results = this.store.query();
						results.forEach(lang.hitch(this,this.addItem));
						
						this.own(
							results.observe(lang.hitch(this,function(item, removed, inserted){
								if(removed > -1){ // existing object removed
									this._removeItemById(item[this.idProperty]);
								}
								if(inserted > -1){ // new or updated object inserted
									this.addItem(item);
									this.currentId = item[this.idProperty];
								}
							})),
							this.watch("newItem",function(name,oldItem,item){
								this.store.add(item);
								this.newItem = null;
							}),
							this.watch("removeItem",function(name,oldId,id){
								this.store.remove(id);
								this.removeItem = null;
							})
						);
					});
					if(this.store.open) {
						this.store.open().then(openStore);
					} else { 
						openStore();
					}
				})); 
			}));
		}
		this.inherited(arguments);
		this.own(
			this.watch("filter",function(){
				console.log(this.id,"reloading from filter",this.filter)
				this.orifilter = this.filter;
				this.forcedLoad();
			}),
			this.watch("filterById",lang.hitch(this,function(prop,oldVal,newVal){
				// wait for all properties to be reset
				if(this._loading) {
					this.filterById = oldVal;
					var _rh = aspect.after(this,"onReady",function(){
						_rh.remove();
						this.set("filterById",newVal)
					},true);
					return;
				}
				setTimeout(lang.hitch(this,function(){
					if(oldVal && !newVal) this.currentId = oldVal;
					this.forcedLoad();
				}),1);
			})),
			this.watch("newData",function(){
				array.forEach(this.newData,lang.hitch(this,function(item,i,items){
					this.addItem(item,i,items,"first");
					this.currentId = item[this.idProperty];
				}));
			}),
			this.watch("filters",this.onFilters)/*,
			this.watch("sort",function(){
				this.newsort = true;
				this.forcedLoad();
				this.newsort = false;
			}),
			this.watch("childTemplate",function(){
				this.replaceChildTemplate();
			})*/
		);
	},
	replaceChildTemplate: function(child,templateDir,partials) {
		if(!templateDir) templateDir = this.templateDir;
		var template = this.getTemplate(templateDir);
		this._fetchTpl(template).then(lang.hitch(this,function(tpl){
			this.parseTemplate(tpl,partials).then(function(tplo){
				if(child && child!="childTemplate"){
					child.applyTemplate(tplo.tpl,tplo.partials);
				} else {
					// FIXME: is this really permanent?
					this._tplo = tplo;
					array.forEach(this.getChildren(),function(li){
						li.applyTemplate(tplo.tpl,tplo.partials);
					});
				}
			});
		}));
	},
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
	onFilters:function(){
		if(!this.orifilters) {
			this.orifilters = this.filters;
		} else {
			this.orifilters = lang.mixin(this.orifilters,this.filters);
		}
		this.filters = null;
		var fa = new rqlQuery.Query();
		var keys = {};
		for(var k in this.orifilters){
			if(this.orifilters[k].checked) {
				var fo = rqlParser.parseQuery(this.orifilters[k].filter);
				fo.walk(function(name,terms){
					var k = terms[0];
					var v;
					if(terms.length>1) v = terms[1];
					if(keys[k]) {
						fa = fa.or();
					}
					if(v) {
						fa = fa[name](k,v);
					} else {
						fa = fa[name](k);
					}
				});
			}
		}
		if(this.orifilter) {
			var oo = rqlParser.parseQuery(this.orifilter);
			oo.walk(function(name,terms){
				var k = terms[0];
				var v;
				if(terms.length>1) v = terms[1];
				if(keys[k]) {
					fa = fa.or();
				}
				if(v) {
					fa = fa[name](k,v);
				} else {
					fa = fa[name](k);
				}
			});
		}
		this.filter = fa.toString();
		this.forcedLoad();
	},
	loadFromItem:function(prop,oldValue,newValue){
		if(!this._allowLoad(oldValue,newValue)) return;
		this.inherited(arguments);
		if(this.servicetype=="model") {
			var item = lang.mixin({},this.currentItem);
			if(!item.service) item.service = (this.service || "/model/");
			if(!item.model) return;
			var model = item.model;
			var target = item.service+model+"/";
			var schemaUri = item.service+"Class/"+model;
			// reset if triggered by currentItem
			if(arguments.length>0) {
				if(this.orisort) this.sort = this.orisort;
				this.orisort = "";
				if(this.orifilter) this.filter = this.orifilter;
				this.orifilter = "";
				if(this.orifilters) this.filters = this.orifilters;
				this.orifilters = null;
			}
			this.start = this.total = 0;
			if(item.count) {
				this._oricount = this.count;
				this.count = item.count;
			} else if(this._oricount) {
				this.count = this._oricount;
			}
			if(!this.newsort && item.sort) this.sort = item.sort;
			if(item.filter) this.orifilter = this.filter = item.filter;
			if(!this.stores[target]) {
				this.store = new JsonRest({
					target:target,
					schemaUri:schemaUri
				});
				this.stores[target] = this.store;// new Cache(this.store, new Memory());
			} else {
				this.store = this.stores[target];
			}
			this.rebuild(item);
		}
	},
	rebuild:function(){
		this.inherited(arguments);
		if(this.servicetype=="model") {
			this._getSchema().then(lang.hitch(this,function(){
				this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
					var partials = {};
					if(this.partials) {
						array.forEach(this.partials.split(","),function(_){
							var a =_.split("=");
							partials[a[0]] = a[1];
						});
					}
					this.parseTemplate(tpl,partials).then(lang.hitch(this,function(tplo){
						this._tplo = tplo;
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
	createQuery:function(){
		var qo = this.query ? rqlParser.parseQuery(this.query) : new rqlQuery.Query();
		if(this.filterByLocale) qo = qo.eq("locale",this.locale);
		if(this.filter) {
			// try to parse it first
			var fo = rqlParser.parseQuery(this.filter);
			fo.walk(function(name,terms){
				var k = terms[0];
				var v;
				if(terms.length>1) v = terms[1];
				if(v) {
					if(typeof v == "string") v = v.replace("undefined","*");
					qo = qo[name](k,v);
				} else {
					qo = qo[name](k);
				}
			});
		}
		if(this.filterByItemProperties) {
			var ar = this.filterByItemProperties.split(",");
			for(var i=0;i<ar.length;i++) {
				var k = ar[i];
				if(k in this.currentItem) {
					var v = this.currentItem[k];
					qo = qo.eq(k,v);
				}
			}
		}
		if(this.filterById) {
			qo = qo.eq(this.idProperty,this.filterById);
		}
		if(this.sort) {
			qo = qo.sort(this.sort);
		}
		return "?"+qo.toString();
	},
	_compare: function (a, b) {
		var sort = this.sort.split(",");
		var terms = [];
		for(var i=0; i<sort.length; i++){
			var sortAttribute = sort[i];
			var firstChar = sortAttribute.charAt(0);
			var term = {attribute: sortAttribute, ascending: true};
			if (firstChar == "-" || firstChar == "+") {
				if(firstChar == "-"){
					term.ascending = false;
				}
				term.attribute = term.attribute.substring(1);
			}
			var ta = term.attribute.split(":");
			if(ta.length>1) {
				term.type = ta.shift();
				term.attribute = ta.join(":");
			}
			// if one of items doesn't have attr we cannot compare?
			// if(a.hasOwnProperty(term.attribute) && b.hasOwnProperty(term.attribute)) 
			terms.push(term);
		}
		for (var term, i = 0; term = terms[i]; i++) {
			var aa = a[term.attribute];
			var ab = b[term.attribute];
			aa = aa instanceof Date ? aa.getTime() : aa;
			ab = ab instanceof Date ? ab.getTime() : ab;
			switch(term.type) {
				case "number":
					aa = parseInt(aa,10);
					ab = parseInt(ab,10);
					break;
				case "string":
					aa+="";
					ab+="";
					break;
				case "date":
					aa = (new Date(aa)).getTime();
					ab = (new Date(ab)).getTime();
					break;
				default:
			}
			if(aa != ab) {
				return term.ascending == aa > ab ? 1 : -1;
			}
		}
		return 0;
	},
	_findIndex: function(insert) {
		var items = this.getChildren(),
		max   = items.length,
		min   = 0,
		item, middle;
		if(!max || !this.sort) return max;
		// Perform an iterative binary search to determine the correct position
		// based on the return value of the `comparator` function.
		while (min < max) {
			middle = (min + max) >> 1; // Divide by two and discard remainder.
			item = items[middle];
			if(this._compare(item.data, insert) < 0) {
				min = middle + 1;
			} else {
				max = middle;
			}
		}
		return min;
	},
	addItem:function(item,index,items,insertIndex) {
		if(this._beingDestroyed) return;
		var content = "";
		var listItem = new ScrollableTemplatedPaneItem({
			parent:this,
			data:item,
			itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
		});
		items = items || this.getChildren();
		var len = items.length;
		if(!insertIndex && this.sort) insertIndex = this._findIndex(item);
		aspect.after(listItem,"onLoad",lang.hitch(this,function(){
			// as this can take a while, listItem may be destroyed in the meantime
			if(this._beingDestroyed || listItem._beingDestroyed) return;
			// ref item may have been resolved now
			var item = listItem.data;
			if(item.name) listItem.set("id","dlaguaSSPItem_"+item.name);
			var id = item[this.idProperty];
			listItem.applyTemplate(this._tplo.tpl,this._tplo.partials);
			fx.fadeIn({node:listItem.containerNode}).play();
			this.childrenReady++;
			if(this.childrenReady == len) {
				// wait for the margin boxes to be set
				setTimeout(lang.hitch(this,function(){
					this.onReady();
				}),10);
			}
			this.itemnodesmap[id] = listItem;
		}));
		this.addChild(listItem,insertIndex);
	},
	_removeItemById:function(id) {
		var i=0;
		var items = this.getChildren();
		for(;i<items.length;i++) {
			if(items[i][this.idProperty]==id) break;
		}
		if(i<items.length) items.splice(i,1);
		this.itemnodesmap[id].destroyRecursive();
		delete this.itemnodesmap[id];
	},
	parseTemplate: function(tpl,partials){
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
		var partials = partials || {};
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
	},
	getModel:function(){
		return this.model || this.currentItem.model;
	},
	getTemplate:function(templateDir,suffix){
		var xtemplate = "";
		suffix = suffix && !this.filterById ? "_"+suffix : "";
		var locale = this.locale;
		if(!this.childTemplate) {
			var item = this.currentItem;
			if(!item) return;
			if(item.locale) locale = item.locale;
			if(!templateDir) templateDir = this.templateDir;
			if(item[this.templateProperty]) {
				var tpath = item[this.templateProperty];
				/*if(this.templateProperty=="path" && this.filterById) {
					var ar = tpath.split("/");
					var i;
					for(i=0;i<ar.length;i++){
						if(ar[i]==this.filterById) {
							break;
						}
					}
					tpath = ar.splice(0,i).join("/");
				}*/
				xtemplate = (templateDir ? templateDir+"/" : "")+tpath+suffix+(this.filterById ? "_view.html" : ".html");
			}
		}
		return locale+"/"+(this.childTemplate ? this.childTemplate : xtemplate);
	}
});

});