define([
	"dojo/_base/array",
	"dojo/_base/declare", // declare
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/_base/lang",
	"dijit/_WidgetBase",
	"dijit/_Container",
	"dijit/_Contained"
	//"dijit/layout/_LayoutWidget",
	//"./utils" // layoutUtils.layoutChildren
], function(array, declare, domClass, domStyle, lang, _Widget, _Container, _Contained/*, _LayoutWidget, layoutUtils*/){

	// module:
	//		dijit/layout/LayoutContainer

	var Container = declare("dlagua.w.layout.Container", [_WidgetBase, _Container, _Contained], {
		baseClass: "dlaguaLayoutContainer",
		layout: function(){
			//layoutUtils.layoutChildren(this.domNode, this._contentBox, this._getOrderedChildren());
		},
		// Cancel _WidgetBase's _setTitleAttr because we don't want the title property (used to specify
		// tab labels) to be set as an attribute on this.domNode... otherwise a tooltip shows up over the
		// entire widget.
		_setTitleAttr: null,

		buildRendering: function(){
			this.inherited(arguments);
			console.log(this.domNode)
			//domClass.add(this.domNode, "dijitContainer");
		},

		startup: function(){
			// summary:
			//		Called after all the widgets have been instantiated and their
			//		dom nodes have been inserted somewhere under <body>.
			//
			//		Widgets should override this method to do any initialization
			//		dependent on other widgets existing, and then call
			//		this superclass method to finish things off.
			//
			//		startup() in subclasses shouldn't do anything
			//		size related because the size of the widget hasn't been set yet.

			if(this._started){ return; }

			// Need to call inherited first - so that child widgets get started
			// up correctly
			this.inherited(arguments);

		},

		resize: function(changeSize, resultSize){

			// Callback for widget to adjust size of its children
			this.layout();
		},


		_setupChild: function(/*dijit/_WidgetBase*/child){
			// summary:
			//		Common setup for initial children and children which are added after startup
			// tags:
			//		protected extension

			var cls = this.baseClass + "-child "
				+ (child.baseClass ? this.baseClass + "-" + child.baseClass : "");
			domClass.add(child.domNode, cls);
		},

		addChild: function(/*dijit/_WidgetBase*/ child, /*Integer?*/ insertIndex){
			// Overrides _Container.addChild() to call _setupChild()
			this.inherited(arguments);
			if(this._started){
				this._setupChild(child);
			}
		},

		removeChild: function(/*dijit/_WidgetBase*/ child){
			// Overrides _Container.removeChild() to remove class added by _setupChild()
			var cls = this.baseClass + "-child"
					+ (child.baseClass ?
						" " + this.baseClass + "-" + child.baseClass : "");
			domClass.remove(child.domNode, cls);

			this.inherited(arguments);
		}

	});

	return Container;
});
