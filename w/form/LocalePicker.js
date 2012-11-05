dojo.provide("dlagua.w.form.LocalePicker");

dojo.require("dijit.form.FilteringSelect");
dojo.require("dforma.Label");
dojo.require("dojo.data.ObjectStore");
dojo.require("dlagua.c.store.JsonRest");
dojo.require("dlagua.c.Subscribable");

dojo.declare("dlagua.w.form.LocalePicker", [dlagua.c.Subscribable, dijit.form.FilteringSelect], {
	locale:"",
	locale_extra:"",
	store:null,
	searchAttr:"local",
	labelAttr:"local",
	style:"width:80px",
	currentId:"",
	autoComplete:true,
	ignoreCase:true,
	required:true,
	onChange:function(val){
		if(!val) return;
		dojo.publish("/components/"+this.id,[val]);
	},
	startup:function(){
		this.inherited(arguments);
	},
	constructor: function(args) {
		var locstr = args.locale;
		if(args.locale_extra) {
			locstr+=","+args.locale_extra;
		}
		var locales = locstr.split(",");
		this.store = new dojo.data.ObjectStore({
			identifier:"id",
			labelProperty:"local",
			fetch: function(args){
				// summary:
				//		See dojo.data.api.Read.fetch
				//
				
				args = args || {};
				var self = this;
				var scope = args.scope || self;
				var query = args.query;
				if(typeof query == "object"){ // can be null, but that is ignore by for-in
					query = dojo.delegate(query); // don't modify the original
					if(persvr.rql) {
						var qo = persvr.rql.Parser.parseQuery(dojo.objectToQuery(query));
						for(var i in qo){
							if(typeof required == "string"){
								qo[i] = RegExp("^" + dojo.regexp.escapeString(required, "*?").replace(/\*/g, '.*').replace(/\?/g, '.') + "$", args.queryOptions && args.queryOptions.ignoreCase ? "mi" : "m");
								query[i].toString = (function(original){
									return function(){
										return original;
									}
								})(required);
							}
						}
						qo = qo["in"]("id",locales);
						query = "?"+qo.toString();
					} else {
						for(var i in query){
							// find any strings and convert them to regular expressions for wildcard support
							var required = query[i];
							if(typeof required == "string"){
								query[i] = RegExp("^" + dojo.regexp.escapeString(required, "*?").replace(/\*/g, '.*').replace(/\?/g, '.') + "$", args.queryOptions && args.queryOptions.ignoreCase ? "mi" : "m");
								query[i].toString = (function(original){
									return function(){
										return original;
									}
								})(required);
							}
						}
					}
				}
				
				var results = this.objectStore.query(query, args);
				dojo.when(results.total, function(totalCount){
					dojo.when(results, function(results){
						if(args.onBegin){
							args.onBegin.call(scope, totalCount || results.length, args);
						}
						if(args.onItem){
							for(var i=0; i<results.length;i++){
								args.onItem.call(scope, results[i], args);
							}
						}
						if(args.onComplete){
							args.onComplete.call(scope, args.onItem ? null : results, args);
						}
						return results;
					}, errorHandler);
				}, errorHandler);
				function errorHandler(error){
					if(args.onError){
						args.onError.call(scope, error, args);
					}
				}
				args.abort = function(){
					// abort the request
					if(results.cancel){
						results.cancel();
					}
				};
				args.store = this;
				return args;
			},
			objectStore:new dlagua.c.store.JsonRest({
				idProperty:"id",
				target:"/persvr/Nls/"
			})
		});
		args.value = args.locale;
		this.addWatch("currentId",function(){
			console.log(this.currentId)
		})
	}
});