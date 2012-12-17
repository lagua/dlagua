define("dlagua/c/store/XMLRest", ["dojo", "dojo/store/util/QueryResults"], function(dojo) {

	dojo.declare("dlagua.c.store.XMLRest", null, {
		constructor: function(/*dojo.store.JsonRest*/ options){
			// summary:
			//		This is a basic store for RESTful communicating with a server through JSON
			//		formatted data.
			// options:
			//		This provides any configuration information that will be mixed into the store
			dojo.mixin(this, options);
		},
		_query:"",
		// target: String
		//		The target base URL to use for all requests to the server. This string will be
		// 	prepended to the id to generate the URL (relative or absolute) for requests
		// 	sent to the server
		target: "",
		// idProperty: String
		//		Indicates the property to use as the identity property. The values of this
		//		property should be unique.
		idProperty: "id",
		getIdentity: function(object){
			// summary:
			//		Returns an object's identity
			// object: Object
			//		The object to get the identity from
			//	returns: Number
			return object[this.idProperty];
		},
		get: function(id, options){
			var headers = options || {};
			headers.Accept = "text/xml";
			var content = {};
			if(this._query) content = dojo.queryToObject(this._query);
			return dojo.xhrGet({
				url:this.target + id,
				headers:headers,
				content:content,
				handleAs: "xml",
				failOk:true
			});
		},
		put: function(id, data, options){
			options = options || {};
			return dojo.xhr("PUT", {
				url: this.target + id,
				postData: data,
				handleAs: "xml",
				headers:{
					"Content-Type": "text/xml",
					"Accept" : "text/xml",
					"If-Match": options.overwrite === true ? "*" : null,
					"If-None-Match": options.overwrite === false ? "*" : null
				}
			});
		},
		post: function(id, data, options){
			options = options || {};
			var headers = {
				accept:"application/xml",
				"content-type":"application/xml"
			};
			return dojo.xhr("POST", {
				url: this.target + id,
				headers:headers,
				postData: data,
				handleAs: "xml"
			});
		},
		add: function(id, data, options){
			options = options || {};
			options.overwrite = false;
			return this.put(id, data, options);
		},
		remove: function(id){
			// summary:
			//		Deletes an object by its identity. This will trigger a DELETE request to the server.
			// id: Number
			//		The identity to use to delete the object
			return dojo.xhrDelete({
				url:this.target + id
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
			var headers = {Accept: "text/xml"};
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
			var results = dojo.xhrGet({
				url: this.target + (query || ""),
				handleAs: "xml",
				headers: headers
			});
			results.total = results.then(function(){
				var range = results.ioArgs.xhr.getResponseHeader("Content-Range");
				return range && (range=range.match(/\/(.*)/)) && +range[1];
			});
			return dojo.store.util.QueryResults(results);
		}
	});


	return dlagua.c.store.XMLRest;
});