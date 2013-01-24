define([
	"dojo/_base/declare",
	"dlagua/w/Tree",
	"dijit/dndSource"
],function(declare,_Tree,dndSource){

var Tree = declare("dlagua.w.DndTree",[_Tree],{
	dndController:dndSource,
	betweenThreshold:5,
	checkItemAcceptance:function(target,source,position) {
		var node = dijit.getEnclosingWidget(target);
		var item = node.item;
		if(node && item && (item.children || item.type=="list" || item.type=="content")){
			return true
		}
		return false;
    }
});

return Tree;
});