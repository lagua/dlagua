dojo.provide("dlagua.w.TreeMenu");
dojo.require("dlagua.w.Tree");
dojo.require("dlagua.c.Subscribable");
dojo.require("dlagua.w.tree.TreeStoreModel");
dojo.declare("dlagua.w.TreeMenu",[dlagua.c.Subscribable,dlagua.w.Tree],{
	store: null,
	state:"",
	items:null,
	locale:"",
	rootType:"",
	rootModel:"",
	model:null,
	showRoot:false,
	openOnClick:false,
	persist:false,
	storeTarget:"",
	currentId:"",
	currentItem:null, // will be set by REST subscription
	reloadTriggerProperties:"path,locale,type,model",
	startup: function(){
		var self = this;
		this.addWatch("currentItem",this._loadFromItem);
		this.addWatch("currentId",this._loadFromId);
		this.connect(this,"onLoad",function(){
			// always try to load currentId when the tree loads
			this._loadFromId();
		});
		this.inherited(arguments);
	},
	_loadFromItem:function(prop,oldValue,newValue){
		console.log("TreeMenu loading currentItem ",this.currentItem)
		var reload;
		var n = this.currentItem;
		var o = this.model.root;
		for(var k in this.currentItem) {
			//if(k=="__truncated" || k=="__loaded") continue;
			var props = this.reloadTriggerProperties.split(",");
			if(o) {
				var reload = false;
				for(var i=0;i<props.length;i++) {
					var p = props[i];
					if(p in n && p in o && n[p]!=o[p]) {
						reload = true;
						break;
					}
				}
				if(!reload) return;
			}
		}
		console.log("TreeMenu rebuilding currentItem ",this.currentItem)
		this.model.root = dojo.clone(this.currentItem);
		this.rebuild();
	},
	destroyRecursive:function(){
		this.unwatchAll();
		this.inherited(arguments);
	},
	_load: function(){
		// summary:
		//		Initial load of the tree.
		//		Load root node (possibly hidden) and it's children.
		if(this.model._loading) {
			console.log("treemenu model not loaded!")
			this.model.cancel();
			return;
		}
		this.model.getRoot(
			dojo.hitch(this, function(item){
				if(!item) {
					this.model._loading = false;
					return;
				}
				var rn = (this.rootNode = this.tree._createTreeNode({
					item: item,
					tree: this,
					isExpandable: true,
					label: this.label || this.getLabel(item),
					indent: this.showRoot ? 0 : -1
				}));
				if(!this.showRoot){
					rn.rowNode.style.display="none";
					// if root is not visible, move tree role to the invisible
					// root node's containerNode, see #12135
					dijit.setWaiRole(this.domNode, 'presentation');
					console.log(rn)
					dijit.setWaiRole(rn.labelNode, 'presentation');
					dijit.setWaiRole(rn.containerNode, 'tree');
				}
				this.domNode.appendChild(rn.domNode);
				var identity = this.model.getIdentity(item);
				if(this._itemNodesMap[identity]){
					this._itemNodesMap[identity].push(rn);
				}else{
					this._itemNodesMap[identity] = [rn];
				}

				rn._updateLayout();		// sets "dijitTreeIsRoot" CSS classname

				// load top level children and then fire onLoad() event
				this._expandNode(rn).addCallback(dojo.hitch(this, function(){
					this._loadDeferred.callback(true);
					this.onLoad();
				}));
			}),
			function(err){
				console.error(this, ": error loading root: ", err);
			}
		);
	},
	_pubItem:function(pubitem){
		var item = {};
		var parent = pubitem.__parent;
		for(var k in pubitem) {
			if(!dojo.isObject(pubitem[k]) && !dojo.isArray(pubitem[k])) item[k] = pubitem[k];
		}
		// list/view model in submenu:
		// publish parent with item path as truncated (like in bare dlagua.app without submenu)
		// the depth needs to be of the parent item (or of nested models)
		if(parent && parent.model && item.model && parent.model==item.model) {
			var id = item.id
			var path = item.path;
			item = {};
			for(var k in parent) {
				if(!dojo.isObject(parent[k]) && !dojo.isArray(parent[k])) item[k] = parent[k];
			}
			item.__view = id;
			item.__truncated = path;
			this._truncated = false;
			console.log("treemenu publishes root")
			dojo.publish("/components/"+this.id,[item]);
			return;
		} else {
			item.__view = false;
		}
		if(this._truncated) {
			item.__truncated = this._truncated;
			this._truncated = false;
		}
		this.oldItem = item;
		console.log("treemenu publishes",item)
		dojo.publish("/components/"+this.id,[item]);
	},
	_checkTruncate:function(path){
		var depth = this.currentItem.__depth ? this.currentItem.__depth : 2;
		console.log("TreeMenu _checkTruncate",path)
		this.selectNodeByField(path,"path",true,depth-1).then(dojo.hitch(this,function(result){
			if(result) {
				if(!this.selectedItem) return;
				var item = this.selectedItem;
				var node = this.getNodesByItem(item)[0];
				if(!node) return;
				//this.onClick(item, node);
				// model is to LOAD the CONTENT from NOT the nav model!
				this.onClick(item,node);
				var tree = this;
				tree.collapseAll(node);
				if(node.isExpandable && !node.isExpanded) {
					setTimeout(function(){
						tree._expandNode(node);
					},100);
				}					
			} else {
				this._truncated = this.currentId;
				var pathar = path.split("/");
				pathar.pop();
				// is there something else to select?
				if(pathar.length>depth) {
					this._checkTruncate(pathar.join("/"));
				} else {
					this.set("path",[]);
				}
			}
		}));
	},
	_loadFromId:function(){
		// no rootItem
		if(!this.currentItem || !this.currentItem.path) return;
		this.currentId = unescape(this.currentId);
		var depth = this.currentItem.__depth ? this.currentItem.__depth : 2;
		var idar = this.currentId.split("/");
		// nothing to select
		if(idar.length<=depth) {
			this.set("path",[]);
			this.collapseAll();
			var item = {};
			for(var k in this.currentItem) {
				if(!dojo.isObject(this.currentItem[k]) && !dojo.isArray(this.currentItem[k])) item[k] = this.currentItem[k];
			}
			// FIXME this only works in same state, but may give problems there too
			if(this.state==item.state) {
				console.log("treemenu publishes root")
				delete item.__truncated;
				delete item.__view;
				dojo.publish("/components/"+this.id,[item]);
			}
			return;
		}
		idar = idar.slice(0,depth);
		var pathar = this.currentItem.path.split("/").slice(0,depth);
		// wrong rootItem
		if(idar.join("/")!=pathar.join("/")) {
			this.set("path",[]);
			return;
		}
		console.log("TreeMenu _loadFromId",this.currentId)
		if(!this.model.loaded) {
			console.log("not loaded, deferring loadFromId")
			if(!this._lh) this._lh = dojo.connect(this.model,"onLoad",this,this._loadFromId);
			return;
		}
		if(this._lh) dojo.disconnect(this._lh);
		this._lh = null;
		var self = this;
		this._checkTruncate(this.currentId);
	},
	_createTreeNode: function(args) {
        return new dlagua.w._TreeMenuNode(args);
    },
    onClick:function(item,node) {
		if(item.type=="link") {
			location.href=item.url;
		} else {
			this._pubItem(item);
		}
	}
});


dojo.provide("dlagua.w._TreeMenuNode");
dojo.declare("dlagua.w._TreeMenuNode",[dlagua.w._TreeNode],{
	templateString: dojo.cache("dlagua.w", "templates/TreeMenuNode.html"),
	 _updateItemClasses: function(item){
		// summary:
		//		Set appropriate CSS classes for icon and label dom node
		//		(used to allow for item updates to change respective CSS)
		// tags:
		//		private
		//this._applyClassAndStyle(item, "icon", "Icon");
		this._applyClassAndStyle(item, "label", "Label");
		this._applyClassAndStyle(item, "row", "Row");
	},
	_setExpando:function(){
	}
});
