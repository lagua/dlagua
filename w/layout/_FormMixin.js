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
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dojox/json/ref"
],function(declare,lang,array,fx,Deferred,JsonRest,ScrollableServicedPaneItem,Builder,jsonschema,Memory,Cache,jsonref) {

var ScrollableFormPaneItem = declare("dlagua.w.layout.ScrollableFormPaneItem",[ScrollableServicedPaneItem,Builder],{
}) ;
	
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
			this._getSchema().then(lang.hitch(this,function(){
				var self = this;
				var listItem = new ScrollableFormPaneItem({
					itemHeight:"auto",
					store:new Memory(),
					hideOptional:false,
					allowOptionalDeletion:false,
					allowFreeKey:false,
					cancel: function(){
						myDialog.hide();
					},
					submit: function(){
						if(!this.validate()) return;
						var data = this.get("value");
						var schema = this.get("controllerWidget").item.schema;
						for(var k in data) {
							if(!schema.properties[k]) continue;
							// it may be a group
							// make all booleans explicit
							if(schema.properties[k].type=="boolean") {
								if(dojo.isArray(data[k])) {
									if(data[k].length==0) {
										data[k] = false;
									} else if(data[k].length<2) {
										data[k] = data[k][0];
									}
								}
							} else {
								if(schema.properties[k].type=="integer") data[k] = parseInt(data[k],10);
								if(schema.properties[k].type=="float") data[k] = parseFloat(data[k],10);
								if(!data[k]) delete data[k];
							}
						}
						//var valid = jsonschema.validate(data,schema);
						//console.log(valid)
						// submit data
						this.store.put(data);
						domConstruct.create("div",{
							innerHTML:JSON.stringify(data,2)
						},"data");
					}
				});
				var control = listItem.toControl("id",[this.schema],null,{
					controllerType:"group",
					selectFirst:true
				});
				listItem.rebuild({
					controls:[control],
				  	submit:{
				  		label:"Add"
				  	}
				})
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