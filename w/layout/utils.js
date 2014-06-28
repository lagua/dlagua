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
		
		calcRegion:function(region,dim,changedRegionId,changedRegionSize){
			// set positions/sizes
			// - if auto and fits ignore everything else (including min)
			// - else if not fits, update curProg until 5
			// if 5 and fits (it will) reset curProg to 1 so
			// lower prios will be fitted again
			var progs = {
				0:"none",
				1:"auto",
				2:"fixed",
				3:"min",
				4:"tile",
				5:"hide"
			}
			var children = region.children;
			var pos = region.id;
			var maxWidth = region.maxWidth;
			var maxHeight = region.maxHeight;
			var len = children.length;
			var fit = true;
			var tileSize = this.tileSize;
			children.forEach(function(child,i){
				if(!fit) return;
				var elm = child.domNode;

				domClass.add(elm, "dijitAlign" + capitalize(pos));

				// Size adjustments to make to this child widget
				var sizeSetting = {};

				// Check for optional size adjustment due to splitter drag (height adjustment for top/bottom align
				// panes and width adjustment for left/right align panes.
				if(changedRegionId && changedRegionId == child.id){
					sizeSetting[pos == "top" || pos == "bottom" ? "h" : "w"] = changedRegionSize;
				}
				//if(i===0 && pos=="right") region.dim.l = dim.l + dim.w - max;
				var prog = child._prog || 0;
				if(prog<5 && child._prog<5 && child._display != elm.style.display) elm.style.display = child._display;
				//var nextprog = i<len-1 ? children[i+1]._prog : 0;
				// set size && adjust record of remaining space.
				// note that setting the width of a <div> may affect its height.
				if(pos == "top" || pos == "bottom"){
					/*sizeSetting.w = dim.w;
					size(child, sizeSetting);
					dim.h -= child.h;
					if(pos == "top"){
						dim.t += child.h;
					}else{
						elm.style.top = dim.t + dim.h + "px";
					}*/
					
					var refit = (prog && prog===region.prog-2);
					if(refit) {
						region.prog = prog;
						region.row = 0;
						region.dim = lang.mixin({},dim);
						region.dim.l = region.dim.t = 0;
						region.dim.h = maxHeight;
					}
					if(!prog || refit) {
						var w = region.maxWidth;
						if(region.prog<2) {
							if(child._dim.width) {
								// fixed!
								if(child._dim.width<=w) {
									//console.log(pos,i,"fixed!")
									prog = 2;
									sizeSetting.w = child._dim.width;
								} else {
									// nofit!
									// - if minHeight: prog will be 3
									// - else if tile prog will be 4
									// - else prog will be 5
									fit = false;
								}
							} else {
								// else auto-width
								//console.log(pos,i,"auto!")
								prog = 1;
								sizeSetting.w = w;
							}
						}
						/*} else if(fit && region.prog<3 && child._dim.minWidth) {
							// min
							if(child._dim.minWidth<=w) {
								//console.log(pos,i,"min!")
								prog = 3;
								sizeSetting.w = w;
							} else {
								// nofit!
								fit = false;
							}
						} else if(fit && region.prog<4 && tileSize) {
							// tilesize
							if(tileSize<=w) {
								//console.log(pos,i,"tile!")
								prog = 4;
								sizeSetting.w = sizeSetting.h = tileSize;
							} else {
								// nofit!
								fit = false;
							}
						} else if(fit && region.prog<5) {
							// hide
							//console.log(pos,i,"hide!")
							elm.style.display = "none";
							prog = 5;
							sizeSetting.w = sizeSetting.h = 0;
							region.prog = 1;
						}
						if(!("h" in sizeSetting)) {
							// it wasn't set by tileSize or hide, so set it
							if(child._dim.height || child._dim.minHeight) {
								// fixed/min width
								sizeSetting.h = Math.max(child._dim.height,child._dim.minHeight);
							} else {
								// auto
								sizeSetting.h = child.h;
							}
						}*/
						sizeSetting.t = dim.t + (pos=="bottom" ? dim.h - region.dim.h : 0)+ region.dim.t;
						sizeSetting.l = dim.l + region.dim.l;
						/*if(fit) {
							// don't update if more may fit into max
							// modify region dim
							if(region.dim.t+sizeSetting.h<=region.dim.h){
								// it fits, so update left
								region.dim.t += sizeSetting.h;
								region.row = Math.max(region.row,sizeSetting.w);
							} else {
								// no fit, so fill height to what is currently set in this "row"
								fit = false;
								region.dim.l = 0;
								region.dim.h -= region.row;
								region.dim.t += region.row;
								region.row = 0;
							}
						} else {
							region.prog++;
						}*/
						if(fit) {
							size(child, sizeSetting);
							child._prog = prog;
							// if last element update global dim
							if(!refit && i===len-1) {
								// modify global dim
								dim.h -= maxHeight;
								if(pos=="top") dim.t += maxHeight;
							}
						} else {
							child._prog = 0;
						}
					}
					
				}else if(pos == "left" || pos == "right"){
					// check if elm has height
					// check if elmHeight <= dim.h, if not refit
					// if fits, size to elm height and try to fit below
					// prog: either it wasn't fitted or it was fitted, but must refit (prog<2<curProg)
					// if curProg >=5 stop
					var refit = (prog && prog===region.prog-2);
					if(refit) {
						region.prog = prog;
						region.row = 0;
						region.dim = lang.mixin({},dim);
						region.dim.l = region.dim.t = 0;
						region.dim.w = maxWidth;
					}
					if(!prog || refit) {
						var h = region.dim.h;
						if(region.prog<2) {
							if(child._dim.height) {
								// fixed!
								if(child._dim.height<=h) {
									//console.log(pos,i,"fixed!")
									prog = 2;
									sizeSetting.h = child._dim.height;
								} else {
									// nofit!
									// - if minHeight: prog will be 3
									// - else if tile prog will be 4
									// - else prog will be 5
									fit = false;
								}
							} else {
								// else auto-height
								//console.log(pos,i,"auto!")
								prog = 1;
								sizeSetting.h = h;
							}
						} else if(fit && region.prog<3 && child._dim.minHeight) {
							// min
							if(child._dim.minHeight<=h) {
								//console.log(pos,i,"min!")
								prog = 3;
								sizeSetting.h = h;
							} else {
								// nofit!
								fit = false;
							}
						} else if(fit && region.prog<4 && tileSize) {
							// tilesize
							if(tileSize<=h) {
								//console.log(pos,i,"tile!")
								prog = 4;
								sizeSetting.w = sizeSetting.h = tileSize;
							} else {
								// nofit!
								fit = false;
							}
						} else if(fit && region.prog<5) {
							// hide
							//console.log(pos,i,"hide!")
							elm.style.display = "none";
							prog = 5;
							sizeSetting.w = sizeSetting.h = 0;
							region.prog = 1;
						}
						if(!("w" in sizeSetting)) {
							// it wasn't set by tileSize or hide, so set it
							if(child._dim.width || child._dim.minWidth) {
								// fixed/min width
								sizeSetting.w = Math.max(child._dim.width,child._dim.minWidth);
							} else {
								// auto
								sizeSetting.w = child.w;
							}
						}
						sizeSetting.l = dim.l + (pos=="right" ? dim.w - region.dim.w : 0)+ region.dim.l;
						sizeSetting.t = dim.t + region.dim.t;
						if(fit) {
							// don't update if more may fit into max
							// modify region dim
							if(region.dim.l+sizeSetting.w<=region.dim.w){
								// it fits, so update left
								region.dim.l += sizeSetting.w;
								region.row = Math.max(region.row,sizeSetting.h);
							} else {
								// no fit, so fill height to what is currently set in this "row"
								fit = false;
								region.dim.l = 0;
								region.dim.h -= region.row;
								region.dim.t += region.row;
								region.row = 0;
							}
						} else {
							region.prog++;
						}
						if(fit) {
							size(child, sizeSetting);
							child._prog = prog;
							// if last element update global dim
							if(!refit && i===len-1) {
								// modify global dim
								dim.w -= maxWidth;
								if(pos=="left") dim.l += maxWidth;
							}
						} else {
							child._prog = 0;
						}
					}
				}else if(pos == "client" || pos == "center"){
					size(child, dim);
				}
			});
			return fit;
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
				child._prog = 0;
				if(!regions[pos]) regions[pos] = {id:pos,children:[],prog:1,row:0};
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
			for(var region in regions){
				regions[region].children = array.filter(children,function(_){
					return _.region == region;
				});
				// get max width/height
				var prop = (region == "top" || region == "bottom") ? "height" : "width";
				var max = 0;
				array.forEach(regions[region].children, function(child,i){
					// retrieve all dimension styles
					// store the first time
					var elm = child.domNode;
					// TODO: when will this change?
					// - dynamic CSS: map elements to resolvedContext
					// - setStyle: extend dom-style to emit set+elm (extend _WidgetBase to include domNode getters/setters)
					if(!child._dim) {
						var style = elm.style;
						// set elem to upper left corner of unused space; may move it later
						elm.style.left = dim.l+"px";
						elm.style.top = dim.t+"px";
						elm.style.position = "absolute";
						var id = elm.id;
						var classes = elm.className.split(" ");
						var rules = rulestore.query("#"+id);
						classes.forEach(function(_){
							rules = rules.concat(rulestore.query("."+_));
						});
						child._dim = {
							"width":0,
							"height":0,
							"minWidth":0,
							"maxWidth":0,
							"minHeight":0,
							"maxHeight":0
						};
						var cs = domStyle.getComputedStyle(elm);
						var me = domGeometry.getMarginExtents(elm, cs);
						var pb = domGeometry.getPadBorderExtents(elm, cs);
						var cb = {w:me.w + pb.w,h:me.h+pb.h};
						for(var k in child._dim) {
							if(style[k]) {
								var mb = k.match(/w/i) ? cb.w : cb.h;
								var s = domStyle.toPixelValue(elm,style[k]);
								child._dim[k] = s + (s ? mb : 0);
							}
						}
						//children[i]._dim = child._dim;
						child.w = domStyle.toPixelValue(elm,cs.w)+cb.w;
						child.h = domStyle.toPixelValue(elm,cs.h)+cb.h;
						child._display = cs["display"];
					}
					max = Math.max(max,Math.max(child._dim[prop],Math.max(child._dim["min"+capitalize(prop)],child[prop.charAt(0)])));
				});
				regions[region].maxWidth = prop == "width" ? max : dim.h;
				regions[region].maxHeight = prop == "height" ? max : dim.w;
				regions[region].dim = lang.mixin({},dim);
				regions[region].dim.t = 0;
				regions[region].dim.l = 0;
				regions[region].dim[prop.charAt(0)] = regions[region]["max"+capitalize(prop)];
				var fit = null;
				var safe = 6*children.length;
				while(!fit && safe>0) {
					fit = utils.calcRegion(regions[region],dim,changedRegionId, changedRegionSize);
					safe--;
				}
			}
		}
	};

	lang.setObject("dlagua.w.layout.utils", utils);	// remove for 2.0

	return utils;
});
