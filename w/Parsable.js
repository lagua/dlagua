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
		if(params.type && params.method){
			require(params.type);
			var o = lang.getObject(params.type);
			var node = dom.byId(refNode);
			this.templateString = o[params.method](node.innerHTML,params); 
		}
		this.inherited(arguments);
	}
});

});