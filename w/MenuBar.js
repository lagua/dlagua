define([
	"dojo/_base/declare",
	"dijit/MenuBar",
	"dlagua/w/TreeController",
	"dlagua/w/StatefulController",
	"dlagua/w/MenuBarItem"
],function(declare,MenuBar,TreeController,StatefulController,MenuBarItem){
	return declare("dlagua.w.MenuBar",[MenuBar,TreeController,StatefulController],{
		childWidget:MenuBarItem,
		onItemHover: function(item){
			/*
			 * on "itemHover" lambda "a.getChildren()" 
			var self = this;
			if(this.maxDepth>2 && item.item.children && item.item.children.length) {
				// extend to popupmenuitem
				// popup has a dropdown!
				// inherits some properties: which?
				// has to be build from data
				item.transform(this.childType,lang.hitch(item,function(){
					var popup = new DropDownMenu({
						store:self.store,
						maxDepth:self.maxDepth,
						labelAttr:self.labelAttr
					});
					
					return {
						popup:popup
					}
				}));
			}*/
			this.inherited(arguments);
		},
		onItemClick:function(item) {
			if(this.maxDepth<=2 || !item.item.children || !item.item.children.length) this.selectNode(item);
			this.inherited(arguments);
		}
	});
});
