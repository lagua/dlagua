define(["dojo/_base/declare","dojo/_base/lang","dojo/request", "dojo/store/JsonRest"], function(declare,lang,request,JsonRest) {
	return declare("dlagua.c.store.JsonRest", [JsonRest],{
		schemaUri:"",
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