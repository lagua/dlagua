define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-style",
	"dojo/html", // html._ContentSetter
	"dojo/when",
	"dijit/registry",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Contained"
],function(declare,lang,array,domStyle,html,when,registry,_Widget,_Templated,_Contained) {
return declare("dlagua.w.layout.ScrollableServicedPaneItem", [_Widget, _Templated, _Contained], {
	parent:null, //quickref to parent widget
	itemHeight:null,
	marginBox:null,
	parseOnLoad:true,
	baseClass:"dlaguaScrollableServicedPaneItem",
	templateString: '<div style="height:${itemHeight};opacity:0;" data-dojo-attach-point="containerNode"></div>',
	onLoad:function(){
		// you know what to do...
	},
	_setContent: function(/*String|DocumentFragment*/ cont, /*Boolean*/ isFakeContent){
		// summary:
		//		Insert the content into the container node
		// returns:
		//		Returns a Deferred promise that is resolved when the content is parsed.

		// first get rid of child widgets
		this.destroyDescendants();

		// html.set will take care of the rest of the details
		// we provide an override for the error handling to ensure the widget gets the errors
		// configure the setter instance with only the relevant widget instance properties
		// NOTE: unless we hook into attr, or provide property setters for each property,
		// we need to re-configure the ContentSetter with each use
		var setter = this._contentSetter;
		if(!(setter && setter instanceof html._ContentSetter)){
			setter = this._contentSetter = new html._ContentSetter({
				node: this.containerNode,
				_onError: lang.hitch(this, this._onError),
				onContentError: lang.hitch(this, function(e){
					// fires if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV
					var errMess = this.onContentError(e);
					try{
						this.containerNode.innerHTML = errMess;
					}catch(e){
						console.error('Fatal ' + this.id + ' could not change content due to ' + e.message, e);
					}
				})/*,
				 _onError */
			});
		}

		var setterParams = lang.mixin({
			cleanContent: this.cleanContent,
			extractContent: this.extractContent,
			parseContent: !cont.domNode && this.parseOnLoad,
			parserScope: this.parserScope,
			startup: false,
			dir: this.dir,
			lang: this.lang,
			textDir: this.textDir
		}, this._contentSetterParams || {});

		var p = setter.set((lang.isObject(cont) && cont.domNode) ? cont.domNode : cont, setterParams);

		// dojox/layout/html/_base::_ContentSetter.set() returns a Promise that indicates when everything is completed.
		// dojo/html::_ContentSetter.set() currently returns the DOMNode, but that will be changed for 2.0.
		// So, if set() returns a promise then use it, otherwise fallback to waiting on setter.parseDeferred
		var self = this;
		return when(p && p.then ? p : setter.parseDeferred, function(){
			// setter params must be pulled afresh from the ContentPane each time
			delete self._contentSetterParams;

			if(!isFakeContent){
				if(self._started){
					// Startup each top level child widget (and they will start their children, recursively)
					self._startChildren();

					// Call resize() on each of my child layout widgets,
					// or resize() on my single child layout widget...
					// either now (if I'm currently visible) or when I become visible
					self.resize();
				}
				//self._onLoadHandler(cont);
			}
		});
	},
	_startChildren: function(){
		// summary:
		//		Called when content is loaded.   Calls startup on each child widget.   Similar to ContentPane.startup()
		//		itself, but avoids marking the ContentPane itself as "restarted" (see #15581).

		// This starts all the widgets
		array.forEach(this.getChildren(), function(obj){
			if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
				obj.startup();
				obj._started = true;
			}
		});

		// And this catches stuff like dojo/dnd/Source
		if(this._contentSetter){
			array.forEach(this._contentSetter.parseResults, function(obj){
				if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
					obj.startup();
					obj._started = true;
				}
			}, this);
		}
	},
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		this._setContent(data || "");
	},
	layoutChildren: function(){
		var children = this.getChildren(),
			widget,
			i = 0;
		while(widget = children[i++]){
			if(widget.resize){
				widget.resize();
			}
		}
	},
	getParent: function(){
		if(this._beingDestroyed) return;
		if(!this.parent) this.parent = registry.getEnclosingWidget(this.domNode.parentNode.parentNode);
		return this.parent;
	},
	resize:function() {
		if(this._beingDestroyed) return;
		this.inherited(arguments);
		this.layoutChildren();
		var parent = this.getParent();
		if(parent && parent.containerNode && parent.useScrollBar) parent.showScrollBar();
	}
});

});