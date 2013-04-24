define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/io-query",
	"dojo/topic",
	"dojo/aspect",
	"dlagua/c/Subscribable",
	"dlagua/w/Resolvable"
],function(declare,lang,array,Deferred,ioQuery,topic,aspect,Subscribable,Resolvable){
	return declare("dlagua.w.StatefulController",[Subscribable,Resolvable],{
		_selectedNode:null,
		locale:"en_us",
		rootType:"content",
		currentId:"",
		maxDepth:2,
		_loading:false,
		_itemNodesMap:null,
		labelAttr:"title",
		localeChanged:false,// this should work with false if path is published after this widget is started 
		_lh:null,
		_bh:null,
		idProperty:"path",
		rebuild:function(){
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
				var data = this.resolve(res[0],this.store,lang.hitch(this,function(root){
					this._loading = false;
					this.onReady();
				}));
				array.forEach(data.children,this._addItem,this);
			}));
		},
		getRoot:function(){
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
				console.log("not loaded, deferring _loadDefault")
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
				if(!this._lh) this._lh = aspect.after(this,"onReady",lang.hitch(this,function(){
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
			var checkOld = oldValue ? this._checkTruncated(oldValue) : {};
			var check = this._checkTruncated(this.currentId);
			var currentId = check.currentId;
			var truncated = check.truncated;
			if(this._selectedNode && this._selectedNode.item[this.idProperty]==currentId && (!checkOld.truncated || truncated)) return;
			console.log("MenuBar loading currentID ",currentId, truncated);
			this.selectNode(this._itemNodesMap[currentId],truncated);
		},
		startup: function(){
			this.own(
				this.watch("currentId",this._loadFromId),
				this.watch("locale", function() {
					this.localeChanged = true;
					this.rebuild();
				}),
				aspect.after(this,"onReady",lang.hitch(this,this._loadFromId))
			);
			this.rebuild();
			this.inherited(arguments);
		},
		onReady:function(){
			console.log("StatefulController ready")
			if(this.localeChanged){
				this.localeChanged = false;
				this._loadDefault();
			}
		}
	});
});