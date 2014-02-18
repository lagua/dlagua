define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dlagua/w/layout/LayoutContainer",
	"dlagua/w/Subscribable"
],function(declare,lang,array,on,LayoutContainer,Subscribable){

return declare("dlagua.w.App", [LayoutContainer,Subscribable], {
	startup: function(){
		console.log("app startup called");
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