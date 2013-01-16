define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Stateful",
	"dojo/topic",
	"persvr/rql/parser",
	"persvr/rql/js-array",
	"dijit/Destroyable"], function(declare, lang, Stateful, topic, rqlParser, rqlArray, Destroyable) {

return declare("dlagua.c.Subscribable", [Stateful], {
	subscribe: function(t, params){
		if(!params) params = {};
		var filter=(params.filter ? rqlParser.parseQuery(params.filter) : null);
		var refProperty = params.refProperty;
		var method = function(item,olditem) {
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
		return this.own(subscribe(t, lang.hitch(this, method)))[0];	// handle
	},
	unsubscribe: function(/*Object*/ handle){
		handle.remove();
	}
});

});