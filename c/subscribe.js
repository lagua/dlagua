dojo.provide("dlagua.c.subscribe");

dlagua.c.subscribe = function(/*String*/ topic, context, params){
	if(!params) params = {};
	var filter=(params.filter && persvr.rql && persvr.rql.Parser && persvr.rql.Array ? persvr.rql.Parser.parseQuery(params.filter) : null);
	var refProperty = params.refProperty;
	var subscrmethd = function(item,olditem) {
		if(filter) {
			var ar = [item];
			var res = persvr.rql.Array.executeQuery(filter,{},ar);
			if(!res.length) {
				console.log("filtered:",params.filter,item);
				return;
			} else {
				console.log("passed:",params.filter,item);
			}
		}
		if(dojo.isObject(item)) {
			if(dojo.isObject(olditem)) {
				refProperty = (refProperty || "changeSet");
				this.set(refProperty,[item,olditem]);
			} else {
				refProperty = (refProperty || "currentItem");
				this.set(refProperty,item);
			}
		} else {
			refProperty = (refProperty || "currentId");
			this.set(refProperty,item);
		}
	};
	return dojo.subscribe(topic, context, subscrmethd);
};	
