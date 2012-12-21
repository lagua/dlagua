dojo.provide("dlagua.w.MenuBar");
dojo.require("dlagua.c.Subscribable");
dojo.require("dijit.MenuBar");
dojo.require("dlagua.w.MenuBarItem");
dojo.declare("dlagua.w.MenuBar",[dijit.MenuBar,dlagua.c.Subscribable],{
	store: null,
	selected:null,
	locale:"",
	rootType:"content",
	currentId:"",
	maxDepth:2,
	loading:false,
	items:{},
	_itemNodesMap:{},
	labelAttr:"title",
	localeChanged:false,// this should work with false if path is published after this widget is started 
	_lh:null,
	_bh:null,
	noDefault:false,
	idProperty:"path",
	_subscribes:[], // subscription to update the id
	rebuild:function(){
		if(this.loading) {
			if(this.localeChanged) return;
			console.log("not loaded, deferring rebuild")
			if(!this._bh) this._bh = dojo.connect(this,"onLoaded",this,this.rebuild);
			return;
		}
		if(this._bh) dojo.disconnect(this._bh);
		this._bh = null;
		this.destroyDescendants();
		this._itemNodesMap = {};
		this.items = {};
		this.containerNode.innerHTML = "";
		this.selected = null;
		var q = dojo.objectToQuery({
			locale:this.locale,
			type:this.rootType
		});
		var self = this;
		this.loading = true;
		this.store.query("?"+q,{start:0,count:24}).then(function(res){
			self._addItems(res[0].children);
		});
	},
	_loadDefault: function() {
		if(this.noDefault) return;
		// user should always see a menu item selected
		console.log("loading default",this.loading,this._lh)
		if(this.loading) {
			console.log("not loaded, deferring _loadDefault")
			if(!this._lh) this._lh = dojo.connect(this,"onLoaded",this,this._loadDefault);
			return;
		}
		if(this._lh) dojo.disconnect(this._lh);
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
		var ar = val.split("/");
		var nar = ar.slice(0,this.maxDepth);
		var truncated = (nar.length!=ar.length ? val : "");
		var currentId = truncated ? nar.join("/") : val;
		return {truncated:truncated,currentId:currentId};
	},
	_loadFromId:function(prop,oldValue,newValue){
		if(this.loading) {
			console.log("not loaded, deferring loadFromId")
			if(!this._lh) this._lh = dojo.connect(this,"onLoaded",this,this._loadFromId);
			return;
		}
		if(this._lh) dojo.disconnect(this._lh);
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
		if(this.selected) this.selected.select(false);
		this.selected = node;
		node.select(true);
		var item = dojo.mixin({},this.selected.item);
		// FIXME: dirty hack for subnav components:
		// they will set the state if i am truncated
		// BUT if there is no subnav to pick it up, nothing will happen
		if(truncated) {
			//delete item.state;
			item.__truncated = truncated;
		}
		dojo.publish("/components/"+this.id,[item]);
	},
	_addItems:function(items) {
		var cnt = 0;
		var self = this;
		var itemcount = items.length;
		for(var i=0; i<itemcount;i++) {
			var item = items[i];
			// TODO add children menu
			if(item["_ref"]) {
				var ref = item["_ref"];
				self.items[ref] = {};
				self.store.get(ref).then(function(res){
					self.items[res.id] = res;
					cnt++;
					if(cnt==itemcount) {
						self.onLoaded();
					}
				});
			} else {
				self.items[item["id"]] = item;
				cnt++;
				if(cnt==itemcount) {
					self.onLoaded();
				}
			}
		}
	},
	onLoaded:function(){
		console.log("MenuBar loaded")
		// FIXME add after load
		this.loading = false;
		for(var i in this.items) this._addItem(this.items[i]);
		if(this.localeChanged){
			this.localeChanged = false;
			this._loadDefault();
		}
	},
	_addItem: function(item) {
		var self = this;
		var mbi = new dlagua.w.MenuBarItem({
			id:item.id,
			item:item,
			label:item[this.labelAttr],
			onClick:function(){
				self.selectNode(this, false);
			}
		});
		this._itemNodesMap[item[this.idProperty]] = mbi;
		this.addChild(mbi);
	}
});
