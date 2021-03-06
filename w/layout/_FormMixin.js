define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/request",
	"dojo/aspect",
	"dojo/hash",
	"dojo/Deferred",
	"dojo/promise/all",
	"dojo/dom-class",
	"dojo/json",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dlagua/w/layout/TemplaMixin",
	"dlagua/w/form/Builder",
	"dojo/text!dlagua/w/form/resources/controlmap.json",
	"dforma/jsonschema",
	"rql/query",
	"rql/js-array",
	"dojox/mobile/i18n",
	"dforma/store/FormData",
	"dforma/util/model"
],function(declare,lang,array,fx,request,aspect,hash,Deferred,all,domClass,JSON,
		ScrollableServicedPaneItem,TemplaMixin,Builder,controlmapjson,
		jsonschema,rqlQuery,jsArray,i18n,FormData,modelUtil) {

var controlmap = JSON.parse(controlmapjson);

var ScrollableFormPaneItem = declare("dlagua.w.layout.ScrollableFormPaneItem",[ScrollableServicedPaneItem,TemplaMixin,Builder],{
});

function traverse(obj,func, parent) {
	for(var i in obj){
		func.apply(obj,[i,obj[i],parent]);
		if (obj[i] instanceof Object && !(obj[i] instanceof Array)) {
			traverse(obj[i],func, i);
		} else if(obj[i] instanceof Array) {
			obj[i].forEach(function(o){
				traverse(o,func, i);
			});
		}
	}
}
function replaceNlsRecursive(obj,nls){
	traverse(obj, function(key, value, parent){
		// prevent links!
		if(parent!="links" && typeof value == "string" && value.indexOf("{")>-1){
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
	refAttribute:"$ref",
	localStorage:true,
	persistentStorage:false,
	formBundle:"form",
	dojoModule:"",
	externalStore:false,
	postCreate:function(){
		this.inherited(arguments);
		if(this.store) this.externalStore = true;
	},
	destroyRecursive:function(){
		if(this.servicetype=="form") {
			var items = this.getChildren();
			if(items[0]) items[0].cancel && items[0].cancel();
		}
		this.inherited(arguments);
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
			if(!item.service) item.service = (this.service || "model/");
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
					this.store = new FormData({
						local:item.localStorage,
						identifier: "id",
						persistent:item.persistentStorage,
						model:model,
						schemaModel:schemaModel,
						refProperty:this.refAttribute,
						service:item.service
					});
				} else {
					this.store.target = target;
					this.store.schemaUri = schemaUri;
				}
				this.stores[target] = this.store;//new Cache(this.store, new Memory());
			} else {
				this.store = this.stores[target];
			}
			if(item.autoSelect && !this.store.query().length) {
				//var obj = this.store[this.store.putSync ? "putSync" : "put"]({});
				/*this.store.add({}).then(lang.hitch(this,function(obj){
					// set the new id on the store so
					// it can be retrieved as linked
					this.store.selectedId = obj.id;
					this.rebuild(item);
				}));*/
				//this.store.selectedId = lang.isObject(obj) ? obj.id : obj;
				//this.store.newdata = true;
				this.rebuild(item);
			} else {
				this.rebuild(item);
			}
		}
	},
	rebuild:function(item){
		this.inherited(arguments);
		if(this.servicetype=="form") {
			// reset schema
			delete this.store.schema;
			this.store.getSchema().then(lang.hitch(this,function(schema){
				var self = this;
				var common = i18n.load("dforma","common");
				// TODO:
				// - assign schema url
				// - get domain nls
				// - provide global / persistent stores
				// FIXME: why clone?
				schema = lang.clone(schema);
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
						var _rh = aspect.after(self,"ready",function(){
							_rh.remove();
							if(!this.total) {
								if(this.query) alert("no results");
								this.query = "";
								hash(oldHash);
							}
						});
						return;
					}
				}
				var locale = this.currentItem.locale ? this.currentItem.locale : this.locale;
				var path = this.currentItem.path;
				var templatePath = this.templatePath + (this.localizedTemplate ? locale + "/" : "") + path;
				// always get linked data
				this.getLinkedData(schema).then(lang.hitch(this,function(data){
					console.warn(data,schema.condition ? schema.condition.query : null)
					var result = schema.condition && schema.condition.query ? jsArray.executeQuery(schema.condition.query,{},[data]) : [true];
					var controls = jsonschema.schemaToControls(schema,data,{
						controlmap:controlmap,
						uri:this.store.target,
						stores:this.stores
					});
					if(item.bindStore){
						this.store.bound = true;
						var p = schema.properties[item.bindStore];
						if(p && p.items) {
							this.store.schema = p.items;
						}
						controls.forEach(function(control){
							if(control.name==item.bindStore){
								control.store = this.store;
								control.autoSave = item.autoSave;
							}
						},this);
					}
					var listItem = new ScrollableFormPaneItem({
						itemHeight:"auto",
						value:data,
						label:schema.title,
						hint:schema.description,
						configProperty:"config",
						config:{
							controls:controls,
							submit:submit ? {label: submit} : {}
						},
						schema:schema,
						templatePath:templatePath,
						controlmap:controlmap,
						BuilderClass:Builder,
						submit: function(){
							if(!this.validate()) return;
							var data = this.get("value");
							console.warn("forma",data);
							for(var k in data) {
								// it may be a group
								// make all booleans explicit
								if(data[k] instanceof Array && schema.properties[k].type=="boolean") {
									if(data[k].length===0) {
										data[k] = false;
									} else if(data[k].length<2) {
										data[k] = data[k][0];
									}
								}
							}
							domClass.toggle(this.buttonNode,"dijitHidden",true);
							this.set("message",formbundle.submitMessage);
							var d = new Deferred();
							if(schema.links) {
								self.getLinkedData(schema,true).then(function(localData){
									data = lang.mixin(data,localData);
									d.resolve(data);
								});
							} else {
								d.resolve(data);
							}
							d.then(lang.hitch(this,function(data){
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
									var _rh = aspect.after(self,"ready",function(){
										_rh.remove();
										if(!this.total) {
											if(this.query) alert("no results");
											this.query = "";
											hash(oldHash);
										}
									});
								} else if(item.action) {
									if(!data.locale) data.locale = item.locale;
									if(!item.bindStore && !item.autoSave) self.store.put(data,{noop:true});
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
									self.store.put(data,{noop:true}).then(lang.hitch(this,function(res){
										if(item.preview) {
											//this._removeItemById(0);
										}
										this.mixeddata = this.data = data;
										//listItem.containerNode = listItem.domNode;
										var form = {};
										for(var k in formbundle) {
											form[k] = formbundle[k];
										}
										this.parent.replaceChildTemplate(this,"",form);
										this.resize();
									}));
								}
							}));
						}
					});
					if(!result.length) {
						listItem.own(
							aspect.after(listItem,"startup",lang.hitch(listItem,function(){
								this.set("message",schema.condition.message);
								domClass.add(this.containerNode,"dijitHidden");
								domClass.add(this.hintNode,"dijitHidden");
								domClass.add(this.buttonNode,"dijitHidden");
							}))
						);
					}
					if(!self.nativeScroll){
						this.own(aspect.after(listItem,"layout",function(){
							setTimeout(function(){
								if(self._beingDestroyed || self.nativeScroll) return;
								self._dim = self.getDim();
								self.slideTo({x:0,y:0}, 0.3, "ease-out");
								if(self.useScrollBar) {
									self.showScrollBar();
								}
							},100);
						},true));
					}
					listItem.own(
						aspect.after(listItem,"rebuild",lang.hitch(listItem,function(d){
							console.warn("listItem rebuild",d)
						}),true)
					);
					this.itemnodesmap[0] = listItem;
					this.addChild(listItem);
					fx.fadeIn({
						node:listItem.containerNode,
						onEnd:lang.hitch(this,"ready")
					}).play();
					// if there are no results for this query, display a message
					if(item.preview) {
						var ScrollablePaneItem = declare([ScrollableServicedPaneItem,TemplaMixin]);
						var listItem1 = new ScrollablePaneItem({
							parent:this,
							itemHeight:"auto",
							data:data
						});
						listItem1.own(
							aspect.after(listItem1,"startup",lang.hitch(this,function(){
								// as this can take a while, listItem may be destroyed in the meantime
								if(self._beingDestroyed || listItem1._beingDestroyed) return;
								// ref item may have been resolved now
								//var item = this.data;
								this.template = this.getTemplate(this.templateDir,"preview");
								this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
									this.parseTemplate(tpl).then(function(tplo){
										listItem1.applyTemplate(tplo.tpl,tplo.partials);
										fx.fadeIn({node:listItem1.containerNode}).play();
									});
								}));
							}))
						);
						this.addChild(listItem1);
						this.itemnodesmap[-1] = listItem1;
					}
				}));
			}));
		}
	},
	getLinkedData:function(schema,clear){
		var dd = new Deferred();
		var links = schema.condition && schema.condition.links ? schema.condition.links : schema.links ? schema.links : {};
		// assume in id has been set on the store by the previous form
		// we set it there because its the only thing that's persisted
		// but for persistent data it should even go to a more 'global' scope
		// UPDATE:
		// selectedId deprecated because of bindStore: 
		// any autoSelect property will be passed to a controlling array widget
		// TODO: if there's no bindStore, autoSelect may still set selectedId
		var req = this.store.selectedId ? this.store.get(this.store.selectedId) : new Deferred().resolve({});
		var stores = this.stores;
		req.then(function(data){
			all(array.map(links,function(link){
				var d = new Deferred();
				var store = stores[link.href];
				if(store){
					if(clear && store.clear) store.clear();
					if(store.selectedId) {
						store.get(store.selectedId).then(function(res){
							data[link.rel] = res[link.rel];
							d.resolve(data);
						});
						if(clear) delete store.selectedId;
					} else if(store.bound || schema.properties.hasOwnProperty(link.rel)) {
						store.fetch().then(function(res){
							data[link.rel] = res;
							d.resolve(data);
						});
						if(clear) store.setData([]);
					} else {
						d.resolve(data);
					}
				} else {
					d.resolve(data);
				}
				return d;
			})).then(function(){
				dd.resolve(data);
			});
		});
		return dd;
	}
});

});