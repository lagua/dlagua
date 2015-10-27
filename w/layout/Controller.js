define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic",
	"dijit/_Contained",
	"dijit/layout/ScrollingTabController",
	"dojo/store/JsonRest",
	"dlagua/x/json/ref",
	"dlagua/w/Subscribable"
], function(declare, lang, array, topic, _Contained, ScrollingTabController,JsonRest,ref,Subscribable){
	var Controller = declare("dlagua.w.layout.Controller", [_Contained, ScrollingTabController,Subscribable], {
		// summary:
		//		Set of buttons to select a page in a `dijit/layout/StackContainer`
		// description:
		//		Monitors the specified StackContainer, and whenever a page is
		//		added, deleted, or selected, updates itself accordingly.
		"class":"dijitTabContainerTop-tabs",
		childrenAttr:"children",
		refAttribute:"$ref",
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
						parent._resolved = true;
						item.__parent = parent;
						callback(item,index,items);
						parent.__onChildLoaded();
					});
				}
			});
		},
		constructor: function(mixin){
			this.containerId = mixin.id;
			this.inherited(arguments);
		},
		
		onAddChild: function(/*dijit/_WidgetBase*/ page, /*Integer?*/ insertIndex){
			// summary:
			//		Called whenever a page is added to the container.
			//		Create button corresponding to the page.
			// tags:
			//		private

			// create an instance of the button widget
			// (remove typeof buttonWidget == string support in 2.0)
			var Cls = lang.isString(this.buttonWidget) ? lang.getObject(this.buttonWidget) : this.buttonWidget;
			var button = new Cls({
				id: this.id + "_" + page.id,
				name: this.id + "_" + page.id, // note: must match id used in pane2button()
				label: page.title,
				disabled: page.disabled,
				ownerDocument: this.ownerDocument,
				dir: page.dir,
				lang: page.lang,
				textDir: page.textDir || "ltr",
				showLabel: true,
				iconClass: page.iconClass,
				closeButton: false,
				title: page.title,
				page: page
			});

			this.addChild(button, insertIndex);
			page.controlButton = button;	// this value might be overwritten if two tabs point to same container
			if(!this._currentChild){
				// If this is the first child then StackContainer will soon publish that it's selected,
				// but before that StackContainer calls layout(), and before layout() is called the
				// StackController needs to have the proper height... which means that the button needs
				// to be marked as selected now.   See test_TabContainer_CSS.html for test.
				this.onSelectChild(page);
				this.selectChild(page);
			}
		},
		
		selectChild:function(c){
			topic.publish("/components/"+this.id,c);
		},
		
		closeChild:function(){
			
		},
		
		removeChild:function(){
			
		},
		
		startup: function() {
			/*
			this.toolbar = new dtabbed.widget.Toolbar({
				region:"bottom",
				id:"toolbar",
				target:this
			});
			this.addChild(this.toolbar);
			dojo.addClass(this.toolbar.domNode,"shadow");
			dojo.forEach(this.getChildren(), this._setupChild, this);
			*/
			this.own(
				this.watch("currentItem",lang.hitch(this,this._rebuild)),
				this.watch("currentId",lang.hitch(this,this._loadFromId))
			);
			this.inherited(arguments);
		},
		_loadFromId:function(){
			
		},
		_rebuild:function(prop,oldVal,newVal){
			this.destroyDescendants();
			children = newVal.children;
			if(children && children.length && !newVal._resolved) {
				var data = this.resolve(this.currentItem,new JsonRest({target:"model/Page/"}),lang.hitch(this,function(root){
					this._rebuild("",null,root);
				}));
				array.forEach(newVal.children,function(c,i,all){ c._loadObject(function(item){
					children[i] = item;
				}) });
				return;
			}
			children = array.filter(children,function(c){
				return !c.hidden;
			});
			if(!children.length) {
				children = [newVal];
			}
			this.onStartup({children:children});
			this.getParent().layout();
		}
	});

	return Controller;
});
