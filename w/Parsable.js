define([
	"require",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin"
],function(require,declare,lang,dom,_WidgetBase,_TemplatedMixin){
return declare("dlagua.w.Parsable",[_WidgetBase,_TemplatedMixin],{
	postscript:function(params,refNode){
		if(!params) return;
		var self = this;
		var args = arguments;
		if(params.type){
			var node, type, method;
			node = dom.byId(refNode);
			type = params.type;
			delete params.type;
			if(params.method) {
				method = params.method;
				delete params.method;
			} else if(type.indexOf("::")>-1) {
				var ar = type.split("::");
				type = ar[0];
				method = ar[1];
			} else {
				console.warn("dlagua.w.Parsable type is not implemented");
				return;
			}
			require([type],function(o){
				self.templateString = o[method](node.innerHTML,params);
				self.inherited(args);
			});
		}
	}
});

});