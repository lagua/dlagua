define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dijit/layout/LayoutContainer",
	"dlagua/c/App",
	"dlagua/w/Subscribable"
],function(declare,lang,array,on,LayoutContainer,App,Subscribable){

return declare("dlagua.w.App", [LayoutContainer,App,Subscribable], {
	startup: function(){
		this.own(
			on(window,"onresize",lang.hitch(this,function(){
				this.resize();
			}))
		);
		this.inherited(arguments);
		this.resize();
	}
});

});