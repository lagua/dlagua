define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/Deferred",
	"dlagua/c/store/JsonRest",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dforma/Builder",
	"dforma/jsonschema",
	"dojox/mobile/i18n",
	"dojo/store/Memory",
	"dojo/store/Cache"
],function(declare,lang,array,fx,Deferred,JsonRest,ScrollableServicedPaneItem,Builder,jsonschema,i18n,Memory,Cache) {

var ScrollableFormPaneItem = declare("dlagua.w.layout.ScrollableFormPaneItem",[ScrollableServicedPaneItem,Builder],{
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
		if(this.servicetype=="form") {
			this._getSchema().then(lang.hitch(this,function(schema){
				var self = this;
				var common = i18n.load("dforma","common");
				// TODO:
				// - assign schema url
				// - get domain nls
				// - provide global / persistent stores
				var formbundle = i18n.load(this.domain,this.formbundle);
				if(formbundle) schema = replaceNlsRecursive(schema,formbundle);
				var listItem = new ScrollableFormPaneItem({
					itemHeight:"auto",
					store:Observable(new Memory({
						identifier: "id"
					})),
					data:{
						controls:jsonschema.schemaToControls(schema)
					},
					submit: function(){
						if(!this.validate()) return;
						var data = this.store.query();
						console.log(data)
					}					
				});
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