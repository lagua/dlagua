define([
	"dojo/_base/declare",
	"dlagua/w/Tree",
	"dijit/tree/dndSource"
],function(declare,_Tree,dndSource){

var Tree = declare("dlagua.w.DndTree",[_Tree],{
	dndController:dndSource,
	betweenThreshold:5,
	checkItemAcceptance:function(target,source,position) {
		var node = dijit.getEnclosingWidget(target);
		var item = node.item;
		if(node && item) {
			if(position=="over" && (item.children || item.type=="list" || item.type=="content")){
				return true;
			} else if(position=="before" || position=="after") {
				return true;
			} else {
				return false;
			}
		}
		return false;
    }
});

return Tree;
});