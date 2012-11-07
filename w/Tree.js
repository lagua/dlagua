define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
	"dojo/Deferred",
	"dijit/Tree",
	"dlagua/c/Subscribable"
],function(declare,lang,array,Deferred,_Tree,Subscribable) {

var TreeNode = declare("dlagua.w._TreeNode",[_Tree._TreeNode],{
	supressEvents:false,
	_onClick: function(evt){
		// summary:
		//		Handler for onclick event on a node
		// tags:
		//		private
		if(this.supressEvents) return;
		this.tree._onClick(this, evt);
		this.tree.collapseAll(this);
		// wait for collapsing (me=tree)
		var self = this;
		console.log(this)
		if(this.isExpandable) {
			if(!this.isExpanded) {
				setTimeout(function(){
					self.tree._expandNode(self);
				},100);
			}
		}
	}
});

var Tree = declare("dlagua.w.Tree",[_Tree, Subscribable],{
	persist:false,
	_connections:[],
	_found:null,
	search: function(lookfor, buildme, item, field, returnfield, d) {
		if(d===undefined) {
			d = new Deferred();
			// new search resets found
			this._found = null;
		}
		if(!d) return;
		if(this._found) {
			if(item.__parent && item.__parent.__onChildrenSearched) {
				item.__parent.__onChildrenSearched();
			}
			return d;
		}
		var self = this;
		if(!returnfield) returnfield = field;
		var m = this.model;
		var val = m.getValue(item,field);
		var rval = m.getValue(item,returnfield);
		if(array.indexOf(buildme,rval)==-1) buildme.push(rval);
		if(val == lookfor) {
			this._found = item;
			// call childrensearched also here!
			if(item.__parent && item.__parent.__onChildrenSearched) {
				item.__parent.__onChildrenSearched();
			}
			d.resolve(buildme);
		} else {
			//console.log("lookup",item[field],val,lookfor);
			// should we get children?
			if(m.mayHaveChildren(item)) {
				m.getChildren(item,function(children){
					var len = children.length;
					if(!len || self._found) {
						// where there siblings to item? wait for them to finish
						if(item.__parent && item.__parent.__onChildrenSearched) {
							item.__parent.__onChildrenSearched();
						}
					} else {
						item.__onChildrenSearched = function(){
							var len = this.children.length;
							if(!self._found){
								if(!this.__childrenSearched) this.__childrenSearched = 0;
								this.__childrenSearched++;
							}
							if(this.__childrenSearched==len || self._found) {
								console.log("all children searched",this)
								delete this.__childrenSearched;
								delete this.__onChildrenSearched;
								if(this.__parent && this.__parent.__onChildrenSearched) {
									this.__parent.__onChildrenSearched();
								} else {
									// no parent, it must be root
									if(!this.__parent && !self._found) d.resolve();
								}
							}
						};
						array.forEach(children,function(child){
							var buildmebranch = buildme.slice(0);
							self.search(lookfor, buildmebranch, child, field, returnfield, d);
						});
					}
				});
			} else {
				if(item.__parent && item.__parent.__onChildrenSearched) {
					item.__parent.__onChildrenSearched();
				} else {
					// FIXME how to do this properly?
					if(!d.results) d.resolve();
				}
			}
		}
		return d;
	},
	searchPartial:function(code,buildme,item,field,returnfield,minDepth){
		var d = new Deferred();
		if(!minDepth) minDepth = 0;
		var parts = code.split("/");
		var len = parts.length;
		var sparts = parts.splice(0,minDepth+1);
		var self = this;
		function searchPart(part,target){
			self.search(part, buildme, target, field, returnfield).then(function(result){
				if(result) {
					var found = self._found;
					if(parts.length && found) {
						sparts.push(parts.shift());
						searchPart(sparts.join("/"),found)
					} else {
						console.log(result)
						d.resolve(result);
					}
				} else {
					d.resolve();
				}
			});
		}
		if(len) {
			searchPart(sparts.join("/"),item);
		} else {
			d.resolve();
		}
		return d;
	},
	// custom tree selection function
	selectNodeByField: function(code,field,partial,minDepth) {
		var d = new Deferred();
		if(code==undefined) {
			d.resolve();
			return d;
		}
		var buildme = [];
		var sd;
		if(partial) {
			sd = this.searchPartial(code,buildme,this.model.root,field,"id",minDepth);
		} else {
			sd = this.search(code, buildme, this.model.root, field, "id");
		}
		sd.then(lang.hitch(this,function(result){
			if(result && result.length > 0) {
				this.set("path",result).then(lang.hitch(this,function(){
					var path = this.get("path");
					d.resolve(path.length);
				}),function(){
					// this onError should be called
					d.resolve();
				});
			} else {
				d.resolve();
			}
		}));
		return d;
	},
	collapseAll: function(exclude){
		// summary:
		//		Collapse all nodes in the tree
		// returns:
		//		Deferred that fires when all nodes have collapsed
		var _this = this;
		
		var parentNode = (exclude ? exclude.getParent() : (_this.showRoot ? this.rootNode : null));

		function collapse(node){
			var def = new Deferred();
			def.label = "collapseAllDeferred";

			// Collapse children first
			var childBranches = array.filter(node.getChildren() || [], function(node){
					return node.isExpandable && node!=exclude;
				}),
				defs = array.map(childBranches, collapse);

			// And when all those recursive calls finish, collapse myself, unless I'm the invisible root node,
			// in which case collapseAll() is finished
			new DeferredList(defs).then(function(){
				if(!node.isExpanded || (node == _this.rootNode && !_this.showRoot) || node==parentNode || node==exclude){
					def.resolve(true);
				}else{
					_this._collapseNode(node).then(function(){
						// When node has collapsed, signal that call is finished
						def.resolve(true);
					});
				}
			});


			return def;
		}

		return collapse(this.rootNode);
	},
	expandFirst: function(node) {
		var me = this;
		function expand(node) {
			me._expandNode(node);
			var childBranches = array.filter(node.getChildren() || [], function(node) {
				return node.isExpandable;
			});
			var def = new Deferred();
			var defs = array.map(childBranches, expand);
		}
		return expand(node);
	},
	rebuild:function(){
		if(this.dndController && this.dndController["selectNone"]) this.dndController.selectNone();
		if(this.rootNode) {
			this.rootNode.destroyRecursive();
			this.rootNode = null;
		}
		if(this.model.loaded) this.model.loaded = false;
		this._itemNodesMap={};
		this._loadDeferred = new Deferred();
		this._load();
	},
	_createTreeNode: function(/*Object*/ args){
		// summary:
		//		creates a TreeNode
		// description:
		//		Developers can override this method to define their own TreeNode class;
		//		However it will probably be removed in a future release in favor of a way
		//		of just specifying a widget for the label, rather than one that contains
		//		the children too.
		return new TreeNode(args);
	}
});

Tree._TreeNode = TreeNode;
return Tree;

});
