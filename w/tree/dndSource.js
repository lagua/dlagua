define([
	"dojo/_base/declare", // declare
	"dojo/_base/array",
	"dijit/tree/dndSource"
], function(declare, array, dndSource){

	// module:
	//		dbrota/widget/tree/dndSource

	return declare("dbrota.widget.tree.dndSource", dndSource, {
		userSelect: function(node, multi, range){
			// summary:
			//		Add or remove the given node from selection, responding
			//		to a user action such as a click or keypress.
			// multi: Boolean
			//		Indicates whether this is meant to be a multi-select action (e.g. ctrl-click)
			// range: Boolean
			//		Indicates whether this is meant to be a ranged action (e.g. shift-click)
			// tags:
			//		protected

			if(this.singular){
				if(this.anchor == node && multi){
					this.selectNone();
				}else{
					this.setSelection([node]);
					this.anchor = node;
				}
			}else{
				if(range && this.anchor){
					var cr = this._compareNodes(this.anchor.rowNode, node.rowNode),
					begin, end, anchor = this.anchor;

					if(cr < 0){ //current is after anchor
						begin = anchor;
						end = node;
					}else{ //current is before anchor
						begin = node;
						end = anchor;
					}
					var nodes = [];
					//add everything betweeen begin and end inclusively
					while(begin != end){
						nodes.push(begin);
						begin = this.tree._getNext(begin);
					}
					nodes.push(end);

					this.setSelection(nodes);
				}else{
					if( this.selection[ node.id ] && multi ){
						this.removeTreeNode( node );
					}else if(multi){
						this.addTreeNode(node, true);
					}else{
						//this.setSelection([node]);
						this.anchor = node;
					}
				}
			}
		}
	});
	
});