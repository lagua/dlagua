define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/MenuBar",
	"dlagua/w/DropDownMenu",
	"dlagua/w/TreeController",
	"dlagua/w/StatefulController",
	"dlagua/w/MenuBarItem",
	"dlagua/w/PopupMenuBarItem"
],function(declare,lang,MenuBar,DropDownMenu,TreeController,StatefulController,MenuBarItem,PopupMenuBarItem){
	return declare("dlagua.w.MenuBar",[MenuBar,TreeController,StatefulController],{
		childWidget:MenuBarItem,
		store:null,
		depth:2,
		onItemHover: function(item){
			this.inherited(arguments);
		},
		_addItem:function(item,index,items,params){
			var self = this;
			if(!item._loadObject && this.maxDepth>2 && item.children && item.children.length && !params) {
				this._addItem(item,index,items,{
					childWidget:PopupMenuBarItem,
					popup:new DropDownMenu({
						store:self.store,
						item:item,
						publishId:self.id,
						depth:3,
						maxDepth:self.maxDepth,
						labelAttr:self.labelAttr
					})
				});
			} else {
				this.inherited(arguments);
			}
		},
		onItemClick:function(node) {
			if(this.maxDepth<=2 || !node.item.children || !node.item.children.length) this.selectNode(node);
			this.inherited(arguments);
		}
	});
});
