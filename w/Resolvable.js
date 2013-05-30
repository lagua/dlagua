define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dlagua/x/json/ref"
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
						parent.__onChildLoaded = function(child,index){
							this.__childrenLoaded++;
							this[self.childrenAttr][index] = child;
							if(this.__childrenLoaded==this[self.childrenAttr].length) {
								delete this.__childrenLoaded;
								delete this.__onChildLoaded;
								if(rootcallback) rootcallback(this);
							}
						}
					}
					store.get(this[self.refAttribute]).then(function(item){
						item.__resolved = true;
						item.__parent = parent;
						callback(item,index,items);
						parent.__onChildLoaded(item,index);
					});
				}
			});
		},
		addChild: function(/*dijit/_WidgetBase*/ widget, /*int?*/ index, /*int?*/ length){
			var refNode = this.containerNode;
			var insertIndex = "last";
			if(typeof index == "number" && length > 0) {
				var children = this.getChildren();
				for(var i=0;i<children.length;i++) {
					if(children[i] && children[i].hasOwnProperty("index") && index<children[i].index) {
						refNode = children[i].domNode;
						insertIndex = "before";
						break;
					}
				}
			}
			//console.log("place",widget.id,insertIndex,refNode)
			domConstruct.place(widget.domNode, refNode, insertIndex);
			if(this._started && !widget._started){
				widget.startup();
			}
		},
		_addItem: function(item,index,items,params) {
			params = params || {};
			//console.log(item.name,index)
			var self = this;
			if(item._loadObject) {
				this._loading = true;
				item._loadObject(lang.hitch(this,this._addItem),index,items,params);
				return;
			}
			if(!this.childWidget && !params.childWidget) {
				var childWidgetType = params.childWidgetType || this.childWidgetType;
				require([childWidgetType],lang.hitch(this,function(Widget){
					params.childWidget = Widget;
					this._addItem(item,index,items,params);
				}));
				return;
			}
			if(!this._itemNodesMap) this._itemNodesMap = {};
			var children = item.children && item.children.length ? item.children : [];
			children = array.filter(children,function(child){
				return !child.hidden;
			});
			params = lang.mixin(params,{
				item:item,
				label:item[this.labelAttr] || ""
			});
			if(typeof index == "number") params.index = index;
			var Widget = params.childWidget || this.childWidget;
			delete params.childWidget;
			delete params.childWidgetType;
			var mbi = new Widget(params);
			this._itemNodesMap[item[this.idProperty]] = mbi;
			this.addChild(mbi,index,items.length);
		}
	});

});