dojo.provide("dlagua.w.DndTree");

dojo.require("dlagua.w.Tree");
dojo.require("dlagua.w.tree.dndSource");
dojo.require("dojo.dnd.common");
dojo.require("dojo.dnd.Source");

dojo.declare("dlagua.w.DndTree",[dlagua.w.Tree],{
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
        return new dlagua.w._DndTreeNode(args);
    }
});
dojo.provide("dlagua.w._DndTreeNode");
dojo.declare("dlagua.w._DndTreeNode",[dlagua.w._TreeNode], {
	templateString: dojo.cache("dlagua.w", "templates/DndTreeNode.html")
});