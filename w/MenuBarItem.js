define([
	"dojo/_base/declare",
	"dijit/MenuBarItem",
	"dojo/text!dlagua/w/templates/MenuBarItem.html"
],function(declare,MenuBarItem,template) {
	return declare("dlagua.w.MenuBarItem",[MenuBarItem],{
		templateString:template,
		selected:false,
		item:null,
		_setSelected: function(selected){
			// override to prevent selecting hovered+focused nodes
		}
	});
});