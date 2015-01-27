define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
	"dojo/Deferred",
	"dojo/when",
	"dlagua/c/store/JsonRest",
	"dlagua/w/tree/TreeStoreModel"
],function(declare,lang,aspect,Deferred,when,JsonRest,TreeStoreModel){

return declare("dlagua.w.tree.TreeMenuStoreModel", [TreeStoreModel], {
	stores:{},
	getRoot: function(onItem, onError){
		// summary:
		//		Calls onItem with the root item for the tree, possibly a fabricated item.
		//		Calls onError on error.
		onItem(this.root);
	},
	mayHaveChildren : function(item) {
		// if the item has a model, try children
		if(item && item.type!="form") {
			if(item.hasOwnProperty("model") && item.hasOwnProperty("menuProperties")) {
				var props = item.menuProperties.replace(/\s*,\s*/g, ",").split(",");
				for(var i=0;i<props.length;i++){
					if(item.hasOwnProperty(props[i])) return true;
				}
			} else {
				return item.hasOwnProperty("childorder") && item.childorder.length>0;
			}
		}
	},
	constructor:function(args) {
		if(!args.store) {
			this.store = new JsonRest({
				target:"/model/Page/"
			});
		}
		this.inherited(arguments);
		var self = this;
		var getChildren = this.store.getChildren;
		this.store = lang.mixin(this.store,{
			getChildren: function(item) {
				if(item.type=="model" && item.model) {
					var q = "../"+item.model+"/?locale="+(item.locale || self.locale);
					if(item.sort) q+="&sort("+item.sort+")";
					return this.query(q);
				} else {
					return getChildren.call(this,item);
				}
			
			}
		});
	}
});

});