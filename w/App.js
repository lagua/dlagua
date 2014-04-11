define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic",
	"dijit/layout/LayoutContainer",
	"dijit/Viewport",
	"dlagua/c/App",
	"dlagua/w/Subscribable"
],function(declare,lang,array,topic,LayoutContainer,Viewport,App,Subscribable){

return declare("dlagua.w.App", [LayoutContainer,App,Subscribable], {
	flipSize:890,
	_checkFlip:function(){
		var box = Viewport.getEffectiveBox();
		var f = box.w<=this.flipSize;
		if(f!=this.flipped) {
			topic.publish("/components/"+this.id+"/view-change", f ? "small" : "large");
		}
		this.flipped = f;
	},
	startup: function(){
		this.own(
			Viewport.on("resize",lang.hitch(this,function(){
				this._checkFlip();
				this.resize();
			}))
		);
		this.inherited(arguments);
		this._checkFlip();
		this.resize();
	}
});

});