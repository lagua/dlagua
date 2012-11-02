dojo.provide("dlagua.w.Tree");

dojo.require("dlagua.c.Subscribable");
dojo.require("dijit.Tree");

dojo.declare("dlagua.w.Tree",[dlagua.c.Subscribable, dijit.Tree],{
	persist:false,
	_connections:[],
	_found:null,
	search: function(lookfor, buildme, item, field, returnfield, d) {
		if(d===undefined) {
			d = new dojo.Deferred();
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
		if(dojo.indexOf(buildme,rval)==-1) buildme.push(rval);
		if(val == lookfor) {
			this._found = item;
			// call childrensearched also here!
			if(item.__parent && item.__parent.__onChildrenSearched) {
				item.__parent.__onChildrenSearched();
			}
			d.callback(buildme);
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
									if(!this.__parent && !self._found) d.callback();
								}
							}
						};
						dojo.forEach(children,function(child){
							var buildmebranch = buildme.slice(0);
							self.search(lookfor, buildmebranch, child, field, returnfield, d);
						});
					}
				});
			} else {
				if(item.__parent && item.__parent.__onChildrenSearched) {
					item.__parent.__onChildrenSearched();
				} else {
					// FIXME: is this a problem
					if(!d.results) d.callback();
				}
			}
		}
		return d;
	},
	searchPartial:function(code,buildme,item,field,returnfield,minDepth){
		var d = new dojo.Deferred();
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
						d.callback(result);
					}
				} else {
					d.callback();
				}
			});
		}
		if(len) {
			searchPart(sparts.join("/"),item);
		} else {
			d.callback();
		}
		return d;
	},
	// custom tree selection function
	selectNodeByField: function(code,field,partial,minDepth) {
		var d = new dojo.Deferred();
		if(code==undefined) {
			d.callback();
			return d;
		}
		var buildme = [];
		var sd;
		if(partial) {
			sd = this.searchPartial(code,buildme,this.model.root,field,"id",minDepth);
		} else {
			sd = this.search(code, buildme, this.model.root, field, "id");
		}
		sd.then(dojo.hitch(this,function(result){
			if(result && result.length > 0) {
				this.set("path",result).then(function(res){
					d.callback(res[0]);
				});
			} else {
				d.callback();
			}
		}));
		return d;
	},
	// dojo tree extension to collapse all others on node select
	// does not work on plus/minus buttons
	collapseAll: function(exclude){ 
		var me = this;
		var parentNode = (exclude ? exclude.getParent() : this.rootNode);
		if(!parentNode) return;
		var exid = exclude ? exclude.id : null;
		function collapse(node) {
			// never collapse root node, otherwise hides whole tree !
			if(node.id != parentNode.id && node.id != exid) {
				try{
					me._collapseNode(node);
				} catch(err) {
					console.warn(err);
				}
			}
			var childBranches = dojo.filter(node.getChildren() || [], function(node) {
				return node.isExpanded;
			});
			var defs = dojo.map(childBranches, collapse);
		}
		return collapse(parentNode);
	},
	expandFirst: function(node) {
		var me = this;
		function expand(node) {
			me._expandNode(node);
			var childBranches = dojo.filter(node.getChildren() || [], function(node) {
				return node.isExpandable;
			});
			var def = new dojo.Deferred();
			var defs = dojo.map(childBranches, expand);
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
		this._loadDeferred = new dojo.Deferred();
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
		return new dlagua.w._TreeNode(args);
	}
});

dojo.provide("dlagua.w._TreeNode");
dojo.declare("dlagua.w._TreeNode",[dijit._TreeNode],{
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
