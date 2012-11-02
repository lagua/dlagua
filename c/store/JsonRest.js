define("dlagua/c/store/JsonRest", ["dojo", "dojo.io.script", "dojo.store.JsonRest"], function(dojo) {
	dojo.declare("dlagua.c.store.JsonRest",[dojo.store.JsonRest],{
		schemaUri:"",
		hrProperty:"",
		idProperty:"id",
		getSchema:function(schemaUri,options){
			options = options || {};
			var d = new dojo.Deferred();
			if(!schemaUri) schemaUri = this.schemaUri;
			if(schemaUri){
				var xhr = {
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
	    		};
				if(options.useXDomain) {
					xhr.callbackParamName = "callback";
					dojo.io.script.get(xhr);
				} else {
					dojo.xhrGet(xhr);
				}
			} else {
				d.callback(false);
			}
			return d;
		},
		get: function(id, options){
			//	summary:
			//		Retrieves an object by its identity. This will trigger a GET request to the server using
			//		the url `this.target + id`.
			//	id: Number
			//		The identity to use to lookup the object
			//	returns: Object
			//		The object in the store that matches the given id.
			var headers = options || {};
			headers.Accept = "application/json";
			return dojo.xhrGet({
				url:this.target + id,
				handleAs: "json",
				failOk:true,
				headers: headers
			});
		},
		put: function(object, options){
			// summary:
			//		Stores an object. This will trigger a PUT request to the server
			//		if the object has an id, otherwise it will trigger a POST request.
			// object: Object
			//		The object to store.
			// options: dojo.store.api.Store.PutDirectives?
			//		Additional metadata for storing the data.  Includes an "id"
			//		property if a specific id is to be used.
			//	returns: Number
			options = options || {};
			var id = ("id" in options) ? options.id : this.getIdentity(object);
			var hasId = typeof id != "undefined";
			return dojo.xhr(hasId && !options.incremental ? "PUT" : "POST", {
				url: hasId ? this.target + id : this.target,
				postData: dojo.toJson(object),
				handleAs: "json",
				headers:{
					"Content-Type": "application/json",
					"Accept" : "application/json",
					"If-Match": options.overwrite === true ? "*" : null,
					"If-None-Match": options.overwrite === false ? "*" : null
				}
			});
		},
		query: function(query, options){
			// summary:
			//		Queries the store for objects. This will trigger a GET request to the server, with the
			//		query added as a query string.
			// query: Object
			//		The query to use for retrieving objects from the store.
			// options: dojo.store.api.Store.QueryOptions?
			//		The optional arguments to apply to the resultset.
			//	returns: dojo.store.api.Store.QueryResults
			//		The results of the query, extended with iterative methods.
			var headers = {Accept: "application/json"};
			options = options || {};
			
			if(options.start >= 0 || options.count >= 0){
				headers.Range = "items=" + (options.start || '0') + '-' +
					(("count" in options && options.count != Infinity) ?
						(options.count + (options.start || 0) - 1) : '');
			}
			if(dojo.isObject(query)){
				query = dojo.objectToQuery(query);
				query = query ? "?" + query: "";
			}
			if(options && options.sort){
				query += (query ? "&" : "?") + "sort(";
				for(var i = 0; i<options.sort.length; i++){
					var sort = options.sort[i];
					query += (i > 0 ? "," : "") + (sort.descending ? '-' : '+') + encodeURIComponent(sort.attribute);
				}
				query += ")";
			}
			
			var results;
			if(options.useXDomain){
				if(options.start >= 0 || options.count >= 0){
					query += (query ? "&" : "?") + "limit("+options.count+","+options.start+")";
				}
				results = dojo.io.script.get({
					url:this.target + (query || ""),
					callbackParamName:"callback",
					headers:headers
				});
			} else {
				results = dojo.xhrGet({
					url: this.target + (query || ""),
					handleAs: "json",
					headers: headers
				});
			}
			results.total = results.then(function(){
				if(options.useXDomain) return;
				var range = results.ioArgs.xhr.getResponseHeader("Content-Range");
				return range && (range=range.match(/\/(.*)/)) && +range[1];
			});
			return dojo.store.util.QueryResults(results);
		}
	});

	return dlagua.c.store.JsonRest;
});