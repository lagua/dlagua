define([
	"dojo/_base/declare","dojo/_base/lang",
	"dojo/request",
	"dojo/store/Memory"
], function(declare,lang,request,Memory) {
	return declare("dlagua.c.store.LocalStore", [Memory],{
		schemaUri:"",
		persistent:false,
		hrProperty:"",
		idProperty:"id",
		getSchema:function(schemaUri,options){
			if(!schemaUri) schemaUri = this.schemaUri;
			return request(schemaUri,{
				handleAs:"json",
				headers:{
					accept:"application/json"
				}
    		});
		}
	});

});