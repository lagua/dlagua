define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/io-query",
	"dojo/topic",
	"dojo/aspect",
	"dijit/MenuBar",
	"dlagua/w/MenuItem",
	"dlagua/w/PopupMenuItem",
	"dlagua/w/MenuBarItem",
	"dijit/DropDownMenu",
	"dlagua/w/PopupMenuBarItem",
	"dlagua/c/Subscribable"
],function(declare,lang,array,Deferred,ioQuery,topic,aspect,MenuBar,MenuItem,PopupMenuItem,MenuBarItem,DropDownMenu,PopupMenuBarItem,Subscribable){
	return declare("dlagua.w.MenuBar",[MenuBar,Subscribable],{
		store: null,
		selected:null,
		locale:"",
		rootType:"content",
		currentId:"",
		maxDepth:2,
		_loading:false,
		_itemNodesMap:{},
		labelAttr:"title",
		localeChanged:false,// this should work with false if path is published after this widget is started 
		_lh:null,
		_bh:null,
		idProperty:"path",
		onItemHover: function(item){
	        if(!this.isActive){
	            this._markActive();
	        }
	        this.inherited(arguments);
	    },
	    onItemClick: function(item){
	    	this.selectNode(item);
	        this.inherited(arguments);
	    },
		rebuild:function(){
			if(this._loading) {
				if(this.localeChanged) return;
				console.log("not loaded, deferring rebuild")
				if(!this._bh) this._bh = aspect.after(this,"onLoaded",this.rebuild);
				return;
			}
			if(this._bh) this._bh.remove();
			this._bh = null;
			this.destroyDescendants();
			this._itemNodesMap = {};
			this.containerNode.innerHTML = "";
			this.selected = null;
			var q = ioQuery.objectToQuery({
				locale:this.locale,
				type:this.rootType
			});
			var self = this;
			this._loading = true;
			var d = new Deferred();
			// since we have children with _refs, resolve children first
			this.store.query("?"+q,{start:0,count:100}).then(function(res){
				if(res && res.length) {
					self._resolveRecursive(res[0]).then(function(root){
						d.resolve(root);
					});
				} else {
					d.reject();
				}
			});
			d.then(function(root){
				self._loading = false;
				array.forEach(root.children,lang.hitch(self,self._addItem));
			});
		},
		_loadDefault: function() {
			// user should always see a menu item selected
			console.log("loading default",this._loading,this._lh)
			if(this._loading) {
				console.log("not loaded, deferring _loadDefault")
				if(!this._lh) this._lh = aspect.after(this,"onLoaded",this._loadDefault);
				return;
			}
			if(this._lh) this._lh.remove();
			this._lh = null;
			var curId;
			if(this.currentId) {
				var ar = this.currentId.split("/");
				var nar = ar.slice(0,this.maxDepth);
				curId = nar.join("/");
			}
			if(curId && (curId in this._itemNodesMap)) return this._loadFromId();
			var i;
			for(i in this._itemNodesMap) break;
			// TODO: add defaultProperty or sumptin
			var newId = this._itemNodesMap[i].item[this.idProperty];
			console.log(newId)
			if(this.currentId == newId) {
				this._loadFromId();
			} else {
				this.set("currentId",newId);
			}
		},
		_checkTruncated:function(val){
			if(!val) return {};
			var ar = [];
			try {
				ar = val.split("/");
			} catch(e) {
				return {};
			}
			var nar = ar.slice(0,this.maxDepth);
			var truncated = (nar.length!=ar.length ? val : "");
			var currentId = truncated ? nar.join("/") : val;
			return {truncated:truncated,currentId:currentId};
		},
		_loadFromId:function(prop,oldValue,newValue){
			if(this._loading) {
				console.log("not loaded, deferring loadFromId")
				var args = arguments;
				if(!this._lh) this._lh = aspect.after(this,"onLoaded",lang.hitch(this,function(){
					this._loadFromId(args);
				}));
				return;
			}
			if(this._lh) this._lh.remove();
			this._lh = null;
			if(!this.currentId) return;
			// preserve original currentId for reload top level on history.back
			// skip reload if selectedItem.id==currentId AND previous not truncated OR current truncated:
			// don't republish when truncated again
			var checkOld = this._checkTruncated(oldValue);
			var check = this._checkTruncated(this.currentId);
			var currentId = check.currentId;
			var truncated = check.truncated;
			if(this.selected && this.selected.item[this.idProperty]==currentId && (!checkOld.truncated || truncated)) return;
			console.log("MenuBar loading currentID ",currentId, truncated);
			this.selectNode(this._itemNodesMap[currentId],truncated);
		},
		startup: function(){
			this.watch("currentId",this._loadFromId);
			this.watch("locale", function() {
				this.localeChanged = true;
				this.rebuild();
			});
			console.log("menubar startup")
			this.rebuild();
			this.inherited(arguments);
		},
		selectNode:function(node,truncated){
			console.log("MenuBar selectNode ",truncated);
			//if(this.selected==node) return;
			var p;
			if(this.selected) {
				this.selected.set("selected",false);
				if(this.selected.depth===0) {
					p = this.selected.getParent();
					p.from_item.set("selected",false);
				}
			}
			this.selected = node;
			node.set("selected",true);
			if(node.depth===0) {
				p = node.getParent();
				p.from_item.set("selected",true);
			}
			var item = lang.mixin({},this.selected.item);
			// FIXME: dirty hack for subnav components:
			// they will set the state if i am truncated
			// BUT if there is no subnav to pick it up, nothing will happen
			if(truncated) {
				//delete item.state;
				item.__truncated = truncated;
			}
			topic.publish("/components/"+this.id,item);
		},
		onReady:function(){
			console.log("MenuBar ready")
			if(this.localeChanged){
				this.localeChanged = false;
				this._loadDefault();
			}
		},
		_resolveRecursive:function(item,depth,d){
			// simple resolving strategy for maxDepth
			var maxDepth = this.maxRecursiveDepth || this.maxDepth;
			if(!d) d = new Deferred();
			depth = depth || 0;
			if(maxDepth == depth) {
				item.__parent.__onChildLoaded();
				return d;
			}
			var len = item.children ? item.children.length : 0;
			if(!len) {
				item.__parent.__onChildLoaded();
				return d;
			} else {
				item.__onChildLoaded = function(){
					this.__childrenLoaded = this.__childrenLoaded || 0;
					this.__childrenLoaded++;
					if(this.__childrenLoaded==this.children.length) {
						delete this.__childrenLoaded;
						delete this.__onChildLoaded;
						if(!this.__parent) {
							d.resolve(this);
						} else {
							this.__parent.__onChildLoaded();
						}
					}
				}
				array.forEach(item.children,function(child){
					if(child._ref) {
						var ref = child["_ref"];
						this.store.get(ref).then(lang.hitch(this,function(resolved){
							resolved.__parent = item;
							for(var i=0;i<item.children.length;i++) {
								if(item.children[i]._ref==ref) {
									item.children[i] = resolved;
								}
							}
							this._resolveRecursive(resolved,depth+1,d);
						}));
					} else {
						child.__parent = item;
						this._resolveRecursive(child,depth+1,d);
					}
				},this);
			}
			return d;
		},
		_addItemRecursive:function(item,depth){
			depth = depth || 0;
			var self = this;
			// add the dropdown menu
			var dd = new DropDownMenu({});
			array.forEach(item.children,function(child){
				if(this.maxDepth>depth+3 && child.children && child.children.length) {
					dd.addChild(new PopupMenuItem({
						item:child,
						label:child[this.labelAttr],
						popup:this._addItemRecursive(child,depth+1)
					}));
				} else {
					dd.addChild(new MenuItem({
						item:child,
						depth:depth,
						label:child[this.labelAttr],
						onClick:function(){
							self.selectNode(this, false);
						}
					}));
				}
			},this);
			return dd;
		},
		_addItem: function(item) {
			var self = this;
			var mbi;
			if(this.maxDepth>2 && item.children && item.children.length) {
				mbi = new PopupMenuBarItem({
					item:item,
					label:item[this.labelAttr],
					onClick:function(){
						alert(0)
					},
					popup:this._addItemRecursive(item)
				});
			} else {
				mbi = new MenuBarItem({
					item:item,
					label:item[this.labelAttr],
					onClick:function(){
						self.selectNode(this, false);
					}
				});
			}
			this._itemNodesMap[item[this.idProperty]] = mbi;
			this.addChild(mbi);
		}
	});
});