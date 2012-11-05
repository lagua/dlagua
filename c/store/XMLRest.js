define(["dojo/_base/declare", "dojo/_base/lang", "dojo/request", "dojo/store/util/QueryResults", "dojo/io-query"], function(declare,lang,request,QueryResults, ioQuery) {

	return declare("dlagua/store/XMLRest", null, {
		constructor: function(options){
			// summary:
			//		This is a basic store for RESTful communicating with a server through JSON
			//		formatted data.
			// options:
			//		This provides any configuration information that will be mixed into the store
			declare.safeMixin(this, options);
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
			//	summary:
			//		Retrieves an object by its identity. This will trigger a GET request to the server using
			//		the url `this.target + id`.
			//	id: Number
			//		The identity to use to lookup the object
			//	returns: Object
			//		The object in the store that matches the given id.
			var headers = options || {};
			headers.Accept = "text/xml";
			var content = {};
			if(this._query) content = ioQuery.queryToObject(this._query);
			return request(this.target + id,{
				content:content,
				handleAs: "xml",
				failOk:true
			});
		},
		put: function(id, data, options){
			// summary:
			//		Stores an object. This will trigger a PUT request to the server
			//		if the object has an id, otherwise it will trigger a POST request.
			// object: Object
			//		The object to store.
			// options: dojo/store/api/Store/PutDirectives?
			//		Additional metadata for storing the data.  Includes an "id"
			//		property if a specific id is to be used.
			//	returns: Number
			options = options || {};
			return request.put(this.target + id,{
				data: data,
				handleAs: "xml",
				headers:{
					"Content-Type": "text/xml",
					"Accept" : "text/xml",
					"If-Match": options.overwrite === true ? "*" : null,
					"If-None-Match": options.overwrite === false ? "*" : null
				}
			});
		},
		move: function(oldId, newId, options){
			// summary:
			//		Stores an object. This will trigger a PUT request to the server
			//		if the object has an id, otherwise it will trigger a POST request.
			// object: Object
			//		The object to store.
			// options: dojo/store/api/Store/PutDirectives?
			//		Additional metadata for storing the data.  Includes an "id"
			//		property if a specific id is to be used.
			//	returns: Number
			options = options || {};
			return request.post(this.target + oldId, {
				data: "move:"+newId+".xml",
				handleAs: "text"
			});
		},
		add: function(id, data, options){
			// summary:
			//		Adds an object. This will trigger a PUT request to the server
			//		if the object has an id, otherwise it will trigger a POST request.
			// object: Object
			//		The object to store.
			// options: dojo/store/api/Store/PutDirectives?
			//		Additional metadata for storing the data.  Includes an "id"
			//		property if a specific id is to be used.
			options = options || {};
			options.overwrite = false;
			return this.put(id, data, options);
		},
		remove: function(id){
			// summary:
			//		Deletes an object by its identity. This will trigger a DELETE request to the server.
			// id: Number
			//		The identity to use to delete the object
			return request(this.target + id,{method:"delete"});
		},
		query: function(query, options){
			// summary:
			//		Queries the store for objects. This will trigger a GET request to the server, with the
			//		query added as a query string.
			// query: Object
			//		The query to use for retrieving objects from the store.
			// options: dojo/store/api/Store/QueryOptions?
			//		The optional arguments to apply to the resultset.
			//	returns: dojo/store/api/Store/QueryResults
			//		The results of the query, extended with iterative methods.
			var headers = {Accept: "text/xml"};
			options = options || {};

			if(options.start >= 0 || options.count >= 0){
				headers.Range = "items=" + (options.start || '0') + '-' +
					(("count" in options && options.count != Infinity) ?
						(options.count + (options.start || 0) - 1) : '');
			}
			if(lang.isObject(query)){
				query = ioQuery.objectToQuery(query);
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
			var results = request(this.target + (query || ""),{
				handleAs: "xml",
				headers: headers
			});
			results.total = results.then(function(){
				var range = results.ioArgs.xhr.getResponseHeader("Content-Range");
				return range && (range=range.match(/\/(.*)/)) && +range[1];
			});
			return QueryResults(results);
		}
	});

});