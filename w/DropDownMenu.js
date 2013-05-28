define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dijit/DropDownMenu",
	"dlagua/w/TreeController",
	"dlagua/w/StatefulController",
	"dlagua/w/MenuItem"
],function(declare,array,DropDownMenu,TreeController,StatefulController,MenuItem) {
	return declare("dlagua.w.DropDownMenu",[DropDownMenu,TreeController,StatefulController],{
		maxDepth:2,
		_itemNodesMap:null,
		labelAttr:"title",
		childWidget:MenuItem,
		onItemClick:function(item) {
			this.selectNode(item);
			this.inherited(arguments);
		}
	});
});