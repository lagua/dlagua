define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic"
],function(declare,lang,array,topic){
	return declare("dlagua.w.TreeController",[],{
		_selectedNode:null,
		maxDepth:2,
		childType:"dlagua/w/PopupMenuBarItem",
		onItemHover: function(item){
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
			}
			this.inherited(arguments);
		},
	    onItemClick: function(item){
	    	if(this.maxDepth<=2 || !item.item.children || !item.item.children.length) this.selectNode(item);
	        this.inherited(arguments);
	    },
		selectNode:function(node,truncated){
			console.log("TreeController selectNode ",truncated);
			var p;
			if(this._selectedNode) {
				this._selectedNode.set("selected",false);
			}
			this._selectedNode = node;
			node.set("selected",true);
			var item = lang.mixin({},this._selectedNode.item);
			// FIXME: dirty hack for subnav components:
			// they will set the state if i am truncated
			// BUT if there is no subnav to pick it up, nothing will happen
			if(truncated) {
				//delete item.state;
				item.__truncated = truncated;
			}
			topic.publish("/components/"+this.id,item);
		},
		onReady:function(){
			console.log("TreeController ready")
		}
	});
});