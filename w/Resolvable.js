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
			return ref.resolveJson(data,{
				loader:function(callback){
					store.get(this["_ref"]).then(function(item){
						item._resolved = true;
				        callback(item);
					});
				}
			});
		},
		_addItem: function(item) {
			var self = this;
			if(item._loadObject) {
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