define(["dojo/_base/declare","dojo/_base/lang","dojo/_base/xhr","dojo/_base/Deferred", "dojo/store/JsonRest"], function(declare,lang,xhr,Deferred,JsonRest) {
	return declare("dlagua/c/store/JsonRest", [JsonRest],{
		schemaUri:"",
		hrProperty:"",
		idProperty:"id",
		getSchema:function(schemaUri,options){
			var d = new Deferred();
			if(!schemaUri) schemaUri = this.schemaUri;
			if(schemaUri){
				xhr("GET",{
					url:schemaUri,
					handleAs:"json",
					headers:{
						accept:"application/json"
					},
					load:dojo.hitch(this,function(schema){
						this.schema = schema;
						for(var k in schema.properties) {
		    				if(schema.properties[k].primary) this.idProperty = k;
		    				if(schema.properties[k].hrkey) this.hrProperty = k;
		    			}
						d.callback(schema);
					}),
					error:function(){
						d.callback(false);
					}
	    		});
			} else {
				d.callback(false);
			}
			return d;
		}
	});

});