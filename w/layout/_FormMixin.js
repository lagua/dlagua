define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/request",
	"dojo/aspect",
	"dojo/hash",
	"dojo/Deferred",
	"dlagua/c/store/JsonRest",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dlagua/w/layout/TemplaMixin",
	"dforma/Builder",
	"dforma/jsonschema",
	"dojox/mobile/i18n",
	"dlagua/c/store/LocalStore",
	"dojo/store/Memory",
	"dojo/store/Observable",
	"dojo/store/Cache"
],function(declare,lang,array,fx,request,aspect,hash,Deferred,JsonRest,ScrollableServicedPaneItem,TemplaMixin,Builder,jsonschema,i18n,LocalStore,Memory,Observable,Cache) {

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
};
function replaceNlsRecursive(obj,nls){
	traverse(obj, function(key, value, parent){
		if(typeof value == "string" && value.indexOf("{")>-1){
			this[key] = lang.replace(value,nls);
		}
	});
	return obj;
};
	
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
	loadFromItem:function(){
		this.inherited(arguments);
		if(this.servicetype=="form") {
			var item = lang.mixin({},this.currentItem);
			if(!item.service) item.service = (this.service || "/persvr/");
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
					if(item.localStorage) {
						this.store = new Observable(new LocalStore({
							identifier: "id",
							persistent:this.persistentStorage,
							target:target,
							schemaUri:schemaUri
						}));
					} else {
						this.store = new Observable(new JsonRest({
							target:target,
							schemaUri:schemaUri
						}));
					}
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
			console.log("schemauri",this.store.schemaUri)
			this._getSchema().then(lang.hitch(this,function(){
				var self = this;
				var common = i18n.load("dforma","common");
				// TODO:
				// - assign schema url
				// - get domain nls
				// - provide global / persistent stores
				var schema = lang.clone(this.schema);
				var formbundle = i18n.load(this.dojoModule,this.formBundle);
				if(formbundle) schema = replaceNlsRecursive(schema,formbundle);
				var listItem = new ScrollableFormPaneItem({
					itemHeight:"auto",
					store:this.store,
					label:schema.title,
					hint:schema.description,
					data:{
						controls:jsonschema.schemaToControls(schema)
					},
					submit: function(){
						if(!this.validate()) return;
						var data = this.get("value");
						if(schema.links) {
							array.forEach(schema.links,function(link){
								if(!data[link.rel]) data[link.rel] = [];
								var localStore = self.stores[link.href];
								if(localStore) {
									var localdata = localStore.query();
									data[link.rel] = data[link.rel].concat(localdata);
								}
							});
						}
						if(item.action) {
							if(item.action.charAt(0)=="#") {
								hash(item.action);
							} else {
								var method = item.method || "post";
								request[method](item.action,{
									handleAs:"json",
									headers:{
										"Content-Type":"application/json",
										"Accept":"application/json"
									}
								});
							}
						} else {
							this.store.put(data);
							listItem.containerNode = listItem.domNode;
							listItem.mixeddata = data;
							self.replaceChildTemplate(listItem);
							listItem.layout();
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
				this.listitems.push(listItem);
				this.addChild(listItem);
				this.itemnodesmap[0] = listItem;
				fx.fadeIn({
					node:listItem.containerNode,
					onEnd:function(){
						self.onReady();
					}
				}).play();
			}));
		}
	}
});

});