define([
	"dojo/_base/declare", // declare
	"dijit/PopupMenuItem"
], function(declare, PopupMenuItem){

	return declare("dlagua.w.PopupMenuItem", [PopupMenuItem], {
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
