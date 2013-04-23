define([
	"dojo/_base/declare",
	"dijit/DropDownMenu",
	"dlagua/w/TreeController",
	"dlagua/w/Resolvable"
],function(declare,DropDownMenu,TreeController,Resolvable) {
	return declare("dlagua.w.DropDownMenu",[DropDownMenu,TreeController,Resolvable],{
		childType:"dlagua/w/PopupMenuItem",
		maxDepth:2,
		_itemNodesMap:null,
		labelAttr:"title",
		startup:function(){
			var data = this.resolve(this.item,self.store);
			array.forEach(data.children,this._addItem,this);
			this.inherited(arguments);
		}
	});
});