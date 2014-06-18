define("dlagua/w/layout/LayoutContainer", [
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/layout/LayoutContainer",
	"./utils"
 ], function(declare, lang, LayoutContainer, layoutUtils){

	
	return declare("dlagua.w.layout.LayoutContainer",[LayoutContainer],{
		layout: function(){
			layoutUtils.layoutChildren(this.domNode, this._contentBox, this._getOrderedChildren());
		}
	});
});
