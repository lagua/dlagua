define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/html",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Contained",
	"dlagua/w/layout/TemplaMixin"
],function(declare,lang,domGeom,domStyle,_Widget,_Templated,_Contained,TemplaMixin) {
return declare("lagua.w.layout.ScrollableServicedPaneItem", [_Widget, _Templated, _Contained, TemplaMixin], {
	parent:null, //quickref to parent widget
	data:null,
	itemHeight:null,
	marginBox:null,
	parseOnLoad:true,
	baseClass:"dlaguaScrollableServicedPaneItem",
	templateString: '<div style="height:${itemHeight};opacity:0;" dojoAttachPoint="containerNode"></div>',
	onLoad:function(){
		// you know what to do...
	},
	startup:function(){
		if(this._started) return;
		this._started = true;
		if(!this.data) {
			this.onLoad();
			return;
		}
		this._load().then(lang.hitch(this,this.onLoad));
	},
	resizeChildren: function(){
		var box = this.marginBox;
		domStyle.set(this.containerNode.firstChild, {
			width: box.w +'px',
			height: box.h + 'px'
		});
	},
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		this._setContent(data || "");
		setTimeout(lang.hitch(this,function(){
			if(!this.containerNode) return;
			this.marginBox = domGeom.marginBox(this.containerNode);
		}),1);
	},
	updateLayout:function() {
		if(!this || !this.containerNode) return;
		this.marginBox = domGeom.marginBox(this.containerNode);
		var parent = (this.parent || this.getParent());
		if(parent && parent.useScrollBar) parent.showScrollBar();
	}
});

});
