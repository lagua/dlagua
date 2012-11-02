dojo.provide("dlagua.w.tree.TreeMenuStoreModel");
dojo.require("dlagua.w.tree.TreeStoreModel");
dojo.declare("dlagua.w.tree.TreeMenuStoreModel", [dlagua.w.tree.TreeStoreModel], {
	stores:{},
	getRoot : function(onItem) {
		if(!this.root) {
			onItem();
			return;
		}
		this.storeMemory = new dojo.store.Memory({idProperty:"id"});
		if(!this.root.path) {
			onItem();
			return;
		}
		var target = "/persvr/Page/";
		if(!this.stores[target]) {
			var store = new dlagua.c.store.JsonRest({
				target:target
			});
			this.stores[target] = new dojo.store.Cache(store, this.storeMemory);
		}
		if(this.stores) this.store = this.stores[target];
		this.root = this.root;
		if(this.root.type=="persvr" && this.root.model) {
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
		//var dfd = new dojo.Deferred();
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
			if(dojo.indexOf(this.childrenDone,child.id)>-1) {
				console.error("child ",child.name, " already loaded");
			} else if(child.hidden) {
				console.log("child ",child.name," is hidden")
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
				dojo.when(this.store.get(id), function(child) {
					child.__parent = item;
					for(var j=0;j<children.length;j++) {
						var id = (children[j]._ref || children[j][self.idProperty]);
						if(child[self.idProperty]==id) {
							if(children[j]["_ref"]) {
								item.children[j] = dojo.mixin(children[j],child);
								delete item.children[j]["_ref"];
							}
							break;
						}
					}
					if(child.hidden) {
						item.children.splice(j,1);
						if(item.onChildDone) item.onChildDone(child);
					} else if(child.children && child.children.length>0 && !self.deferItemLoadingUntilExpand) {
						self.getChildrenRecursive(child);
					} else {
						if(item.onChildDone) item.onChildDone(child);
					}
				},function(res){
				});
			} else {
				var child = children[i];
				child.__parent = item;
				if(child.hidden) {
					item.children.splice(i,1);
				} else if(child.children && child.children.length>0 && !self.deferItemLoadingUntilExpand) {
					self.getChildrenRecursive(child);
				} else {
					item.onChildDone(child);
				}
			}
		}
	}
});