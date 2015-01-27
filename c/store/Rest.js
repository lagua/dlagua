define(["dojo/_base/declare","dojo/_base/lang","dojo/request", "dstore/Rest"], function(declare,lang,request,Rest) {
	return declare("dlagua.c.store.Rest", [Rest],{
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