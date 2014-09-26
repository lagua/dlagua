define([
	"dojo/_base/lang",
	"dojo/io-query",
	"rql/js-array",
	"rql/query"
], function (lang,ioQuery, arrayEngine,rqlQuery) {
	return function(query, options){
		switch(typeof query){
			default:
				throw new Error("Can not query with a " + typeof query);
			case "object":
				if(!(query instanceof rqlQuery.Query)) {
					var qs = ioQuery.objectToQuery(query);
					query = new rqlQuery.Query(qs);
				}
				break;
			case "string":
				query = query.charAt(0)=="?" ? query.substr(1) : query;
				// fall through
		}
		function execute(array){
			// execute the whole query, first we filter
			var results = arrayEngine.query(query,{},array);
			// next we sort
			var parent = options && options.parent;
			results.sort(function(a,b){
				return parent.childorder.indexOf(a.id) - parent.childorder.indexOf(b.id);
			});
			// now we paginate
			if(options && (options.start || options.count)){
				var total = results.length;
				results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
				results.total = total;
			}
			return results;
		}
		//execute.matches = query;
		return execute;
	};
});