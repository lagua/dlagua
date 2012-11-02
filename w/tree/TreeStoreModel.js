dojo.provide("dlagua.w.tree.TreeStoreModel");
dojo.require("dojo.store.Memory");
dojo.require("dojo.store.Cache");
//dojo.require("dojo.store.Observable");
dojo.declare("dlagua.w.tree.TreeStoreModel", null, {
	root : null,
	store: null,
	storeMemory: null,
	loaded:false,
	rootId : "",
	rootType:"locale",
	locale:"",
	childrenAttr : "children",
	parentAttr: "__parent",
	showOnlyChildren : false,
	labelAttr: "name",
	idProperty:"id",
	_loading:false,
	cancelLoading:false,
	oriStore:null,
	deferItemLoadingUntilExpand:true,
	constructor : function(args) {
		dojo.mixin(this, args);
		this.oriStore = args.store;
	},
	getRoot : function(onItem,onError) {
		var self = this;
		this._loading = true;
		this.storeMemory = new dojo.store.Memory({idProperty:"id"});
		this.store = new dojo.store.Cache(this.oriStore, this.storeMemory);
		if(this.locale && !this.rootId) {
			var qo = {
				type:this.rootType,
				locale:this.locale
			};
			dojo.when(this.store.query("?"+dojo.objectToQuery(qo),{start:0,count:1}), function(items) {
				if(items && items.length && !self.cancelLoading) {
					self.root = items[0];
					onItem(self.root);
				} else {
					if(!self.cancelLoading) {
						onError("Could not load root for this locale");
					} else {
						onError("Cancelled");
						self.cancelLoading = false;
					}
					self.loaded = true;
					self._loading = false;
				}
			});
		} else if(this.rootId) {
			dojo.when(this.store.get(this.rootId), function(item) {
				self.root = item;
				onItem(self.root);
			});
		} else {
			onItem();
		}
	},

	mayHaveChildren : function(item) {
		return item ? item.hasOwnProperty(this.childrenAttr) : false;
	},
	
	getIdentity : function(item) {
		return item[this.idProperty];
	},
	
	_requeryTop: function(){
		var self = this;
		var oldroot = dojo.mixin({},this.root);
		this._loading = true;
		this.getRoot(function(item) {
			if(!item.children) {
				delete oldroot.children;
				self.onChildrenChange(oldroot,null);
				self.onChange(oldroot);
			}
			item.__loaded = false;
			self.getChildren(item, function(children){
				// See comments in onNewItem() about calling getChildren()
				self.onChildrenChange(item, children);
			});
		});
	},
	getChildren: function(item,onComplete,onError) {
		//console.log("getChildren called for ",item)
		if(this.cancelLoading) {
			console.log("cancelled getChildren")
			this.onLoad();
			return;
		}
		var self = this;
		var deferredComplete = function(children){
			self.onLoad();
			if(onComplete) onComplete(children);
		};
		var children = this.getValue(item,this.childrenAttr,[]);
		if(!item.__loaded) {
			if(!children) {
				deferredComplete(children);
			} else if(!dojo.isArray(children) && dojo.isObject(children) && children["$ref"]) {
				// lazy from persvr2
				item.__loaded = true;
				this.resolveChildren(item, deferredComplete, onError);
			} else {
				if(children.length===0) {
					item.__loaded = true;
					if(onComplete) {
						onComplete(children);
						this.onLoad();
					}
					return;
				}
				this.getChildrenRecursive(item, deferredComplete, onError);
			}
		} else {
			onComplete(children);
		}
	},
	resolveChildren: function(item, onComplete, onError) {
		var children = this.getValue(item,this.childrenAttr,[]);
		var self = this;
		dojo.when(this.store.query(children["$ref"]), function(children){
			dojo.forEach(children,function(child,i){
				children[i].__parent = item;
			});
			item.children = children;
			onComplete(children);
		}, onError);
	},
	cancel:function(){
		this._loading = false;
		this.cancelLoading = true;
	},
	getChildrenRecursive: function(item, onComplete, onError) {
		if(this.cancelLoading) {
			console.log("cancelled getChildrenRecursive")
			this.onLoad();
			return;
		}
		var self = this;
		var query;
		var childItems, children;
		var obj = {};
		var id = item[this.idProperty];
		//console.log("getting children for "+item.name)
		//var dfd = new dojo.Deferred();
		var children = this.getValue(item,this.childrenAttr,[]);
		var len = children.length;
		// FIXME the following is highly unlikely
		if(len===0) {
			//console.log(item.name+" no children")
			item.__loaded = true;
			if(item.__parent && item.__parent.onChildDone) {
				item.__parent.onChildDone(item);
			}
			return;
		}
		var cnt = 0;
		item.childrenDone = [];
		item.onChildDone = function(child){
			if(dojo.indexOf(this.childrenDone,child.id)>-1) {
				console.error("child ",child.name, " already loaded");
			} else {
				this.childrenDone.push(child.id);
			}
			//console.log(this.name+" child done "+child.name,this.childrenDone,this.children.length)
			if(this.childrenDone.length==this.children.length) {
				delete item["childrenDone"];
				delete item["onChildDone"];
				if(item.__parent && item.__parent.onChildDone) {
					item.__parent.onChildDone(item);
				} else {
					console.log("all children done")
					this.__loaded = true;
					if(onComplete) onComplete(this.children);
				}
			}
		}
		dojo.forEach(children,dojo.hitch(this,function(child,i){
			if(child._ref) {
				var id = child._ref;
				dojo.when(this.store.get(id), function(child) {
					child.__parent = item;
					for(var j=0;j<children.length;j++) {
						id = (children[j]._ref || children[j][self.idProperty]);
						if(child[self.idProperty]==id) {
							if(children[j]["_ref"]) {
								item.children[j] = dojo.mixin(children[j],child);
								delete item.children[j]["_ref"];
							}
							break;
						}
					}
					if(child.children && child.children.length>0 && !self.deferItemLoadingUntilExpand) {
						self.getChildrenRecursive(child);
					} else {
						if(item.onChildDone) {
							item.onChildDone(child);
						} else {
							console.error("cannot call onChildDone for ",child.name,item);
						}
					}
				},function(res){
				});
			} else {
				child.__parent = item;
				if(child.children && child.children.length>0 && !self.deferItemLoadingUntilExpand) {
					self.getChildrenRecursive(child);
				} else {
					item.onChildDone(child);
				}
			}
		}));
	},
	getParent: function(item) {
		return item ? item.__parent : undefined;
	},
	getValue: function(/*Object*/ item, /*String*/property, /*value?*/defaultValue){
		return item ? (property in item ? item[property] : defaultValue) : undefined;
	},
	getValues: function(item, property){
		var val = this.getValue(item,property);
		return val instanceof Array ? val : val === undefined ? [] : [val];
	},

	getAttributes: function(item){
		var res = [];
		for(var i in item){
			if(item.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_')){
				res.push(i);
			}
		}
		return res;
	},

	isItem: function(item){
		// summary:
		//		Checks to see if the argument is an item
		//
		//	item: /* object */
		//	attribute: /* string */

		// we have no way of determining if it belongs, we just have object returned from
		// 	service queries
		return (typeof item == 'object') && item && !(item instanceof Date);
	},

	getItemById: function(id,item) {
		if(!item) item = this.root;
		var self = this;
		if(!item["id"] && item["_ref"]) {
			dojo.when(this.store.get(id), function(child) {
				item = dojo.mixin(item,child);
				delete item["_ref"];
				self.getItemById(id, item);
			});
		}
    	if(id == item.id) {
    		// Return the buildme array, indicating a match was found
    		//console.log("++ FOUND item ", item, " buildme now = ", buildme);
    		return item;
    	}
    	if(item["children"]) {
	    	var children = item.children;
			for(var i=0;i<children.length;i++) {
				item = this.getItemById(id,children[i]);
				if(item) return item;
		    }
    	}
		return undefined;
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if(this.isItem(item)){
			return this.getValue(item,this.labelAttr); //String
		}
		return undefined; //undefined
	},

	pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem, /*Boolean*/ bCopy, /*int?*/ insertIndex){
		// summary:
		//		Move or copy an item from one parent item to another.
		//		Used in drag & drop
		var attr = this.childrenAttr;	// name of "children" attr in parent item
		var self = this;
		// remove child from source item
		if(oldParentItem){
			if(!bCopy){
				//this.getChildren(oldParentItem,dojo.hitch(this, function(children){
				var children = this.getValues(oldParentItem, attr);
				var values = dojo.filter(children, function(child){
					return (child[self.idProperty] != childItem[self.idProperty]);
				});
				if(values.length>0) {
					this.setValues(oldParentItem, attr, values);
				} else {
					this.unsetAttribute(oldParentItem,attr);
				}
				//}));
			}
		}

		// modify target item's children attribute to include this item
		if(newParentItem){
			childItem.__parent = newParentItem;
			if(typeof insertIndex == "number"){
				// call slice() to avoid modifying the original array, confusing the data store
				var childItems = this.getValues(newParentItem, attr).slice();
				console.log("newParent/WIndex")
				childItems.splice(insertIndex, 0, childItem);
				this.setValues(newParentItem, attr, childItems);
			}else{
				//this.getChildren(newParentItem,dojo.hitch(this, function(children){
				var children = this.getValues(newParentItem, attr);
					console.log("newParentNoIndex")
					this.setValues(newParentItem, attr, children.concat(childItem));
				//}));
			}
		}
		// signal childItem position has changed
		this.onChange(childItem);
	},
	newItem: function(/* dojo.dnd.Item */ data, /*Item*/ parent, /*int?*/ insertIndex){
		// summary:
		//		Creates a new item.   See `dojo.data.api.Write` for details on args.
		//		Used in drag & drop when item from external source dropped onto tree.
		// description:
		//		Developers will need to override this method if new items get added
		//		to parents with multiple children attributes, in order to define which
		//		children attribute points to the new item.
		// get the previous value or any empty array
		// set the new value
		// Move new item to desired position
		var self = this;
		data.__parent = parent;
		this.changing(data);
		this.pasteItem(data, null, parent, false, insertIndex);
		parent.__loaded = false;
		this.getChildren(parent, function(children){
			self.onChildrenChange(parent, children);
			self.onNew(data);
		});
		return data;
	},
	onChildrenChange: function(/*dojo.data.Item*/ parent, /*dojo.data.Item[]*/ newChildrenList){
		// summary:
		//		Callback to do notifications about new, updated, or deleted items.
		// tags:
		//		callback
	},
	onChange: function(/*dojo.data.Item*/ item){
		// summary:
		//		Callback whenever an item has changed, so that Tree
		//		can update the label, icon, etc.   Note that changes
		//		to an item's children or parent(s) will trigger an
		//		onChildrenChange() so you can ignore those changes here.
		// tags:
		//		callback
	},
	onSet: function(/* item */ item,
					/* attribute-name-string */ attribute,
					/* object | array */ oldValue,
					/* object | array */ newValue){
		// summary:
		//		Updates the tree view according to changes in the data store.
		// description:
		//		Handles updates to an item's children by calling onChildrenChange(), and
		//		other updates to an item by calling onChange().
		//
		//		See `onNewItem` for more details on handling updates to an item's children.
		// tags:
		//		extension
		// item's children list changed
		this.getChildren(item, dojo.hitch(this, function(children){
			// See comments in onNewItem() about calling getChildren()
			this.onChildrenChange(item, children);
		}));

	},
	deleteItem: function(item){
		this.changing(item, true);
		this.onDelete(item);
		if(!item.__parent) return;
		var parent = item.__parent;
		if(parent.__loaded) parent.__loaded = false;
		this.getChildren(parent, dojo.hitch(this,function(children){
			console.log(children);
			var i=0;
			for(;i<children.length;i++) {
				if(children[i].id==item.id) break;
			}
			children.splice(i,1);
			if(children.length>0) {
				this.setValues(parent,this.childrenAttr,children);
			} else {
				this.unsetAttribute(parent,this.childrenAttr);
			}
		}));
	},
	setValue: function(item, attribute, value){
		// summary:
		//		sets 'attribute' on 'item' to 'value'

		var old = item[attribute];
		this.changing(item);
		item[attribute]=value;
		this.onSet(item,attribute,old,value);
	},
	setValues: function(item, attribute, values){
		// summary:
		//	sets 'attribute' on 'item' to 'value' value
		//	must be an array.


		if(!dojo.isArray(values)){
			throw new Error("setValues expects to be passed an Array object as its value");
		}
		this.setValue(item,attribute,values);
	},

	unsetAttribute: function(item, attribute){
		// summary:
		//		unsets 'attribute' on 'item'

		this.changing(item);
		var old = item[attribute];
		delete item[attribute];
		this.onSet(item,attribute,old,undefined);
	},
	
	_dirtyObjects: [],
	
	changing: function(object,_deleting){
		// summary:
		//		adds an object to the list of dirty objects.  This object
		//		contains a reference to the object itself as well as a
		//		cloned and trimmed version of old object for use with
		//		revert.
		object.__isDirty = true;
		//if an object is already in the list of dirty objects, don't add it again
		//or it will overwrite the premodification data set.
		for(var i=0; i<this._dirtyObjects.length; i++){
			var dirty = this._dirtyObjects[i];
			if(object==dirty.object){
				if(_deleting){
					// we are deleting, no object is an indicator of deletiong
					dirty.object = false;
					if(!this._saveNotNeeded){
						dirty.save = true;
					}
				}
				return;
			}
		}
		var old = object instanceof Array ? [] : {};
		for(i in object){
			if(object.hasOwnProperty(i)){
				old[i] = object[i];
			}
		}
		this._dirtyObjects.push({object: !_deleting && object, old: old, save: !this._saveNotNeeded});
	},
	
	save: function(kwArgs){
		// summary:
		//		Saves the dirty data using object store provider. See dojo.data.api.Write for API.
		//
		//	kwArgs.global:
		//		This will cause the save to commit the dirty data for all
		// 		ObjectStores as a single transaction.
		//
		//	kwArgs.revertOnError
		//		This will cause the changes to be reverted if there is an
		//		error on the save. By default a revert is executed unless
		//		a value of false is provide for this parameter.

		kwArgs = kwArgs || {};
		var result, actions = [];
		var alreadyRecorded = {};
		var savingObjects = [];
		var self;
		var dirtyObjects = this._dirtyObjects;
		var left = dirtyObjects.length;// this is how many changes are remaining to be received from the server
		//try{
			/*dojo.connect(kwArgs,"onError",function(){
				if(kwArgs.revertOnError !== false){
					var postCommitDirtyObjects = dirtyObjects;
					dirtyObjects = savingObjects;
					var numDirty = 0; // make sure this does't do anything if it is called again
					self.revert(); // revert if there was an error
					self._dirtyObjects = postCommitDirtyObjects;
				}
				else{
					self._dirtyObjects = dirtyObject.concat(savingObjects);
				}
			});*/
			//if(this.store.transaction){
			//	var transaction = this.store.transaction();
			//}
			for(var i = 0; i < dirtyObjects.length; i++){
				var dirty = dirtyObjects[i];
				var object;
				var children;
				if(dirty.object){
					object = {};
					for(var j in dirty.object){
						if(j.substring(0,2) != "__") {
							object[j] = dirty.object[j];
						}
					}
					if(object.children) {
						dojo.forEach(object.children,function(child,i){
							if(child.id) object.children[i] = {"_ref":child.id};
						});
					}
					delete dirty.object.__isDirty;
				}
				var old = dirty.old;
				if(object){
					result = this.store.put(object, {overwrite: !!old});
				} else {
					result = this.store.remove(this.getIdentity(old));
				}
				if(object) {
					dirty.object.__loaded = false;
					this.getChildren(dirty.object);
				}
				savingObjects.push(dirty);
				dirtyObjects.splice(i--,1);
				dojo.when(result, function(value){
					if(!(--left)){
						if(kwArgs.onComplete){
							kwArgs.onComplete.call(kwArgs.scope, actions);
						}
					}
				},function(value){
					// on an error we want to revert, first we want to separate any changes that were made since the commit
					left = -1; // first make sure that success isn't called
					kwArgs.onError.call(kwArgs.scope, value);
				});
				
			}
			//if(transaction){
			//	transaction.commit();
			//}
		//}catch(e){
		//	kwArgs.onError.call(kwArgs.scope, value);
		//}
	},

	revert: function(kwArgs){
		// summary
		//		returns any modified data to its original state prior to a save();
		//
		var dirtyObjects = this._dirtyObjects;
		for(var i = dirtyObjects.length; i > 0;){
			i--;
			var dirty = dirtyObjects[i];
			var object = dirty.object;
			var old = dirty.old;
			if(object && old){
				// changed
				for(var j in old){
					if(old.hasOwnProperty(j) && object[j] !== old[j]){
						this.onSet(object, j, object[j], old[j]);
						object[j] = old[j];
					}
				}
				for(j in object){
					if(!old.hasOwnProperty(j)){
						this.onSet(object, j, object[j]);
						delete object[j];
					}
				}
			}else if(!old){
				// was an addition, remove it
				this.onDelete(object);
			}else{
				// was a deletion, we will add it back
				this.onNew(old);
			}
			delete (object || old).__isDirty;
			dirtyObjects.splice(i, 1);
		}
	},
	isDirty: function(item){
		// summary
		//		returns true if the item is marked as dirty or true if there are any dirty items
		if(!item){
			return !!this._dirtyObjects.length;
		}
		return item.__isDirty;
	},
	//Notification Support
	onNew: function(data){},
	onDelete: function(){},
	onLoad:function(){
		this.cancelLoading = false;
		this._loading = false;
		this.loaded = true;
	}
});