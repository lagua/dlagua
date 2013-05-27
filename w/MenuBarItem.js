define([
	"dojo/_base/declare",
	"dijit/MenuBarItem"
],function(declare,MenuBarItem) {
	return declare("dlagua.w.MenuBarItem",[MenuBarItem],{
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