define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
	"dijit/MenuBar",
	"dlagua/w/DropDownMenu",
	"dlagua/w/TreeController",
	"dlagua/w/StatefulController",
	"dlagua/w/MenuBarItem",
	"dlagua/w/PopupMenuBarItem"
],function(declare,lang,aspect,MenuBar,DropDownMenu,TreeController,StatefulController,MenuBarItem,PopupMenuBarItem){
	return declare("dlagua.w.MenuBar",[MenuBar,TreeController,StatefulController],{
		childWidget:MenuBarItem,
		store:null,
		depth:2,
		_addItem:function(item,index,items,params){
			if(!item._loadObject && this.maxDepth>this.depth && item.children && item.children.length && !params) {
				var dd = new DropDownMenu({
					store:this.store,
					currentItem:item,
					publishId:this.id,
					depth:this.depth+1,
					parent:this,
					maxDepth:this.maxDepth,
					labelAttr:this.labelAttr
				});
				this.own(aspect.after(this,"selectNode",function(node){
					if(node && dd!=node.popup && dd._selectedNode) {
						dd._selectedNode.set("selected",false);
						dd._selectedNode = null;
					}
				},true));
				this._addItem(item,index,items,{
					childWidget:PopupMenuBarItem,
					popup:dd
				});
			} else {
				this.inherited(arguments);
			}
		},
		onItemClick:function(node) {
			if(this.maxDepth<=this.depth || !node.item.children || !node.item.children.length || this.foldersArePages) this.selectNode(node);
			this.inherited(arguments);
		}
	});
});
