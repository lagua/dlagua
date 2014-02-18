define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/when",
	"dojo/io-query",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dlagua/c/store/JsonRest",
	"dlagua/w/tree/TreeStoreModel"
],function(declare,lang,array,when,ioQuery,Memory,Cache,JsonRest,TreeStoreModel){

return declare("dlagua.w.tree.TreeMenuStoreModel", [TreeStoreModel], {
	stores:{},
	getRoot : function(onItem) {
		if(!this.root) {
			onItem();
			return;
		}
		this.storeMemory = new Memory({idProperty:"id"});
		if(!this.root.path) {
			onItem();
			return;
		}
		var target = "/model/Page/";
		if(!this.stores[target]) {
			var store = new JsonRest({
				target:target
			});
			this.stores[target] = new Cache(store, this.storeMemory);
		}
		if(this.stores) this.store = this.stores[target];
		this.root = this.root;
		if(this.root.type=="model" && this.root.model) {
			var cpath = "../"+this.root.model+"/?locale="+this.root.locale;
			if(this.root.sort) cpath+="&sort("+this.root.sort+")";
			this.root.children = {"$ref":cpath};
		}
		onItem(this.root);
	},
	getChildrenRecursive: function(item, onComplete, onError) {
		if(this.cancelLoading) {
			console.log("cancelled getChildrenRecursive")
			this.cancelLoading = false;
			return;
		}
		var self = this;
		var childItems, children;
		var obj = {};
		var id = item[this.idProperty];
		//console.log("getting children for "+item.name)
		//var dfd = new Deferred();
		var children = this.getValue(item,this.childrenAttr,[]);
		var len = children.length;
		if(len===0) {
			//console.log(item.name+" no children")
			item.__loaded = true;
			if(item.__parent) {
				item.__parent.onChildDone(item);
			}
			return;
		}
		var cnt = 0;
		item.childrenDone = [];
		item.onChildDone = function(child){
			if(array.indexOf(this.childrenDone,child.id)>-1) {
				console.error("child ",child.name, " already loaded");
			} else {
				this.childrenDone.push(child.id);
			}
			if(this.childrenDone.length==this.children.length) {
				delete item["childrenDone"];
				delete item["onChildDone"];
				if(item.__parent && item.__parent.onChildDone) {
					item.__parent.onChildDone(item);
				} else {
					console.log("all children done")
					item.__loaded = true;
					if(onComplete) onComplete(this.children);
				}
			}
		}
		for(var i=0;i<len;i++) {
			if(children[i]._ref) {
				var id = children[i]._ref;
				when(this.store.get(id), function(child) {
					child.__parent = item;
					for(var j=0;j<children.length;j++) {
						var id = (children[j]._ref || children[j][self.idProperty]);
						if(child[self.idProperty]==id) {
							if(children[j]["_ref"]) {
								item.children[j] = lang.mixin(children[j],child);
								delete item.children[j]["_ref"];
							}
							break;
						}
					}
					if(child.children && child.children.length>0 && !self.deferItemLoadingUntilExpand) {
						self.getChildrenRecursive(child);
					} else {
						if(item.onChildDone) item.onChildDone(child);
					}
				},function(res){
				});
			} else {
				var child = children[i];
				child.__parent = item;
				if(child.children && child.children.length>0 && !self.deferItemLoadingUntilExpand) {
					self.getChildrenRecursive(child);
				} else {
					item.onChildDone(child);
				}
			}
		}
	}
});

});