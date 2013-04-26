define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojox/json/ref"
],function(declare,lang,array,domConstruct,ref) {
	return declare("dlagua.w.Resolvable",[],{
		_childNodesMap:null,
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
				if(!this._childNodesMap) this._childNodesMap = [];
				for(var i=0;i<this._childNodesMap.length;i++) {
					if(this._childNodesMap[i] && index<i) {
						refNode = this._childNodesMap[i];
						insertIndex = "before";
						break;
					}
				}
			}
			console.log("place",widget.id,insertIndex,refNode)
			domConstruct.place(widget.domNode, refNode, insertIndex);
			if(typeof index == "number" && length > 0) {
				console.log("update",widget.id,insertIndex,refNode)
				this._childNodesMap[index] = widget.domNode;
				if(this._childNodesMap.length == length) {
					var reset = true;
					for(var i=0;i<this._childNodesMap.length;i++) {
						if(!this._childNodesMap[i]) reset = false;
					}
					if(reset) this._childNodesMap = [];
				}
			}
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
			if(!this.childWidget) {
				require([this.childWidgetType],lang.hitch(this,function(Widget){
					this.childWidget = Widget;
					this._addItem(item,index,items);
				}));
				return;
			}
			if(!this._itemNodesMap) this._itemNodesMap = {};
			var children = item.children && item.children.length ? item.children : [];
			children = array.filter(children,function(child){
				return !child.hidden;
			});
			var mbi = new this.childWidget({
				item:item,
				label:item[this.labelAttr] || ""
			});
			this._itemNodesMap[item[this.idProperty]] = mbi;
			this.addChild(mbi,index,items.length);
		}
	});

});