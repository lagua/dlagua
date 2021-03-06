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
	"dojo/when",
	"dlagua/c/store/FormData",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dlagua/w/layout/TemplaMixin",
	"dlagua/c/templa/Mixin",
//	"dojox/json/ref",
	"rql/query",
	"rql/parser"
],function(reqr,declare,lang,array,fx,
		query,request,aspect,domConstruct,domAttr,Deferred,when,
		FormData,ScrollableServicedPaneItem,TemplaMixin,Mixin,
		rqlQuery,rqlParser) {

var ScrollableTemplatedPaneItem = declare("dlagua.w.layout.ScrollableTemplatedPaneItem",[ScrollableServicedPaneItem,TemplaMixin],{
});

return declare("dlagua.w.layout._ModelMixin", [], {
	store:null,
	stores:{},
	schema:null,
	templateModule:"",
	templatePath:"",
	base:"",
	template:"",
	query:"",
	start:0,
	count:25,
	total:Infinity,
	localizedTemplate:true,
	filterByItemProperties:"",
	useItemChildren:false,
	persistentStore:false,
	_tplo:null,
	_tplCache:{},
	partials:"",
	ChildClass:ScrollableTemplatedPaneItem,
	Mixin:Mixin,
	_resolveCache:null,
	startup:function(){
		if(this._started) return;
		this._resolveCache = {};
		// support templateModule for now
		if(this.templateModule) this.templatePath = reqr.toUrl(this.templateModule)+"/"+this.templatePath;
		this.template = this.getTemplate();
		/*if(this.store) {
			// FIXME perhaps not needed?
			var service = this.xuriService ? this.xuriService : this.base+"rest/"+this.locale;
			var xroot = "../../"+service+"/";
			var resolveProps = this.resolveProperties;
			if(typeof resolveProps == "string") {
				resolveProps = resolveProps ? resolveProps.split(",") : [];
			}
			lang.mixin({
				refProperty:this.refAttribute,
				mixin:new this.Mixin(),
				xroot:xroot,
				resolveProperties:resolveProps,
				headers:this.headers
			},this.store);
		}*/
		if(this.store) {
			if(this.stores[this.store.target]){
				var store = this.stores[this.store.target];
				if(this.store.id == store.id){
					// FIXME hack to enable store reuse
					this.store = store;
				}
			} else {
				this.stores[this.store.target] = this.store;
			}
			//var results = this.store.fetch();
			if(this.template) {
				this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
					this.parseTemplate(tpl).then(lang.hitch(this,function(tplo){
						this._tplo = tplo;
						//results.forEach(this.addItem,this);
					}));
				}));
			}
			this.own(
				this.store.on("add,update,delete",lang.hitch(this,function(evt){
					if(evt.type == "delete"){
						this._removeItemById(evt[this.idProperty]);
					} else if(evt.type == "add"){
						var ret = typeof evt.target == "object" ? new Deferred().resolve(evt.target) : this.store.get(evt.target,{noop:true}) 
						ret.then(lang.hitch(this,function(item){
							this.addItem(item);
							this.currentId = item[this.idProperty];
						}));
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
					var _rh = aspect.after(this,"ready",function(){
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
			this.watch("filters",this.onFilters),
			this.watch("sort",function(){
				this.newsort = true;
				this.forcedLoad();
				this.newsort = false;
			})/*,
			this.watch("childTemplate",function(){
				this.replaceChildTemplate();
			})*/
		);
	},
	replaceChildTemplate: function(child,templateDir,partials) {
		var d = new Deferred();
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
				d.resolve();
			});
		}));
		return d;
	},
	_fetchTpl: function(template) {
		// TODO add xdomain fetch
		var uri = this.templatePath+"/"+template;
		var req = this._tplCache[uri] ? new Deferred().resolve(this._tplCache[uri]) : request(uri);
		req._uri = uri;
		var self = this;
		when(req,function(tpl){
			self._tplCache[uri] = tpl;
		});
		return req;
	},
	onFilters:function(){
		console.warn(this.filters)
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
			if(!item.service) item.service = (this.service || this.base+"model/");
			if(!item.model) return;
			var model = item.model;
			var target = item.service+model+"/";
			// reset if triggered by currentItem
			if(arguments.length>0) {
				this.sort = "";
				if(item.sort) this.sort = item.sort;
				this.filter = "";
				if(item.filter) this.orifilter = this.filter = item.filter;
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
			var service = this.xuriService ? this.xuriService : this.base+"rest/"+this.locale;
			var xroot = "../../"+service+"/";
			var resolveProps = this.resolveProperties;
			if(typeof resolveProps == "string") {
				resolveProps = resolveProps ? resolveProps.split(",") : [];
			}
			if(!this.stores[target]) {
				this.store = new FormData({
					model:model,
					target:target
				});
				this.stores[target] = this.store;// new Cache(this.store, new Memory());
			} else {
				this.store = this.stores[target];
			}
			// do update all properties, since meta may change them 
			lang.mixin(this.store,{
				model:model,
				target:target,
				refProperty:this.refAttribute,
				mixin:new this.Mixin(),
				xroot:xroot,
				resolveProperties:resolveProps,
				headers:this.headers || {}
			});
			this.rebuild(item);
		}
	},
	rebuild:function(){
		this.inherited(arguments);
		if(this.servicetype=="model") {
			this.store.getSchema().then(lang.hitch(this,function(schema){
				this.schema = schema;
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
						q = q === "" ? null : q;
						var start = this.start;
						this.start += this.count;
						var results = this.results = this.store.query(q,{
							start:start,
							count:this.count,
							useXDomain:this.useXDomain
						});
						if(!this.useItemChildren){
							var tot = typeof results.total == "number" ? new Deferred().resolve(results.total) : results.total;
							tot.then(lang.hitch(this,function(total){
								this.total = parseInt(total,10);
								if(this.total===0 || isNaN(this.total)) this.ready();
							}));
							results.forEach(this.addItem,this);
						} else {
							results.then(lang.hitch(this,function(res){
								res = (!res || !res.length) ? [] : res;
								var children = res.length && res[0].children ? res[0].children : [];
								this.total = children.length;
								if(this.total===0 || isNaN(this.total)) this.ready();
								item.children.forEach(this.addItem,this);
							}));
						}
					}));
				}),lang.hitch(this,function(err){
					// template fails, but we should still call ready()
					this.ready();
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
					return v;
				}
			});
			fo.args.forEach(function(arg){
				qo = qo[arg.name].apply(qo,arg.args);
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
		return qo.toString();
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
		var iso = /^([0-9]{4})(-([0-9]{2})(-([0-9]{2})([T ]([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2})((:?)([0-9]{2}))?))?)?)?)?$/;
		for (var term, i = 0; term = terms[i]; i++) {
			var aa = a[term.attribute];
			var ab = b[term.attribute];
			aa = aa instanceof Date ? aa.getTime() : aa;
			ab = ab instanceof Date ? ab.getTime() : ab;
			aa = typeof aa==="string" && aa.match(iso) ? (new Date(aa)).getTime() : aa;
			ab = typeof ab==="string" && ab.match(iso) ? (new Date(ab)).getTime() : ab;
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

		items = items || this.getChildren();
		var len = items.length;
		var id = item[this.idProperty];
		if(!insertIndex && this.sort) insertIndex = this._findIndex(item);
		var listItem = new this.ChildClass({
			parent:this,
			data:item,
			itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
		});
		var skipX = this.currentItem && this.currentItem.noHtmlPreview || this.skipXuriResolving;
		this.store.get(item.id,{skipX:skipX}).then(lang.hitch(this,function(resolved){
			if(this._beingDestroyed || listItem._beingDestroyed) return;
			listItem.mixeddata = lang.mixin(resolved,{
				node:listItem,
				ref:this
			});
			// ref item may have been resolved now
			if(item.name) listItem.set("id","dlaguaSSPItem_"+item.name.replace(/\s/g,"_"));
			listItem.applyTemplate(this._tplo.tpl,this._tplo.partials);
			fx.fadeIn({duration:100,node:listItem.containerNode}).play();
			this.childrenReady++;
			if(this.childrenReady == len) {
				// wait for the margin boxes to be set
				setTimeout(lang.hitch(this,function(){
					this.ready();
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
			reqr(reqs,function(){
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
		var tpath="",xtemplate = "";
		suffix = suffix && !this.filterById ? "_"+suffix : "";
		var locale = this.locale;
		if(!this.childTemplate) {
			var item = this.currentItem;
			if(!item) return;
			if(item.locale) locale = item.locale;
			if(!templateDir) templateDir = this.templateDir;
			if(item.template) {
				tpath = item.template;
			} else if(item[this.templateProperty]) {
				tpath = item[this.templateProperty];
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
			}
			if(tpath) xtemplate = (templateDir ? templateDir+"/" : "")+tpath+suffix+(this.filterById ? "_view.html" : ".html");
		}
		return (this.localizedTemplate ? locale+"/" : "")+(this.childTemplate ? this.childTemplate : xtemplate);
	},
	ready:function(){
		this.inherited(arguments);
		// reset resolveCache, TODO only reset on change
		this._resolveCache = {};
	}
});

});