define("dlagua/w/layout/LayoutContainer", [
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/layout/LayoutContainer",
	"./utils"
 ], function(declare, lang, LayoutContainer, layoutUtils){

	
	return declare("dlagua.w.layout.LayoutContainer",[LayoutContainer],{
		tileSize:50,
		layout: function(){
			layoutUtils.tileSize = this.tileSize;
			layoutUtils.layoutChildren(this.domNode, this._contentBox, this._getOrderedChildren());
		}
	});
});
