define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
	"dojo/Deferred",
	"dojo/promise/all",
	"dlagua/w/CollapsingTree",
	"dlagua/w/Subscribable"
],function(declare,lang,array,Deferred,all,_Tree,Subscribable) {

	function shimmedPromise(/*Deferred|Promise*/ d){
		// summary:
		//		Return a Promise based on given Deferred or Promise, with back-compat addCallback() and addErrback() shims
		//		added (TODO: remove those back-compat shims, and this method, for 2.0)

		return lang.delegate(d.promise || d, {
			addCallback: function(callback){
				this.then(callback);
			},
			addErrback: function(errback){
				this.otherwise(errback);
			}
		});
	}

var Tree = declare("dlagua.w.SearchableTree",[_Tree, Subscribable],{
	persist:false,
	search: function(lookfor, buildme, item, field, returnfield) {
		var d = new Deferred();
		var self = this;
		if(!returnfield) returnfield = field;
		var m = this.model;
		var val = item && item[field];
		var rval = item && item[returnfield];
		if(array.indexOf(buildme,rval)==-1) buildme.push(rval);
		if(val == lookfor) {
			// call childrensearched also here!
			d.resolve(buildme);
		} else {
			//console.log("lookup",item[field],val,lookfor);
				// should we get children?
				if(m.mayHaveChildren(item)) {
					m.getChildren(item,function(children){
						var len = children.length;
						if(!len) {
							if(!d.isResolved()) {
								console.warn("cancelling search");
								d.resolve(buildme);
							}
						} else {
							all(array.map(children,function(child){
								var buildmebranch = buildme.slice(0);
								return self.search(lookfor, buildmebranch, child, field, returnfield);
							})).then(function(result){
								var val = result.filter(function(_){
									return !!_;
								}).pop();
								d.resolve(val);
							})
						}
					});
				} else {
					d.resolve();
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
					if(parts.length) {
						sparts.push(parts.shift());
						var newpath = sparts.join("/");
						var last = result[result.length-1];
						var found;
						if(self._itemNodesMap[last]) found = self._itemNodesMap[last][0].item;
						if(found) {
							searchPart(newpath,found);
						} else {
							var req = self.model.store.get(last);
							var dd;
							if(req.then) {
								dd = req;
							} else {
								dd = new Deferred().resolve(req);
							}
							dd.then(function(found){
								searchPart(newpath,found);
							});
						}
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
	rebuild:function(){
		if(this.dndController && this.dndController["selectNone"]) this.dndController.selectNone();
		if(this.rootNode) {
			this.rootNode.destroyRecursive();
			this.rootNode = null;
		}
		delete this.model.root;
		this._itemNodesMap={};
		this._loadDeferred = new Deferred();
		this._load();
	},
	_setPathsAttr: function(/*Item[][]|String[][]*/ paths){
		// summary:
		//		Select the tree nodes identified by passed paths.
		// paths:
		//		Array of arrays of items or item id's
		// returns:
		//		Promise to indicate when the set is complete

		var tree = this;

		function selectPath(path, nodes){
			// Traverse path, returning Promise for node at the end of the path.
			// The next path component should be among "nodes".
			var nextPath = path.shift();
			var nextNode = array.filter(nodes, function(node){
				return node.getIdentity() == nextPath;
			})[0];
			if(!!nextNode){
				if(path.length){
					return tree._expandNode(nextNode).then(function(){
						return selectPath(path, nextNode.getChildren());
					});
				}else{
					// Successfully reached the end of this path
					return nextNode;
				}
			}else{
				throw new Tree.PathError("Could not expand path at " + nextPath);
			}
		}

		// Let any previous set("path", ...) commands complete before this one starts.
		// TODO for 2.0: make the user do this wait themselves?
		return shimmedPromise(this.pendingCommandsPromise = this.pendingCommandsPromise.always(function(){
			// We may need to wait for some nodes to expand, so setting
			// each path will involve a Deferred. We bring those deferreds
			// together with a dojo/promise/all.
			return all(array.map(paths, function(path){
				// normalize path to use identity
				path = array.map(path, function(item){
					return item && lang.isObject(item) ? tree.model.getIdentity(item) : item;
				});

				if(path.length){
					return selectPath(path, [tree.rootNode]);
				}else{
					throw new Tree.PathError("Empty path");
				}
			}));
		}).then(function setNodes(newNodes){
			// After all expansion is finished, set the selection to last element from each path
			tree.set("selectedNodes", newNodes);
			return tree.paths;
		}));
	}
});

Tree._TreeNode = _Tree._TreeNode;

return Tree;

});