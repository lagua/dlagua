define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/io-query",
	"dojo/topic",
	"dojo/when",
	"dojo/aspect",
	"dlagua/w/Subscribable",
	"dlagua/w/Resolvable"
],function(declare,lang,array,Deferred,ioQuery,topic,when,aspect,Subscribable,Resolvable){
	return declare("dlagua.w.StatefulController",[Subscribable,Resolvable],{
		_selectedNode:null,
		locale:"en_us",
		rootType:"content",
		query:"",
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
		childrenAttr:"childorder",
		rebuild:function(forceView){
			if(this._loading) {
				if(this.localeChanged) return;
				console.log("not loaded, deferring rebuild")
				if(!this._bh) this._bh = aspect.after(this,"ready",this.rebuild);
				return;
			}
			if(this._bh) this._bh.remove();
			this._bh = null;
			this.destroyDescendants();
			this._itemNodesMap = {};
			//this.containerNode.innerHTML = "";
			this._selectedNode = null;
			this._loading = true;
			var setCurrentId = lang.hitch(this,function(root){
				var i = 0;
				if(this.currentId) {
					var car = this.currentId.split("/");
					var clast = car.pop();
					var crest = car.join("/");
					for(i=0;i<root.children.length;i++) {
						var par = root.children[i].path.split("/")
						var view = par.pop();
						var rest = par.join("/");
						if(crest==rest) {
							if(clast == view) break;
						} else if(view==forceView) break;
					}
					if(i==root.children.length) i = 0;
				}
				this.currentId = root.children[i].path;
			});
			this.getRoot().then(lang.hitch(this,function(res){
				var root = this.root = res[0];
				var children = [];
				if(root[this.childrenAttr]) {
					this.store.getChildren(root).then(lang.hitch(this,function(children){
						if(forceView) {
							setCurrentId(root);
						}
						array.forEach(children,this._addItem,this);
						this.ready();
					}));
				} else {
					array.forEach([root],this._addItem,this);
					if(forceView) {
						this.currentId = root.path;
					}
					this.ready();
				}
			}));
		},
		getRoot:function(){
			if(this.currentItem) {
				var d = new Deferred();
				d.resolve([this.currentItem]);
				return d;
			}
			if(!this.query) {
				this.query = {
					locale:this.locale,
					type:this.rootType
				};
			} else {
				this.query.locale = this.locale;
			}
			// since we have children with _refs, resolve children first
			return this.store.query(this.query,{start:0,count:100});
		},
		_loadDefault: function() {
			// user should always see a menu item selected
			console.log("loading default",this._loading,this._lh)
			if(this._loading) {
				console.log(this.id,"not loaded, deferring _loadDefault")
				if(!this._lh) this._lh = aspect.after(this,"ready",this._loadDefault);
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
			if((!this.loadOnCreation && !this.currentItem) || oldValue==newValue) return;
			if(this._loading) {
				console.log(this.id,"not loaded, deferring loadFromId")
				var args = arguments;
				if(!this._lh) this._lh = aspect.after(this,"ready",lang.hitch(this,function(){
					this._loadFromId.apply(this,args);
				}));
				return;
			}
			if(this._lh) this._lh.remove();
			this._lh = null;
			if(!this.currentId && !newValue) {
				this.ready();
				return;
			}

			// preserve original currentId for reload top level on history.back
			// skip reload if selectedItem.id==currentId AND previous not truncated OR current truncated:
			// don't republish when truncated again
			var checkOld = oldValue ? this._checkTruncated(oldValue,this.depth) : {};
			// start with depth=2
			var check = this._checkTruncated(newValue || this.currentId,this.depth);
			var currentId = check.currentId;
			var truncated = check.truncated;
			var node = this._itemNodesMap[currentId];

			var child;
			if(node && truncated && this.depth<this.maxDepth) {
				if(node.popup && node.popup._loadFromId && node.popup.depth<=this.maxDepth) {
					child = lang.hitch(node.popup,node.popup._loadFromId(prop,oldValue,newValue));
				}
				if(child) {
					// this means a selection is made, so select me too
					this.selectNode(node,truncated,this.depth);
					return child;
				}
			}
			var force = (checkOld.truncated && truncated && this._compareTruncated(checkOld.truncated,truncated));
			if(!force && this._selectedNode && this._selectedNode.item[this.idProperty]==currentId && (!checkOld.truncated || truncated)) {
				return;
			}
			console.log(this.id,"loading currentID ",currentId, truncated);
			this.selectNode(node,truncated,this.depth);
			return node;
		},
		_compareTruncated:function(oldValue,newValue){
			// this is special func to see if we came from a deeper path
			// that was partly in my data but somehow not picked by
			// sub navigation, otherwise it would have had the same depth
			var oa = oldValue.split("/");
			var na = newValue.split("/");
			var ol = oa.length;
			var nl = na.length;
			var n,o;
			// ignore truncated exceeding limit
			if(nl>this.depth+1 || nl == ol) return false;
			var np = na.slice(0,this.depth).join("/");
			var op = oa.slice(0,this.depth).join("/");
			np = na.slice(this.depth,this.depth+1);
			op = oa.slice(this.depth,this.depth+1);
			if(np==op) return false;
			return true;
		},
		_loadFromItem:function(prop,oldValue,newValue) {
			if(oldValue) {
				var same = true;
				for(var k in newValue) {
					if(newValue[k] instanceof Object || k.substr(0,2) == "__") continue;
					if(oldValue.hasOwnProperty(k) && oldValue[k] !== newValue[k]) {
						same = false;
						break;
					}
				}
				if(same) {
					console.warn("StatefulController", this.id, "escaping on same item")
					return;
				}
			}
			var view = newValue && newValue.__view;
			if(!view && !this.loadOnCreation) view = true;
			this.rebuild(view);
		},
		startup: function(){
			this.own(
				this.watch("currentItem",this._loadFromItem),
				this.watch("currentId",this._loadFromId),
				aspect.after(this,"ready",lang.hitch(this,function(){
					if(this.currentId && !this._lh) this._loadFromId("",null,this.currentId);
				})),
				this.watch("locale", function() {
					this.localeChanged = true;
					this.rebuild();
				})
			);
			this.store = lang.mixin(this.store,{
				getChildren:function(item){
					// TODO use item.children.$ref;
					var res = this.query({parent:item.id});
					if(item.childorder) {
						when(res,function(children){
							children.sort(function(a,b){
								return item.childorder.indexOf(a.id) - item.childorder.indexOf(b.id);
							});
						});
					}
					return res;
				}
			});
			if(this.loadOnCreation) {
				this.rebuild();
			}
			this.inherited(arguments);
		},
		ready:function(){
			this._loading = false;
			console.log("StatefulController",this.id,"ready")
			if(this.localeChanged){
				this.localeChanged = false;
				this._loadDefault();
			}
		}
	});
});