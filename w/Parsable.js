dojo.provide("dlagua.w.Parsable");
dojo.require("dijit._WidgetBase");
dojo.require("dijit._Templated");
dojo.declare("dlagua.w.Parsable",[dijit._WidgetBase,dijit._Templated],{
	postscript:function(params,refNode){
		if(!params) params = {};
		if(params.type && params.method){
			var d = dojo;
			d.require(params.type);
			var o = d.getObject(params.type);
			var node = dojo.byId(refNode);
			this.templateString = o[params.method](node.innerHTML,params); 
		}
		this.inherited(arguments);
	}
});