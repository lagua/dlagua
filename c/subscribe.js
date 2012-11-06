define([
"dojo/_base/lang",
"dojo/Stateful",
"dojo/topic",
"persvr/rql/parser",
"persvr/rql/js-array"], function(lang, Stateful, dtopic, rqlParser, rqlArray) {
var subscribe = lang.getObject("dlagua.c", true).subscribe;
subscribe = function(/*String*/ topic, context, params){
	if(!params) params = {};
	var filter=(params.filter ? rqlParser.parseQuery(params.filter) : null);
	var refProperty = params.refProperty;
	var subscrmethd = function(item,olditem) {
		if(filter) {
			var ar = [item];
			var res = rqlArray.executeQuery(filter,{},ar);
			if(!res.length) {
				console.log("filtered:",params.filter,item);
				return;
			} else {
				console.log("passed:",params.filter,item);
			}
		}
		if(lang.isObject(item)) {
			if(lang.isObject(olditem)) {
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
	return dtopic.subscribe(topic, lang.hitch(context, subscrmethd));
};	

return subscribe;

});