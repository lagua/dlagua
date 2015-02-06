define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic",
	"dojo/dom-class",
	"dlagua/w/layout/Container",
	"dijit/Viewport",
	"dlagua/c/App",
	"dlagua/w/Subscribable"
],function(declare,lang,array,topic,domClass,Container,Viewport,App,Subscribable){

return declare("dlagua.w.App", [Container,App,Subscribable], {
	flipSize:890,
	view:"",
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
			})),
			this.watch("view",function(prop,oldVal,newVal){
				if(oldVal) domClass.remove(this.domNode,"view-"+oldVal);
				domClass.add(this.domNode,"view-"+newVal);
			})
		);
		this.inherited(arguments);
		domClass.add(this.domNode,"view-"+this.view);
		this._checkFlip();
		this.resize();
	}
});

});