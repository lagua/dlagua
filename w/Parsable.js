define([
	"require",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom",
	"dijit/registry",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin"
],function(require,declare,lang,dom,registry,_WidgetBase,_TemplatedMixin){
return declare("dlagua.w.Parsable",[_WidgetBase,_TemplatedMixin],{
	postscript:function(params,refNode){
		if(!params) return;
		var self = this;
		var args = arguments;
		params._parsable = this;
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
				if(params.ref) {
					if(typeof params.ref == "string") params.ref = registry.byId(params.ref);
				} else {
					params.ref = registry.getEnclosingWidget(refNode);
				}
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