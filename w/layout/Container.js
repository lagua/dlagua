define([
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.remove domClass.toggle
	"dojo/dom-style", // domStyle.style
	"dojo/dom-geometry",
	"dojo/_base/lang", // lang.getObject lang.hitch
	"dijit/_WidgetBase",
	"dijit/layout/_LayoutWidget",
	"dijit/layout/utils"        // layoutUtils.layoutChildren
], function(array, declare, domClass, domStyle, domGeometry, lang, _WidgetBase, _LayoutWidget, layoutUtils){

// module:
//		dlagua/w/layout/Container


	var Container = declare("dlagua.w.layout.Container", _LayoutWidget, {
		// summary:
		//		Provides layout in up to 5 regions, a mandatory center with optional borders along its 4 sides.
		// description:
		//		A Container is a box with a specified size, such as style="width: 500px; height: 500px;",
		//		that contains a child widget marked region="center" and optionally children widgets marked
		//		region equal to "top", "bottom", "leading", "trailing", "left" or "right".
		//		Children along the edges will be laid out according to width or height dimensions.  The remaining
		//		space is designated for the center region.
		//
		//		The outer size must be specified on the Container node.  Width must be specified for the sides
		//		and height for the top and bottom, respectively.  No dimensions should be specified on the center;
		//		it will fill the remaining space.  Regions named "leading" and "trailing" may be used just like
		//		"left" and "right" except that they will be reversed in right-to-left environments.
		//
		//		For complex layouts, multiple children can be specified for a single region.   In this case, the
		//		layoutPriority flag on the children determines which child is closer to the edge (low layoutPriority)
		//		and which child is closer to the center (high layoutPriority).   layoutPriority can also be used
		//		instead of the design attribute to control layout precedence of horizontal vs. vertical panes.
		//
		//		See `Container.ChildWidgetProperties` for details on the properties that can be set on
		//		children of a `Container`.
		// example:
		// |	<div data-dojo-type="dijit/layout/Container" data-dojo-props="design: 'sidebar', gutters: false"
		// |            style="width: 400px; height: 300px;">
		// |		<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region: 'top'">header text</div>
		// |		<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region: 'right', splitter: true" style="width: 200px;">table of contents</div>
		// |		<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="region: 'center'">client area</div>
		// |	</div>

		// design: String
		//		Which design is used for the layout:
		//
		//		- "headline" (default) where the top and bottom extend the full width of the container
		//		- "sidebar" where the left and right sides extend from top to bottom.
		design: "headline",

		baseClass: "dijitBorderContainerNoGutter",

		startup: function(){
			if(this._started){
				return;
			}
			array.forEach(this.getChildren(), this._setupChild, this);
			this.inherited(arguments);
		},

		_setupChild: function(/*dijit/_WidgetBase*/ child){
			// Override _LayoutWidget._setupChild().

			var region = child.region;
			// try getting a center as default
			if(!region) {
				var children = array.filter(this.getChildren(),function(child){
					return child.region == "center";
				});
				if(!children.length) region = "center";
			}
			if(region){
				this.inherited(arguments);

				domClass.add(child.domNode, this.baseClass + "Pane");

				var ltr = this.isLeftToRight();
				if(region == "leading"){
					region = ltr ? "left" : "right";
				}
				if(region == "trailing"){
					region = ltr ? "right" : "left";
				}

				child.region = region;	// TODO: technically wrong since it overwrites "trailing" with "left" etc.
			}
		},

		layout: function(){
			// Implement _LayoutWidget.layout() virtual method.
			this._layoutChildren();
		},

		addChild: function(/*dijit/_WidgetBase*/ child, /*Integer?*/ insertIndex){
			// Override _LayoutWidget.addChild().
			this.inherited(arguments);
			if(this._started){
				this.layout(); //OPT
			}
		},

		removeChild: function(/*dijit/_WidgetBase*/ child){
			// Override _LayoutWidget.removeChild().

			var region = child.region;
			this.inherited(arguments);

			if(this._started){
				this._layoutChildren();
			}
			// Clean up whatever style changes we made to the child pane.
			// Unclear how height and width should be handled.
			domClass.remove(child.domNode, this.baseClass + "Pane");
			domStyle.set(child.domNode, {
				top: "auto",
				bottom: "auto",
				left: "auto",
				right: "auto",
				position: "static"
			});
			domStyle.set(child.domNode, region == "top" || region == "bottom" ? "width" : "height", "auto");
		},
		
		resize: function(newSize, currentSize){
			// Overrides _LayoutWidget.resize().

			// resetting potential padding to 0px to provide support for 100% width/height + padding
			// TODO: this hack doesn't respect the box model and is a temporary fix
			if(!this.cs || !this.pe){
				var node = this.domNode;
				this.cs = domStyle.getComputedStyle(node);
				this.pe = domGeometry.getPadExtents(node, this.cs);
				this.pe.r = domStyle.toPixelValue(node, this.cs.paddingRight);
				this.pe.b = domStyle.toPixelValue(node, this.cs.paddingBottom);

				domStyle.set(node, "padding", "0px");
			}

			this.inherited(arguments);
		},

		_layoutChildren: function(/*String?*/ changedChildId, /*Number?*/ changedChildSize){
			// summary:
			//		This is the main routine for setting size/position of each child.
			// description:
			//		With no arguments, measures the height of top/bottom panes, the width
			//		of left/right panes, and then sizes all panes accordingly.
			//
			//		With changedRegion specified (as "left", "top", "bottom", or "right"),
			//		it changes that region's width/height to changedRegionSize and
			//		then resizes other regions that were affected.
			// changedChildId:
			//		Id of the child which should be resized because splitter was dragged.
			// changedChildSize:
			//		The new width/height (in pixels) to make specified child

			if(!this._borderBox || !this._borderBox.h){
				// We are currently hidden, or we haven't been sized by our parent yet.
				// Abort.   Someone will resize us later.
				return;
			}

			// Generate list of wrappers of my children in the order that I want layoutChildren()
			// to process them (i.e. from the outside to the inside)
			var wrappers = array.map(this.getChildren(), function(child, idx){
				return {
					pane: child,
					weight: [
						child.region == "center" ? Infinity : 0,
						child.layoutPriority,
						(this.design == "sidebar" ? 1 : -1) * (/top|bottom/.test(child.region) ? 1 : -1),
						idx
					]
				};
			}, this);
			wrappers.sort(function(a, b){
				var aw = a.weight, bw = b.weight;
				for(var i = 0; i < aw.length; i++){
					if(aw[i] != bw[i]){
						return aw[i] - bw[i];
					}
				}
				return 0;
			});

			// Make new list, combining the externally specified children with splitters and gutters
			var children = [];
			array.forEach(wrappers, function(wrapper){
				var pane = wrapper.pane;
				children.push(pane);
			});

			// Compute the box in which to lay out my children
			var dim = {
				l: this.pe.l,
				t: this.pe.t,
				w: this._borderBox.w - this.pe.w,
				h: this._borderBox.h - this.pe.h
			};

			// Layout the children, possibly changing size due to a splitter drag
			layoutUtils.layoutChildren(this.domNode, dim, children,
				changedChildId, changedChildSize);
		}

	});

	Container.ChildWidgetProperties = {
		// summary:
		//		These properties can be specified for the children of a Container.

		// region: [const] String
		//		Values: "top", "bottom", "leading", "trailing", "left", "right", "center".
		//		See the `dijit/layout/Container` description for details.
		region: '',

		// layoutPriority: [const] Number
		//		Children with a higher layoutPriority will be placed closer to the Container center,
		//		between children with a lower layoutPriority.
		layoutPriority: 0
	};

// Since any widget can be specified as a LayoutContainer child, mix it
// into the base widget class.  (This is a hack, but it's effective.)
// This is for the benefit of the parser.   Remove for 2.0.  Also, hide from doc viewer.
	lang.extend(_WidgetBase, /*===== {} || =====*/ Container.ChildWidgetProperties);

	return Container;
});
