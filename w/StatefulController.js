define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/io-query",
	"dojo/topic",
	"dojo/aspect",
	"dlagua/w/Subscribable",
	"dlagua/w/Resolvable"
],function(declare,lang,array,Deferred,ioQuery,topic,aspect,Subscribable,Resolvable){
	return declare("dlagua.w.StatefulController",[Subscribable,Resolvable],{
		_selectedNode:null,
		locale:"en_us",
		rootType:"content",
		currentId:"",
		currentItem:null,
		loadOnCreation:true,
		maxDepth:2,
		_loading:false,
		_itemNodesMap:null,
		labelAttr:"title",
		localeChanged:false,// this should work with false if path is published after this widget is started 
		_lh:null,
		_bh:null,
		idProperty:"path",
		rebuild:function(forceView){
			if(this._loading) {
				if(this.localeChanged) return;
				console.log("not loaded, deferring rebuild")
				if(!this._bh) this._bh = aspect.after(this,"onReady",this.rebuild);
				return;
			}
			if(this._bh) this._bh.remove();
			this._bh = null;
			this.destroyDescendants();
			this._itemNodesMap = {};
			this.containerNode.innerHTML = "";
			this._selectedNode = null;
			this._loading = true;
			this.getRoot().then(lang.hitch(this,function(res){
				var root = this.root = res[0];
				var children = [];
				var childrenResolved = false;
				var loadRoot = false;
				if(root[this.childrenAttr] && root[this.childrenAttr].length) {
					var data = this.resolve(root,this.store,lang.hitch(this,function(root){
						if(forceView) {
							for(i=0;i<root.children.length;i++) {
								var view = root.children[i].path.split("/").pop();
								if(view==forceView) break;
							}
							if(i==root.children.length) i=0;
							this.currentId = root.children[i].path;
						}
						this.onReady();
					}));
					children = data.children;
					childrenResolved = array.every(children,function(_){ return !_._loadObject || _.__resolved==true });
				} else {
					loadRoot = true;
					children = [root];
				}
				array.forEach(children,this._addItem,this);
				if(loadRoot || childrenResolved) {
					if(forceView) {
						if(loadRoot) {
							this.currentId = root.path;
						} else {
							for(i=0;i<root.children.length;i++) {
								var view = root.children[i].path.split("/").pop();
								if(view==forceView) break;
							}
							if(i==root.children.length) i=0;
							this.currentId = root.children[i].path;
						}
					}
					this.onReady();
				}
			}));
		},
		getRoot:function(){
			if(this.currentItem) {
				var d = new Deferred();
				d.resolve([this.currentItem]);
				return d;
			}
			var q = ioQuery.objectToQuery({
				locale:this.locale,
				type:this.rootType
			});
			// since we have children with _refs, resolve children first
			return this.store.query("?"+q,{start:0,count:100});
		},
		_loadDefault: function() {
			// user should always see a menu item selected
			console.log("loading default",this._loading,this._lh)
			if(this._loading) {
				console.log(this.id,"not loaded, deferring _loadDefault")
				if(!this._lh) this._lh = aspect.after(this,"onReady",this._loadDefault);
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
		_checkTruncated:function(val,depth){
			if(!val) return {};
			var ar = [];
			if(typeof val == "string") {
				ar = val.split("/");
			} else {
				return {};
			}
			var nar = ar.slice(0,depth);
			var truncated = (nar.length!=ar.length ? val : "");
			var currentId = truncated ? nar.join("/") : val;
			return {truncated:truncated,currentId:currentId};
		},
		_loadFromId:function(prop,oldValue,newValue){
			if(!this.loadOnCreation && !this.currentItem) return;
			if(this._loading) {
				console.log(this.id,"not loaded, deferring loadFromId")
				var args = arguments;
				if(!this._lh) this._lh = aspect.after(this,"onReady",lang.hitch(this,function(){
					this._loadFromId.apply(this,args);
				}));
				return;
			}
			if(this._lh) this._lh.remove();
			this._lh = null;
			if(!this.currentId && !newValue) {
				this.onReady();
				return;
			}
			// preserve original currentId for reload top level on history.back
			// skip reload if selectedItem.id==currentId AND previous not truncated OR current truncated:
			// don't republish when truncated again
			var checkOld = oldValue ? this._checkTruncated(oldValue,this.depth) : {};
			// start with depth=2
			var check = this._checkTruncated(this.currentId || newValue,this.depth);
			var currentId = check.currentId;
			var truncated = check.truncated;
			var node = this._itemNodesMap[currentId];
			if(!node || (this._selectedNode && this._selectedNode.item[this.idProperty]==currentId && (!checkOld.truncated || truncated))) {
				var children = this.getChildren();
				var t = array.some(children,function(c){
					if(c.popup && c.popup._loadFromId) {
						return c.popup._loadFromId(prop,oldValue,newValue);
					}
				});
				//if(!t) topic.publish("/components/"+this.id,this.root);
				return;
			}
			console.log(this.id,"loading currentID ",currentId, truncated);
			this.selectNode(node,truncated,this.depth);
			return true;
		},
		_loadFromItem:function(prop,oldVal,newVal) {
			var view = newVal && newVal.__view;
			if(!view && !this.loadOnCreation) view = true;
			this.rebuild(view);
		},
		startup: function(){
			this.own(
				this.watch("currentItem",this._loadFromItem),
				this.watch("currentId",this._loadFromId),
				aspect.after(this,"onReady",lang.hitch(this,function(){
					if(this.currentId && !this._lh) this._loadFromId("",null,this.currentId);
				})),
				this.watch("locale", function() {
					this.localeChanged = true;
					this.rebuild();
				})
			);
			if(this.loadOnCreation) {
				this.rebuild();
			}
			this.inherited(arguments);
		},
		onReady:function(){
			this._loading = false;
			console.log("StatefulController",this.id,"ready")
			if(this.localeChanged){
				this.localeChanged = false;
				this._loadDefault();
			}
		}
	});
});