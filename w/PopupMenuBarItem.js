define([
	"dojo/_base/declare", // declare
	"dijit/PopupMenuBarItem"
], function(declare, PopupMenuBarItem){

	return declare("dlagua.w.PopupMenuBarItem", [PopupMenuBarItem], {
		selected:false,
		item:null,
		postCreate:function(){
			if(this.item && this.item.hidden) this.domNode.style.display = "none";
			this.inherited(arguments);
		},
		_setSelected: function(selected){
			// override to prevent selecting hovered+focused nodes
		}
	});
});
