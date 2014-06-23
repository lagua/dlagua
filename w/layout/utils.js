define([
	"dojo/_base/declare",
	"dojo/_base/lang", // lang.mixin, lang.setObject
	"dojo/_base/array", // array.filter array.forEach
	"dojo/dom-class", // domClass.add domClass.remove
	"dojo/dom-geometry", // domGeometry.marginBox
	"dojo/dom-style", // domStyle.getComputedStyle
	"dcssstore/CssRules",
	"dcssstore/_PatternMixin",
	"dcssstore/_QueryMixin"
], function(declare,lang,array, domClass, domGeometry, domStyle,CssRules,_PatternMixin,_QueryMixin){

	// module:
	//		dijit/layout/utils

	function capitalize(word){
		return word.substring(0,1).toUpperCase() + word.substring(1);
	}

	function size(widget, dim){
		// size the child
		var newSize = widget.resize ? widget.resize(dim) : domGeometry.setMarginBox(widget.domNode, dim);

		// record child's size
		if(newSize){
			// if the child returned it's new size then use that
			lang.mixin(widget, newSize);
		}else{
			// otherwise, call getMarginBox(), but favor our own numbers when we have them.
			// the browser lies sometimes
			lang.mixin(widget, domGeometry.getMarginBox(widget.domNode));
			lang.mixin(widget, dim);
		}
	}
	
	var rulestore = new declare([CssRules,_PatternMixin,_QueryMixin])();
	rulestore.open(); // not going to care if it isn't loaded

	var utils = {
		// summary:
		//		Utility functions for doing layout

		marginBox2contentBox: function(/*DomNode*/ node, /*Object*/ mb){
			// summary:
			//		Given the margin-box size of a node, return its content box size.
			//		Functions like domGeometry.contentBox() but is more reliable since it doesn't have
			//		to wait for the browser to compute sizes.
			var cs = domStyle.getComputedStyle(node);
			var me = domGeometry.getMarginExtents(node, cs);
			var pb = domGeometry.getPadBorderExtents(node, cs);
			return {
				l: domStyle.toPixelValue(node, cs.paddingLeft),
				t: domStyle.toPixelValue(node, cs.paddingTop),
				w: mb.w - (me.w + pb.w),
				h: mb.h - (me.h + pb.h)
			};
		},
		
		calcRegion:function(children,dim,max,changedRegionId,changedRegionSize){
			// set positions/sizes
			var progs = {
				0:"none",
				1:"default",
				2:"fixed",
				3:"minmax",
				4:"tile",
				5:"hide"
			}
			var len = children.length;
			var fit = true;
			array.forEach(children, function(child,i){
				var elm = child.domNode,
					pos = child.region;

				// set elem to upper left corner of unused space; may move it later
				var elmStyle = elm.style;
				elmStyle.left = dim.l+"px";
				elmStyle.top = dim.t+"px";
				elmStyle.position = "absolute";

				domClass.add(elm, "dijitAlign" + capitalize(pos));

				// Size adjustments to make to this child widget
				var sizeSetting = {};

				// Check for optional size adjustment due to splitter drag (height adjustment for top/bottom align
				// panes and width adjustment for left/right align panes.
				if(changedRegionId && changedRegionId == child.id){
					sizeSetting[child.region == "top" || child.region == "bottom" ? "h" : "w"] = changedRegionSize;
				}
				
				var prog = child._prog || 0;
				
				var nextprog = i<len-1 ? children[i+1]._prog : 0;
				// set size && adjust record of remaining space.
				// note that setting the width of a <div> may affect its height.
				if(pos == "top" || pos == "bottom"){
					sizeSetting.w = dim.w;
					size(child, sizeSetting);
					dim.h -= child.h;
					if(pos == "top"){
						dim.t += child.h;
					}else{
						elmStyle.top = dim.t + dim.h + "px";
					}
				}else if(pos == "left" || pos == "right"){
					if(prog<nextprog) {
						// what to do?
						prog++;
					}
					console.log("prog",prog)
					// check if elm has height
					// check if elmHeight <= dim.h, if not refit
					// if fits, size to elm height and try to fit below
					if(child._dim.height) {
						this._prog = 2;
						if(child._dim.height<dim.h) {
							// fit, my prog will be 2
							sizeSetting.h = child._dim.height;
						} else {
							// nofit!
							// - if minHeight: prog will be 3
							// - else if tile prog will be 4
							// - else prog will be 5
							fit = false;
							return;
						}
					} else {
						// else auto-height
						sizeSetting.h = dim.h;
					}
					size(child, sizeSetting);
					dim.w -= child.w;
					if(pos == "left"){
						// don't update if more may fit:
						// - into largest width
						// - when (min/max-)height fits
						// - when tileSize fits
						if(len>1) {
							
						}
						dim.l += child.w;
					}
					if(pos == "right"){
						elmStyle.left = dim.l + dim.w + "px";
					}
				}else if(pos == "client" || pos == "center"){
					size(child, dim);
				}
			});
			return fit ? dim : false;
		},


		layoutChildren: function(/*DomNode*/ container, /*Object*/ dim, /*Widget[]*/ children,
				/*String?*/ changedRegionId, /*Number?*/ changedRegionSize){
			// summary:
			//		Layout a bunch of child dom nodes within a parent dom node
			// container:
			//		parent node
			// dim:
			//		{l, t, w, h} object specifying dimensions of container into which to place children
			// children:
			//		An array of Widgets or at least objects containing:
			//
			//		- domNode: pointer to DOM node to position
			//		- region or layoutAlign: position to place DOM node
			//		- resize(): (optional) method to set size of node
			//		- id: (optional) Id of widgets, referenced from resize object, below.
			//
			//		The widgets in this array should be ordered according to how they should be laid out
			//		(each element will be processed in order, and take up as much remaining space as needed),
			//		with the center widget last.
			// changedRegionId:
			//		If specified, the slider for the region with the specified id has been dragged, and thus
			//		the region's height or width should be adjusted according to changedRegionSize
			// changedRegionSize:
			//		See changedRegionId.

			// copy dim because we are going to modify it
			dim = lang.mixin({}, dim);
			
			domClass.add(container, "dijitLayoutContainer");

			// Move "client" elements to the end of the array for layout.  a11y dictates that the author
			// needs to be able to put them in the document in tab-order, but this algorithm requires that
			// client be last.    TODO: remove for 2.0, all dijit client code already sends children as last item.
			children = array.filter(children, function(item){ return item.region != "center" && item.layoutAlign != "client"; })
				.concat(array.filter(children, function(item){ return item.region == "center" || item.layoutAlign == "client"; }));
			
			// group children by region
			var regions = {};
			
			children = array.map(children,function(child){
				var pos = (child.region || child.layoutAlign);
				if(!pos){
					throw new Error("No region setting for " + child.id);
				}
				if(pos == "leading"){
					pos = child.isLeftToRight() ? "left" : "right";
				}
				if(pos == "trailing"){
					pos = child.isLeftToRight() ? "right" : "left";
				}
				child.region = pos;
				if(!regions[pos]) regions[pos] = [];
				return child;
			});
			
			// TODO
			// - loop over regions
			// per region:
			// - get max width/height
			// - get isLeftToRight (to see on which side to fit)
			// - loop over children to fit (may require multiple passes), where:
			// - order by prio
			// - fit into max size
			// - allow filling if no max-size is set
			// - if !fits retry with:
			// - min-size
			// - tileSize
			// - if still not fits, hide smart
			console.log(dim)
			for(var region in regions){
				regions[region] = array.filter(children,function(_){
					return _.region == region;
				});
			//}
			//for(var region in regions){
				// get max width/height
				var prop = (region == "top" || region == "bottom") ? "height" : "width";
				var val = 0;
				array.forEach(regions[region], function(child,i){
					// retrieve all dimension styles
					// store the first time
					var elm = child.domNode;
					// TODO: when will this change?
					// - dynamic CSS: map elements to resolvedContext
					// - setStyle: extend dom-style to emit set+elm (extend _WidgetBase to include domNode getters/setters)
					if(!child._dim) {
						var style = elm.style;
						console.log(style)
						var id = elm.id;
						var classes = elm.className.split(" ");
						var rules = rulestore.query("#"+id);
						classes.forEach(function(_){
							rules = rules.concat(rulestore.query("."+_));
						});
						console.log(rules);
						child._dim = {
							"width":"",
							"height":"",
							"minWidth":"",
							"maxWidth":"",
							"minHeight":"",
							"maxHeight":""
						};
						for(var k in child._dim) {
							child._dim[k] = parseInt(style[k].replace("px",""),10);
						}
						children[i]._dim = child._dim;
					}
					val = Math.max(val,Math.max(child._dim[prop],child._dim["min"+capitalize(prop)]));
				});
				// don't update dim when nofit
				var fit = null;
				var safe = 6*children.length;
				while(!fit && safe>0) {
					fit = utils.calcRegion(regions[region],dim,val,changedRegionId, changedRegionSize);
					safe--;
				}
				dim = fit;
			}
		}
	};

	lang.setObject("dlagua.w.layout.utils", utils);	// remove for 2.0

	return utils;
});
