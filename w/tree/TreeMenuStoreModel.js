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
				var root = self.root;
				if(root.type=="model" && root.model) {
					var q = "../"+root.model+"/?locale="+root.locale;
					if(root.sort) q+="&sort("+root.sort+")";
					return this.query(q);
				} else {
					return getChildren.call(this,item);
				}
			
			}
		});
	}
});

});