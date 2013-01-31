define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin"
],function(declare,lang,dom,_WidgetBase,_TemplatedMixin){
return declare("dlagua.w.Parsable",[_WidgetBase,_TemplatedMixin],{
	postscript:function(params,refNode){
		if(!params) params = {};
		var self = this;
		var args = arguments;
		if(params.type && params.method){
			var node = dom.byId(refNode);
			require([params.type],function(o){
				//var p = params.type.replace(/\//g,"\.");
				//var o = lang.getObject(p);
				self.templateString = o[params.method](node.innerHTML,params);
				self.inherited(args);
			});
		}
	}
});

});