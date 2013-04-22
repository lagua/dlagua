define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojox/json/ref",
	"dlagua/w/MenuItem",
	"dlagua/w/MenuBarItem",
],function(declare,lang,array,domConstruct,ref,MenuItem,MenuBarItem) {
	var _childNodesMap = [];
	return declare("dlagua.w.Resolvable",[],{
		childrenAttr:"children",
		refAttribute:"_ref",
		resolve:function(data,store,rootcallback){
			if(!data || !store) return;
			ref.refAttribute = this.refAttribute;
			var self = this;
			return ref.resolveJson(data,{
				loader:function(callback,index,items){
					var parent = this.__parent;
					if(!parent.__onChildLoaded) {
						parent.__childrenLoaded = 0;
						parent.__onChildLoaded = function(){
							this.__childrenLoaded++;
							if(this.__childrenLoaded==this[self.childrenAttr].length) {
								delete this.__childrenLoaded;
								delete this.__onChildLoaded;
								if(rootcallback) rootcallback(this);
							}
						}
					}
					store.get(this[self.refAttribute]).then(function(item){
						item._resolved = true;
						item.__parent = parent;
						callback(item,index,items);
						parent.__onChildLoaded();
					});
				}
			});
		},
		addChild: function(/*dijit/_WidgetBase*/ widget, /*int?*/ index, /*int?*/ length){
			var refNode = this.containerNode;
			var insertIndex = "last";
			if(typeof index == "number" && length > 0) {
				if(_childNodesMap.length>0) {
					for(var i=index;i<_childNodesMap.length;i++) {
						if(_childNodesMap[i]) {
							refNode = _childNodesMap[i];
							insertIndex = "before";
							break;
						}
					}
				}
				_childNodesMap[index] = widget.domNode;
				if(index===length-1) {
					_childNodesMap = [];
				}
			}
			domConstruct.place(widget.domNode, refNode, insertIndex);
			
			if(this._started && !widget._started){
				widget.startup();
			}
		},
		_addItem: function(item,index,items) {
			console.log(item.name,index)
			var self = this;
			if(item._loadObject) {
				this._loading = true;
				item._loadObject(lang.hitch(this,this._addItem),index,items);
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
			this.addChild(mbi,index,items.length);
		}
	});

});