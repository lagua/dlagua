define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Contained"
],function(declare,lang,domGeometry,domStyle,_Widget,_Templated,_Contained) {
return declare("dlagua.w.layout.ScrollableServicedPaneItem", [_Widget, _Templated, _Contained], {
	parent:null, //quickref to parent widget
	itemHeight:null,
	marginBox:null,
	parseOnLoad:true,
	baseClass:"dlaguaScrollableServicedPaneItem",
	templateString: '<div style="height:${itemHeight};opacity:0;" data-dojo-attach-point="containerNode"></div>',
	onLoad:function(){
		// you know what to do...
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
	},
	updateLayout:function() {
		var parent = (this.parent || this.getParent());
		if(parent && parent.useScrollBar) parent.showScrollBar();
	}
});

});
