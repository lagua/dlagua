define([
	"dojo/_base/declare", // declare
	"dojo/dom-class",
	"dijit/PopupMenuBarItem"
], function(declare,domClass,PopupMenuBarItem){

	return declare("dlagua.w.PopupMenuBarItem", [PopupMenuBarItem], {
		selected:false,
		item:null,
		postCreate:function(){
			if(this.item && this.item.hidden) domClass.add(this.domNode,"dijitHidden");
			this.inherited(arguments);
		},
		_setSelected: function(selected){
			// override to prevent selecting hovered+focused nodes
		}
	});
});
