define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojox/json/ref",
	"dlagua/w/MenuItem",
	"dlagua/w/MenuBarItem",
],function(declare,lang,array,ref,MenuItem,MenuBarItem) {
	return declare("dlagua.w.Resolvable",[],{
		resolve:function(data,store){
			if(!data || !store) return;
			ref.refAttribute = "_ref";
			var self = this;
			return ref.resolveJson(data,{
				loader:function(callback){
					var parent = this.__parent;
					if(!parent.__onChildLoaded) {
						parent.__childrenLoaded = 0;
						parent.__onChildLoaded = function(){
							this.__childrenLoaded++;
							if(this.__childrenLoaded==this.children.length) {
								delete this.__childrenLoaded;
								delete this.__onChildLoaded;
								self._loading = false;
								self.onReady();
							}
						}
					}
					store.get(this["_ref"]).then(function(item){
						console.log("ref res")
						item._resolved = true;
						item.__parent = parent;
				        callback(item);
				        parent.__onChildLoaded();
					});
				}
			});
		},
		_addItem: function(item) {
			var self = this;
			if(item._loadObject) {
				this._loading = true;
				item._loadObject(lang.hitch(this,this._addItem));
				return;
			}
			if(!this._itemNodesMap) this._itemNodesMap = {};
			var mbi;
			var children = item.children && item.children.length ? item.children : [];
			children = array.filter(children,function(child){
				return !child.hidden;
			});
			var Widget = this.declaredClass == "dlagua.w.MenuBar" ? MenuBarItem : MenuItem;
			mbi = new Widget({
				item:item,
				label:item[this.labelAttr] || ""
			});
			this._itemNodesMap[item[this.idProperty]] = mbi;
			this.addChild(mbi);
		}
	});

});