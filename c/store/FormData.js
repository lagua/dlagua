define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/store/Observable",
	"./JsonRest", 
	"./LocalStore"], function(declare,lang,Observable,JsonRest,LocalStore) {
	
	return declare("dlagua.c.store.FormData",null,{
		idProperty: "id",
		model:"",
		schemaModel:"Class",
		service:"model/",
		local:false,
		persistent:false,
		constructor: function(options) {
			this.headers = {};
			declare.safeMixin(this, options);
			var model = this.model;
			var schemaModel = this.schemaModel;
			var target = this.service+model+"/";
			var schemaUri = this.service+schemaModel+"/"+model;
			var store;
			if(this.local) {
				store = new Observable(new LocalStore({
					idProperty: this.idProperty,
					persistent:this.persistent,
					target:target,
					schemaUri:schemaUri
				}));
			} else {
				store = new Observable(new JsonRest({
					idProperty: this.idProperty,
					target:target,
					schemaUri:schemaUri
				}));
			}
			declare.safeMixin(this,store);
		}
	});
	
});