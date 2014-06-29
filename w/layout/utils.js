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
	
	function swap(A,x,y) {
		A[x] = A.splice(y, 1, A[x])[0];
		return A;
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
		
		calcRegion:function(region,dim,changedRegionId,changedRegionSize,tileSize,allowHide){
			// set positions/sizes
			// - if auto and fits ignore everything else (including min)
			// - else if not fits, update curProg until 5
			// if 5 and fits (it will) reset curProg to 1 so
			// lower prios will be fitted again
			// progs
			//	0: none
			//	1: auto
			//	2: fixed
			//	3: min
			//	4: tile
			//	5: hide
			//	6: forced auto
			var children = region.children;
			var pos = region.id;
			var maxWidth = region.maxWidth;
			var maxHeight = region.maxHeight;
			var len = children.length;
			var fit = true;
			children.forEach(function(child,i){
				if(!fit) return;
				tileSize = child.tileSize || tileSize;
				allowHide = child.allowHide || allowHide;
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
				// check against css values, use calculated values!
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
							if(child._chk.width) {
								// fixed!
								if(child._dim.w<=w) {
									//console.log(pos,i,"fixed!")
									prog = 2;
									sizeSetting.w = child._dim.w;
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
						} else if(fit && region.prog<3 && child._chk.minWidth) {
							// min
							if(child._dim.minW<=w) {
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
						} else if(fit && allowHide && region.prog<5) {
							// hide
							//console.log(pos,i,"hide!")
							elm.style.display = "none";
							prog = 5;
							sizeSetting.w = sizeSetting.h = 0;
						} else if(fit) {
							prog = 6;
							sizeSetting.w = w;
						}
						if(!("h" in sizeSetting)) {
							// it wasn't set by tileSize or hide, so set it
							if(child._chk.height || child._chk.minHeight) {
								// fixed/min width
								sizeSetting.h = Math.max(child._dim.h,child._dim.minH);
							} else {
								// auto
								sizeSetting.h = child._dim.h;
							}
						}
						child.t = sizeSetting.t = dim.t + region.dim.t;
						sizeSetting.l = dim.l + region.dim.l;
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
								dim.h -= maxHeight + region.dim.t;
								if(pos=="top") dim.t += maxHeight + region.dim.t;
								if(pos=="bottom") {
									children.forEach(function(child){
										child.domNode.style.top = dim.h+child.t+"px"
									});
								}
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
							if(child._chk.height) {
								// fixed!
								if(child._dim.h<=h) {
									//console.log(pos,i,"fixed!")
									prog = 2;
									sizeSetting.h = child._dim.h;
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
						} else if(fit && region.prog<3 && child._chk.minHeight) {
							// min
							if(child._dim.minH<=h) {
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
						} else if(fit && allowHide && region.prog<5) {
							// hide
							//console.log(pos,i,"hide!")
							prog = 5;
							sizeSetting.w = sizeSetting.h = 0;
						} else if(fit && region.prog<6) {
							prog = 6;
							sizeSetting.h = h;
						}
						if(!("w" in sizeSetting)) {
							// it wasn't set by tileSize or hide, so set it
							if(child._chk.width || child._chk.minWidth) {
								// fixed/min width
								sizeSetting.w = Math.max(child._dim.w,child._dim.minW);
							} else {
								// auto
								sizeSetting.w = child._dim.w;
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
				/*String?*/ changedRegionId, /*Number?*/ changedRegionSize,design,tileSize,allowHide){
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
			
			
			// default = headline
			var rs = ["top","bottom","left","right","center"];
			if(design=="sidebar") {
				rs = swap(swap(rs,0,2),1,3);
			}
			// group children by region
			var regions = {};
			
			for(var i=0;i<rs.length;i++){
				regions[rs[i]] = {id:rs[i],children:[],prog:1,row:0};
			}
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
				//if(!regions[pos]) regions[pos] = {id:pos,children:[],prog:1,row:0};
				return child;
			});
			// - loop over regions
			// per region:
			// - get max width/height
			// - loop over children to fit (may require multiple passes), where:
			// - 1: fit into max size if dimensions in css
			// - 2: else allow auto-fill like dijit LayoutContainer
			// - if 1 not fits retry with:
			// - min-size
			// - tileSize
			// - if still not fits, hide (TODO: hide smart)
			for(var region in regions){
				regions[region].children = array.filter(children,function(_){
					return _.region == region;
				});
				var prop = (region == "top" || region == "bottom") ? "height" : "width";
				var props = ["width","height","minWidth","minHeight"];
				var sprops = ["w","h","minW","minH"];
				var max = 0;
				array.forEach(regions[region].children, function(child){
					// retrieve all dimension styles
					// store the first time
					// get max width/height (region prop) based on calculated dimensions
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
						// we only want to know if these properties were set anywhere in the CSS
						// when a percentage is set use it to recalc the w/h based on dim
						var _chk = {}, _dim = {};
						var cs = getComputedStyle(elm);
						var me = domGeometry.getMarginExtents(elm, cs);
						var pb = domGeometry.getPadBorderExtents(elm, cs);
						var cb = {w:me.w + pb.w,h:me.h+pb.h};
						var i=0,l=props.length,k,sk,kk;
						for(i=0;i<l;i++) {
							k = props[i];
							sk = sprops[i];
							kk = sk.match(/w/i) ? "w" : "h";
							_dim[sk] = domStyle.toPixelValue(elm,cs[k])+cb[kk];
						}
						for(i=0;i<l;i++) {
							k = props[i];
							// make it a percentage of the calculated value
							var s = style[k];
							s = s ? s.indexOf("px") > -1 ? 1 :
								s.indexOf("%") > -1 ? parseInt(s.replace("%",""))/100 : 0
								: 0;
							_chk[k] = s;
						}
						child._chk = _chk;
						child._dim = _dim;
						child._display = cs["display"];
					}
					// recalc percent every time
					for(var i=0,l=props.length;i<l;i++) {
						k = props[i];
						sk = sprops[i];
						if(child._chk[k] > 0 && child._chk[k] < 1) child._dim[sk] = dim[sk]*child._chk[k];
					}
					max = Math.max(max,child._dim[prop.charAt(0)]);
				});
				// FIXME: maxHeight for top/bottom is simply entire dim.h
				regions[region].maxWidth = prop == "width" ? max : dim.w;
				regions[region].maxHeight = prop == "height" ? max : dim.h;
				regions[region].dim = lang.mixin({},dim);
				regions[region].dim.t = 0;
				regions[region].dim.l = 0;
				regions[region].dim[prop.charAt(0)] = regions[region]["max"+capitalize(prop)];
				var fit = null;
				var safe = 6*children.length;
				while(!fit && safe>0) {
					fit = utils.calcRegion(regions[region],dim,changedRegionId,changedRegionSize,tileSize,allowHide);
					safe--;
				}
			}
		}
	};

	lang.setObject("dlagua.w.layout.utils", utils);	// remove for 2.0

	return utils;
});
