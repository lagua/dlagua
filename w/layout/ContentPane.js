dojo.provide("dlagua.w.layout.ContentPane");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._Container");
dojo.require("dijit._Contained");
dojo.declare("dlagua.w.layout.ContentPane",[dijit.layout.ContentPane,dijit._Container,dijit._Contained],{
	layout: function(){
		// summary:
		//		Widgets override this method to size and position their contents/children.
		//		When this is called this._contentBox is guaranteed to be set (see resize()).
		//
		//		This is called after startup(), and also when the widget's size has been
		//		changed.
		// tags:
		//		protected extension
	},
	
	_setupChild: function(/*dijit._Widget*/child){
		// summary:
		//		Common setup for initial children and children which are added after startup
		// tags:
		//		protected extension
	
		var cls = this.baseClass + "-child "
			+ (child.baseClass ? this.baseClass + "-" + child.baseClass : "");
		dojo.addClass(child.domNode, cls);
	},
	
	addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
		// Overrides _Container.addChild() to call _setupChild()
		this.inherited(arguments);
		if(this._started){
			this._setupChild(child);
		}
	},
	
	removeChild: function(/*dijit._Widget*/ child){
		// Overrides _Container.removeChild() to remove class added by _setupChild()
		var cls = this.baseClass + "-child"
				+ (child.baseClass ?
					" " + this.baseClass + "-" + child.baseClass : "");
		dojo.removeClass(child.domNode, cls);
		
		this.inherited(arguments);
	},
	
	_setHrefAttr: function(/*String|Uri*/ href){
		if(!this._hrefChanged && href==this.get("href")) return;
		this.inherited(arguments);
	}
});