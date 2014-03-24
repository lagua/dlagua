define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
	"dlagua/c/store/JsonRest",
	"dlagua/w/tree/TreeStoreModel"
],function(declare,lang,aspect,JsonRest,TreeStoreModel){

return declare("dlagua.w.tree.TreeMenuStoreModel", [TreeStoreModel], {
	stores:{},
	constructor : function(args) {
		if(!args.store) {
			this.store = new JsonRest({
				target:"/model/Page/"
			});
		}
		this.inherited(arguments);
	},
	getRoot:function(onItem){
		// replace root children if they should come from another model
		aspect.after(this,"onItem",lang.hitch(this,function(root)
			if(root.type=="model" && root.model) {
				var cpath = "../"+root.model+"/?locale="+root.locale;
				if(root.sort) cpath+="&sort("+root.sort+")";
				root.children = {"$ref":cpath};
				return root;
			}
		},true);
		this.inherited(arguments);
	}
});

});