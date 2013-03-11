define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic",
	"dijit/_Contained",
	"dijit/layout/ScrollingTabController",
	"dlagua/c/Subscribable"
], function(declare, lang, array, topic, _Contained, ScrollingTabController,Subscribable){
	var Controller = declare("dlagua.w.layout.Controller", [_Contained, ScrollingTabController,Subscribable], {
		// summary:
		//		Set of buttons to select a page in a `dijit/layout/StackContainer`
		// description:
		//		Monitors the specified StackContainer, and whenever a page is
		//		added, deleted, or selected, updates itself accordingly.
		"class":"dijitTabContainerTop-tabs",
		
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
		_rebuild:function(){
			this.destroyDescendants();
			children = this.currentItem.children;
			children = array.filter(children,function(c){
				return !c.hidden;
			});
			if(!children.length) {
				children = [this.currentItem];
			}
			this.onStartup({children:children});
			this.getParent().layout();
		}
	});

	return Controller;
});
