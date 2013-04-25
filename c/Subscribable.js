define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Stateful",
	"dojo/topic",
	"rql/parser",
	"rql/js-array",
	"dijit/Destroyable"
], function(declare, lang, Stateful, topic, rqlParser, rqlArray, Destroyable) {

return declare("dlagua.c.Subscribable", [Stateful,Destroyable], {
	destroyRecursive:function(){
		this.destroy();
	},
	subscribe: function(t, params){
		if(!params) params = {};
		var method;
		if(typeof params == "function") {
			method = params;
		} else {
			var filter=(params.filter ? rqlParser.parseQuery(params.filter) : null);
			var refProperty = params.refProperty;
			method = function(item,olditem) {
				if(filter) {
					var ar = [item];
					var res = rqlArray.executeQuery(filter,{},ar);
					if(!res.length) {
						console.log(params.id,"filtered:",this.id,params.filter,item);
						return;
					} else {
						console.log(params.id,"passed:",this.id,params.filter,item);
					}
				} else {
					console.log(params.id,"passed:",this.id,item);
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
		}
		return this.own(topic.subscribe(t, lang.hitch(this, method)))[0];	// handle
	},
	unsubscribe: function(/*Object*/ handle){
		handle.remove();
	}
});

});