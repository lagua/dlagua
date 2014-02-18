define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/request",
	"dojo/aspect",
	"dojo/hash",
	"dojo/Deferred",
	"dojo/dom-class",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dlagua/w/layout/TemplaMixin",
	"dforma/Builder",
	"dforma/jsonschema",
	"rql/query",
	"rql/js-array",
	"dojox/mobile/i18n",
	"dojo/store/Observable",
	"dlagua/c/store/FormData"
],function(declare,lang,array,fx,request,aspect,hash,Deferred,domClass,ScrollableServicedPaneItem,TemplaMixin,Builder,jsonschema,rqlQuery,jsArray,i18n,Observable,FormData) {

var ScrollableFormPaneItem = declare("dlagua.w.layout.ScrollableFormPaneItem",[ScrollableServicedPaneItem,TemplaMixin,Builder],{
});

function traverse(obj,func, parent) {
	for (i in obj){
		func.apply(obj,[i,obj[i],parent]);
		if (obj[i] instanceof Object && !(obj[i] instanceof Array)) {
			traverse(obj[i],func, i);
		} else if(obj[i] instanceof Array) {
			array.forEach(obj[i],function(o){
				traverse(o,func, i);
			});
		}
	}
}
function replaceNlsRecursive(obj,nls){
	traverse(obj, function(key, value, parent){
		if(typeof value == "string" && value.indexOf("{")>-1){
			this[key] = lang.replace(value,nls);
		}
	});
	return obj;
}

return declare("dlagua.w.layout._FormMixin", [], {
	store:null,
	stores:{},
	schema:null,
	schemata:{},
	schemaModel:"Class",
	refAttribute:"_ref",
	localStorage:true,
	persistentStorage:false,
	formBundle:"form",
	dojoModule:"",
	externalStore:false,
	postCreate:function(){
		this.inherited(arguments);
		if(this.store) this.externalStore = true;
	},
	loadFromItem:function(prop,oldValue,newValue){
		var items = this.getChildren();
		if(this.servicetype=="form" && items[0]) {
			items[0].cancel && items[0].cancel();
		}
		if(!this._allowLoad(oldValue,newValue)) return;
		this.inherited(arguments);
		if(this.servicetype=="form") {
			var item = lang.mixin({},this.currentItem);
			if(!item.service) item.service = (this.service || "/model/");
			if(!item.model) return;
			var model = item.model;
			var schemaModel = this.schemaModel;
			var target = item.service+model+"/";
			var schemaUri = item.service+schemaModel+"/"+model;
			// reset if triggered by currentItem
			if(arguments.length>0) {
				this.sort = this.filter = this.orifilter = "";
				this.filters = this.orifilters = null;
			}
			if(!this.newsort && item.sort) this.sort = item.sort;
			if(item.filter) this.orifilter = this.filter = item.filter;
			if(!this.stores[target]) {
				if(!this.externalStore) {
					this.store = new Observable(new FormData({
						local:item.localStorage,
						identifier: "id",
						persistent:item.persistentStorage,
						model:model,
						schemaModel:schemaModel,
						service:item.service
					}));
				} else {
					this.store.target = target;
					this.store.schemaUri = schemaUri;
				}
				this.stores[target] = this.store;//new Cache(this.store, new Memory());
			} else {
				this.store = this.stores[target];
			}
			this.rebuild(item);
		}
	},
	rebuild:function(item){
		this.inherited(arguments);
		if(this.servicetype=="form") {
			this._getSchema().then(lang.hitch(this,function(){
				var self = this;
				var listItem;
				var common = i18n.load("dforma","common");
				// TODO:
				// - assign schema url
				// - get domain nls
				// - provide global / persistent stores
				var schema = lang.clone(this.schema);
				var formbundle = this.dojoModule ? i18n.load(this.dojoModule,this.formBundle) : {};
				if(formbundle) schema = replaceNlsRecursive(schema,formbundle);
				var submit = schema.submit ? schema.submit : (formbundle.buttonSubmit ? formbundle.buttonSubmit : "");
				if(item.search) {
					var oldHash = hash();
					if(oldHash.indexOf("/?")>-1) {
						var ha = oldHash.split("/?");
						var q = new rqlQuery.Query(ha.pop());
						oldHash = ha.pop();
						self.query = q.toString();
						self.set("currentItem",lang.mixin(item,{
							type:"model",
							model:item.targetModel
						}));
						var _rh = aspect.after(self,"onReady",function(){
							_rh.remove();
							if(!this.total) {
								//alert("no results");
								hash(oldHash);
							}
						});
						return;
					}
				}
				listItem = new ScrollableFormPaneItem({
					itemHeight:"auto",
					store:this.store,
					label:schema.title,
					hint:schema.description,
					data:{
						controls:jsonschema.schemaToControls(schema),
						submit:submit ? {label: submit} : {}
					},
					submit: function(){
						if(!this.validate()) return;
						var data = this.get("value");
						for(var k in data) {
							// it may be a group
							// make all booleans explicit
							if(data[k] instanceof Array && schema.properties[k].type=="boolean") {
								if(!data[k].length) {
									data[k] = false;
								} else if(data[k].length<2) {
									data[k] = data[k][0];
								}
							}
						}
						domClass.toggle(this.buttonNode,"dijitHidden",true);
						this.set("message",formbundle.submitMessage);
						if(schema.links) {
							var localData = self.getLocalData(schema.links,true);
							data = lang.mixin(data,localData);
						}
						if(item.search) {
							if(!data.q) {
								domClass.toggle(this.buttonNode,"dijitHidden",false);
								this.set("message","Please enter your query");
								return;
							}
							var q = new rqlQuery.Query();
							array.forEach(item.search.split(","),function(_){
								var a = _.split(":");
								if(a.length==1) {
									q = q.search(_,data.q,data.r);
								} else if(data[a[0]]){
									q = q.search(a[1],data.q,data.r);
								}
							});
							if(q.args.length>1) q.name = "or";
							self.query = q.toString();
							var oldHash = hash();
							hash(oldHash+"/?"+self.query);
							self.set("currentItem",lang.mixin(item,{
								type:"model",
								model:item.targetModel
							}));
							var _rh = aspect.after(self,"onReady",function(){
								_rh.remove();
								if(!this.total) {
									alert("no results");
									hash(oldHash);
								}
							});
						} else if(item.action) {
							var action = item.action;
							if(action.charAt(0)=="#") {
								hash(action);
							} else {
								var method = item.method || "post";
								request(action,{
									handleAs:"json",
									method:method,
									headers:{
										"Content-Type":"application/json",
										"Accept":"application/json"
									}
								});
							}
						} else {
							if(!data.locale) data.locale = item.locale;
							this.store.put(data);
							listItem = item.preview ? self.itemnodesmap[-1] : self.itemnodesmap[0];
							if(item.preview) {
								self._removeItemById(0);
							}
							listItem.containerNode = listItem.domNode;
							listItem.data = data;
							listItem._load().then(function(){
								var form = {};
								for(var k in formbundle) {
									form[k] = formbundle[k];
								}
								self.replaceChildTemplate(listItem,"",form);
								listItem.layout();
							});
						}
					}
				});
				this.own(aspect.after(listItem,"layout",function(){
					setTimeout(function(){
						self._dim = self.getDim();
						self.slideTo({x:0,y:0}, 0.3, "ease-out");
						if(self.useScrollBar) {
							self.showScrollBar();
						}
					},100);
				},true));
				var data;
				if(schema.condition) {
					data = this.getLocalData(schema.condition.links || schema.links);
					var result = jsArray.executeQuery(schema.condition.query,{},[data]);
					// if there are no results for this query, display a message
					if(!result.length) {
						listItem.set("message",schema.condition.message);
						domClass.add(listItem.containerNode,"dijitHidden");
						domClass.add(listItem.hintNode,"dijitHidden");
						domClass.add(listItem.buttonNode,"dijitHidden");
					}
				}
				this.addChild(listItem);
				this.itemnodesmap[0] = listItem;
				fx.fadeIn({
					node:listItem.containerNode,
					onEnd:function(){
						self.onReady();
					}
				}).play();
				if(item.preview) {
					data = {};
					if(schema.links || schema.condition) {
						var localData = this.getLocalData(schema.condition && schema.condition.links || schema.links);
						if(schema.condition && schema.condition.query) localData = jsArray.executeQuery(schema.condition.query,{},[localData]);
						data = lang.mixin(data,localData);
					}
					var ScrollablePaneItem = declare([ScrollableServicedPaneItem,TemplaMixin]);
					listItem = new ScrollablePaneItem({
						parent:this,
						itemHeight:"auto",
						data:data
					});
					var _lh = aspect.after(listItem,"onLoad",function(){
						_lh.remove();
						// as this can take a while, listItem may be destroyed in the meantime
						if(self._beingDestroyed || this._beingDestroyed) return;
						// ref item may have been resolved now
						var item = this.data;
						self.template = self.getTemplate(self.templateDir,"preview");
						self._fetchTpl(self.template).then(lang.hitch(this,function(tpl){
							self.parseTemplate(tpl).then(lang.hitch(this,function(tplo){
								this.applyTemplate(tplo.tpl,tplo.partials);
								fx.fadeIn({node:listItem.containerNode}).play();
							}));
						}));
						self.itemnodesmap[-1] = listItem;
					});
					this.addChild(listItem);
				}
			}));
		}
	},
	getLocalData:function(links,clear){
		var data = {};
		if(links) {
			array.forEach(links,function(link){
				if(!data[link.rel]) data[link.rel] = [];
				var localStore = this.stores[link.href];
				if(localStore) {
					if(localStore.open) {
						console.log(localStore);
					}
					var localdata = localStore.query();
					clear && (localStore.clear && localStore.clear()) || 
						(localStore.engine && localStore.engine.clear && localStore.engine.clear());
					data[link.rel] = data[link.rel].concat(localdata);
				}
			},this);
		}
		return data;
	}
});

});