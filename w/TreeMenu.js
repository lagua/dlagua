define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/aspect",
    "dojo/topic",
	"dlagua/w/SearchableTree",
	"dlagua/w/Subscribable",
	"dojo/text!dlagua/w/templates/TreeMenuNode.html"
],function(declare,lang,array,aspect,topic,_Tree,Subscribable,nodeTemplate) {

	var TreeNode = declare("dlagua.w._TreeMenuNode",[_Tree._TreeNode],{
		templateString: nodeTemplate,
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

	var Tree = declare("dlagua.w.TreeMenu",[_Tree,Subscribable],{
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
			this.own(
				this.watch("currentItem",this._loadFromItem),
				this.watch("currentId",this._loadFromId),
				aspect.after(this,"onLoad",lang.hitch(this,function(){
					// always try to load currentId when the tree loads
					this._loadFromId();
				}))
			);
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
			this.model.root = lang.mixin({},this.currentItem);
			this.rebuild();
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
				lang.hitch(this, function(item){
					if(!item) {
						this.model._loading = false;
						return;
					}
					var rn = (this.rootNode = this.tree._createTreeNode({
						item: item,
						tree: this,
						isExpandable: true,
						label: this.label || this.getLabel(item),
						textDir: this.textDir,
						indent: this.showRoot ? 0 : -1
					}));
					
					if(!this.showRoot){
						rn.rowNode.style.display="none";
						// if root is not visible, move tree role to the invisible
						// root node's containerNode, see #12135
						this.domNode.setAttribute("role", "presentation");
						this.domNode.removeAttribute("aria-expanded");
						this.domNode.removeAttribute("aria-multiselectable");
						
						// move the aria-label or aria-labelledby to the element with the role
						if(this["aria-label"]){
							rn.containerNode.setAttribute("aria-label", this["aria-label"]);
							this.domNode.removeAttribute("aria-label");
						}else if(this["aria-labelledby"]){
							rn.containerNode.setAttribute("aria-labelledby", this["aria-labelledby"]);
							this.domNode.removeAttribute("aria-labelledby");
						}
						rn.labelNode.setAttribute("role", "presentation");
						rn.containerNode.setAttribute("role", "tree");
						rn.containerNode.setAttribute("aria-expanded","true");
						rn.containerNode.setAttribute("aria-multiselectable", !this.dndController.singular);
					}else{
						this.domNode.setAttribute("aria-multiselectable", !this.dndController.singular);
						this.rootLoadingIndicator.style.display = "none";
					}
					
					this.containerNode.appendChild(rn.domNode);
					var identity = this.model.getIdentity(item);
					if(this._itemNodesMap[identity]){
						this._itemNodesMap[identity].push(rn);
					}else{
						this._itemNodesMap[identity] = [rn];
					}

					rn._updateLayout();		// sets "dijitTreeIsRoot" CSS classname

					// Load top level children, and if persist==true, all nodes that were previously opened
					this._expandNode(rn).then(lang.hitch(this, function(){
						// Then, select the nodes that were selected last time, or
						// the ones specified by params.paths[].

						this.rootLoadingIndicator.style.display = "none";
						this.expandChildrenDeferred.resolve(true);
					}));
				}),
				lang.hitch(this, function(err){
					console.error(this, ": error loading root: ", err);
				})
			);
		},
		getIconClass:function(){
		},
		getRowClass:function(item,opened){
			if(item.hidden) return "dijitTreeRowHidden";
		},
		_pubItem:function(pubitem){
			var item = lang.mixin({},pubitem);
			if(this.oldItem) {
				var same = true;
				for(var k in item) {
					if(item[k] instanceof Object || k.substr(0,2) == "__") continue;
					if(this.oldItem[k] && item[k] !== this.oldItem[k]) {
						same = false;
						break;
					}
				}
				if(same) return;
			}
			this.oldItem = item;
			if(this._truncated) {
				item.__truncated = this._truncated;
				this._truncated = false;
			}
			console.log("treemenu publishes",item)
			topic.publish("/components/"+this.id,item);
		},
		_checkTruncate:function(path){
			var depth = this.currentItem.__depth ? this.currentItem.__depth : 2;
			console.log("TreeMenu _checkTruncate",path);
			this.selectNodeByField(path,"path",true,depth-1).then(lang.hitch(this,function(result){
				if(result) {
					if(!this.selectedItem) return;
					var item = this.selectedItem;
					var node = item && this.getNodesByItem(item)[0];
					if(!node) return;
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
				this.oldItem = null;
				this.set("path",[]);
				this.collapseAll();
				var item = {};
				for(var k in this.currentItem) {
					if(!lang.isObject(this.currentItem[k]) && !lang.isArray(this.currentItem[k])) item[k] = this.currentItem[k];
				}
				// FIXME this only works in same state, but may give problems there too
				if(this.state==item.state) {
					console.log("treemenu publishes root")
					delete item.__truncated;
					delete item.__view;
					topic.publish("/components/"+this.id,item);
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
			/*if(!this.model.loaded) {
				console.log("not loaded, deferring loadFromId")
				if(!this._lh) this._lh = aspect.after(this.model,"onLoad",lang.hitch(this,this._loadFromId));
				return;
			}
			if(this._lh) this._lh.remove();
			this._lh = null;
			var self = this;
			*/
			this._checkTruncate(this.currentId);
		},
		_createTreeNode: function(args) {
	        return new TreeNode(args);
	    },
	    onClick:function(item,node) {
			if(item.type=="link") {
				location.href=item.url;
			} else {
				this._pubItem(item);
			}
		}
	});
	
	Tree._TreeNode = TreeNode;
	
	return Tree;

});