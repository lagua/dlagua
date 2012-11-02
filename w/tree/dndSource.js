dojo.provide("dlagua.w.tree.dndSource");
dojo.require("dijit.tree.dndSource");

dojo.declare("dlagua.w.tree.dndSource",[dijit.tree.dndSource],{
	_onDragMouse: function(e){
		// summary:
		//		Helper method for processing onmousemove/onmouseover events while drag is in progress.
		//		Keeps track of current drop target.

		var m = dojo.dnd.manager(),
			oldTarget = this.targetAnchor,			// the TreeNode corresponding to TreeNode mouse was previously over
			newTarget = this.current,				// TreeNode corresponding to TreeNode mouse is currently over
			oldDropPosition = this.dropPosition;	// the previous drop position (over/before/after)

		// calculate if user is indicating to drop the dragged node before, after, or over
		// (i.e., to become a child of) the target node
		var newDropPosition = "Over";
		if(newTarget && this.betweenThreshold > 0){
			// If mouse is over a new TreeNode, then get new TreeNode's position and size
			if(!this.targetBox || oldTarget != newTarget){
				this.targetBox = dojo.position(newTarget.rowNode, true);
			}
			if((e.pageY - this.targetBox.y) <= this.betweenThreshold){
				newDropPosition = "Before";
			}else if((e.pageY - this.targetBox.y) >= (this.targetBox.h - this.betweenThreshold)){
				newDropPosition = "After";
			}
		}

		if(newTarget != oldTarget || newDropPosition != oldDropPosition){
			if(oldTarget){
				this._removeItemClass(oldTarget.rowNode, oldDropPosition);
			}
			if(newTarget){
				this._addItemClass(newTarget.rowNode, newDropPosition);
			}

			// Check if it's ok to drop the dragged node on/before/after the target node.
			if(!newTarget){
				m.canDrop(false);
			}else if(newTarget == this.tree.rootNode && newDropPosition != "Over"){
				// Can't drop before or after tree's root node; the dropped node would just disappear (at least visually)
				m.canDrop(false);
			}else if(m.source == this && (newTarget.id in this.selection)){
				// Guard against dropping onto yourself (TODO: guard against dropping onto your descendant, #7140)
				m.canDrop(false);
			}else if(this.checkItemAcceptance(newTarget.rowNode, m.source, newDropPosition.toLowerCase())
					&& !this._isParentChildDrop(m.source, newTarget.rowNode)){
				m.canDrop(true);
			}else{
				m.canDrop(false);
			}

			this.targetAnchor = newTarget;
			this.dropPosition = newDropPosition;
		} else if(!newTarget && !oldTarget && newDropPosition=="Over" && oldDropPosition=="Over"){
			m.canDrop(false);
		}
	}
});