define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
	"dojo/Deferred",
	"dojo/promise/all",
	"dijit/Tree"
],function(declare,lang,array,Deferred,all,_Tree) {

function shimmedPromise(/*Deferred|Promise*/ d){
	// summary:
	//		Return a Promise based on given Deferred or Promise, with back-compat addCallback() and addErrback() shims
	//		added (TODO: remove those back-compat shims, and this method, for 2.0)

	return lang.delegate(d.promise || d, {
		addCallback: function(callback){ this.then(callback); },
		addErrback: function(errback){ this.otherwise(errback); }
	});
}

var Tree = declare("dlagua.w.CollapsingTree",[_Tree],{
	openOnClick:true,
	__click: function(/*TreeNode*/ nodeWidget, /*Event*/ e, /*Boolean*/doOpen, /*String*/func){
		var domElement = e.target,
			isExpandoClick = this.isExpandoNode(domElement, nodeWidget);

		if(nodeWidget.isExpandable && (doOpen || isExpandoClick)){
			// expando node was clicked, or label of a folder node was clicked; open it
			this._onExpandoClick({isExpandoClick:isExpandoClick,node: nodeWidget});
		}else{
			this._publish("execute", { item: nodeWidget.item, node: nodeWidget, evt: e });
			this[func](nodeWidget.item, nodeWidget, e);
			this.focusNode(nodeWidget);
		}
		e.stopPropagation();
		e.preventDefault();
	},
	_onExpandoClick: function(/*Object*/ message){
		// summary:
		//		User clicked the +/- icon; expand or collapse my children.
		var node = message.node,
			isExpandoClick = message.isExpandoClick;

		// If we are collapsing, we might be hiding the currently focused node.
		// Also, clicking the expando node might have erased focus from the current node.
		// For simplicity's sake just focus on the node with the expando.
		this.focusNode(node);
		if(isExpandoClick) {
			if(node.isExpanded){
				this._collapseNode(node);
			}else{
				this._expandNode(node);
			}
		} else {
			this.collapseAll(node).then(lang.hitch(this,function(){
				this._expandNode(node);
			}));
		}
	},
	collapseAll: function(exclude){
		// summary:
		//		Collapse all nodes in the tree
		// returns:
		//		Deferred that fires when all nodes have collapsed
		var _this = this;
		
		var isExcludedOrAncestor = function(node){
			if(node==exclude) return true;
			var children = array.filter(node.getChildren() || [],function(child){
				return child==exclude;
			});
			if(children.length) {
				return true;
			} else {
				children = array.map(node.getChildren() || [],function(child){
					return isExcludedOrAncestor(child);
				});
				return array.indexOf(children,true)>-1;
			}
		};
		function collapse(node){
			// Collapse children first
			var childBranches = array.filter(node.getChildren() || [], function(node){
					return node.isExpandable;
				}),
				defs = all(array.map(childBranches, collapse));

			// And when all those recursive calls finish, collapse myself, unless I'm the invisible root node,
			// in which case collapseAll() is finished
			if(isExcludedOrAncestor(node) || !node.isExpanded || (node == _this.rootNode && !_this.showRoot)){
				return defs;
			}else{
				// When node has collapsed, signal that call is finished
				return defs.then(function(){ return _this._collapseNode(node); });
			}
		}

		return shimmedPromise(collapse(this.rootNode));
	}
});

Tree._TreeNode = _Tree._TreeNode;

return Tree;

});