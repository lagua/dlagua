define([
    "dojo/_base/declare",
	"dlagua/w/Tree",
	"dlagua/w/tree/dndSource",
	"dojo/dnd/common",
	"dojo/dnd/Source",
	"dojo/text!dlagua/w/templates/DndTreeNode.html"
],function(declare,Tree,dndSource,common,Source,templateString){
	var _DndTreeNode = declare("dlagua.w._DndTreeNode",[_TreeNode], {
		templateString: templateString
	});
	
	var _Tree = declare("dlagua.w.DndTree",[Tree],{
		dndController:"dlagua.w.tree.dndSource",
		checkItemAcceptance:function(target,source,position) {
			var node = dijit.getEnclosingWidget(target);
			var item = node.item;
			if(node && item && (item.children || item.type=="list" || item.type=="content")){
				return true
			}
			return false;
		},
		_createTreeNode: function(args) {
	        return new _DndTreeNode(args);
	    }
	});
	_Tree._TreeNode = _DndTreeNode;
	return _Tree;
});