define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic"
],function(declare,lang,array,topic){
	return declare("dlagua.w.TreeController",[],{
		_selectedNode:null,
		maxDepth:2,
		selectNode:function(node,truncated,depth,fromTreeRoot){
			if(!node) return;
			console.log("TreeController selectNode ",truncated);
			if(this._selectedNode) {
				this._selectedNode.set("selected",false);
			}
			this._selectedNode = node;
			node.set("selected",true);
			if(this.currentItem && node.item == this.currentItem) return;
			if(truncated && depth<this.maxDepth) {
				if(node.popup && node.popup._loadFromId && node.popup.depth<=this.maxDepth) {
					node.popup._loadFromId("",null,truncated);
				}
				return;
			}
			var item = lang.mixin({},this._selectedNode.item);
			// FIXME: dirty hack for subnav components:
			// they will set the state if i am truncated
			// BUT if there is no subnav to pick it up, nothing will happen
			if(truncated) {
				//delete item.state;
				item.__truncated = truncated;
			}
			// hack to prevent submenu root clicks from propagating everywhere
			if(fromTreeRoot && item[this.childrenAttr]) {
				item.__fromRoot = true;
			}
			var id = this.publishId ? this.publishId : this.id;
			topic.publish("/components/"+id,item);
		},
		onReady:function(){
			console.log("TreeController ready")
		}
	});
});