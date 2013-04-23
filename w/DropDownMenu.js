define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/DropDownMenu",
	"dlagua/w/TreeController",
	"dlagua/w/Resolvable"
],function(declare,lang,DropDownMenu,TreeController,Resolvable) {
	return declare("dlagua.w.DropDownMenu",[DropDownMenu,TreeController,Resolvable],{
		childType:"dlagua/w/PopupMenuItem",
		maxDepth:2,
		_itemNodesMap:null,
		labelAttr:"title"
	});
});