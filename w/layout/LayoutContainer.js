define("dlagua/w/layout/LayoutContainer", [
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/fx",
	"dojo/_base/fx",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dijit/registry",
	"dijit/layout/utils",
	"dijit/layout/LayoutContainer"
 ], function(declare, lang, array, coreFx, fx, domGeometry, domStyle, registry, utils, LayoutContainer){

	var layoutChildren = utils.layoutChildren;
	var layoutUtils = lang.mixin(lang.mixin({},utils),{
		layoutChildren: function(/*DomNode*/ container, /*Object*/ dim, /*Widget[]*/ children,
				/*String?*/ changedRegionId, /*Number?*/ changedRegionSize){
			// summary:
			//		Layout a bunch of child dom nodes within a parent dom node
			var prog;
			layoutChildren(container, dim, children, changedRegionId, changedRegionSize);
			array.forEach(children, function(child){
				var elm = child.domNode;
				if(child.region=="center") {
					var minw = parseInt(domStyle.get(elm,"minWidth"),10);
					var cw = child._contentBox.w;
					prog = minw && cw<minw ? 1 : 0;
				}
			},this);
			return prog;
		}
	});
	
	return declare("dlagua.w.layout.LayoutContainer",[LayoutContainer],{
		tileSize:60,
		tileMargin:"5px",
		prog:0,
		swapChildren:function(widget,target) {
			if(typeof widget == "string") widget = registry.byId(widget);
			if(typeof target == "string") target = registry.byId(target); 
			var tr = target.region;
			target.region = widget.region;
			widget.region = tr;
			var te = target.domNode, we = widget.domNode;
			target._oriStyle = {
				width:domStyle.get(te,"width"),
				height:domStyle.get(te,"height"),
				maxWidth:domStyle.get(te,"maxWidth") || "",
				maxHeight:domStyle.get(te,"maxHeight") || "",
				margin:domStyle.get(te,"margin")
			};
			widget._oriStyle = {
				width:domStyle.get(we,"width"),
				height:domStyle.get(we,"height"),
				maxWidth:domStyle.get(we,"maxWidth") || "",
				maxHeight:domStyle.get(we,"maxHeight") || "",
				margin:domStyle.get(we,"margin")
			};
			domStyle.set(we,target._oriStyle);
			domStyle.set(te,widget._oriStyle);
			this.layout();
		},
		hideRegion:function(region){
			var children = this.getChildren();
			var anim = [];
			array.forEach(children,function(c){
				if(c.region==region) {
					var elm = c.domNode;
					var s = c._oriStyle = {
						top:domStyle.get(elm,"top"),
						left:domStyle.get(elm,"left"),
						width:domStyle.get(elm,"width"),
						height:domStyle.get(elm,"height"),
						margin:domStyle.get(elm,"margin"),
						padding:domStyle.get(elm,"padding")
					};
					if(region == "bottom" || region == "top") {
						anim.push(fx.animateProperty({
							node:elm,
							properties: {
								top: {start: s.top, end: s.top+s.height},
								height: { start: s.height, end: 0 },
								margin: {start: s.margin, end: 0},
								padding: {start: s.padding, end: 0}
							}
						}));
					} else {
						anim.push(fx.animateProperty({
							node:elm,
							properties: {
								left: {start: s.left, end: s.left+s.width},
								width: { start: s.width, end: 0 },
								margin: {start: s.margin, end: 0},
								padding: {start: s.padding, end: 0}
							}
						}));
					}
				}
			});
			var comb = coreFx.combine(anim);
			var self = this;
			comb.onEnd = function(){
				setTimeout(function(){
					self.resize();
				},100);
			};
			comb.play();
		},
		layout: function(){
			var children = this._getOrderedChildren();
			if(this._prog>0) {
				array.forEach(children, function(child){
					if(child._oriStyle) domStyle.set(child.domNode,child._oriStyle);
				});
			}
			var prog = layoutUtils.layoutChildren(this.domNode, this._contentBox, children);
			if(prog>0) {
				array.forEach(children, function(child){
					var elm = child.domNode;
					if(child.region=="leading" || child.region=="trailing") {
						if(prog==1) {
							// tile
							child._oriStyle = {
								maxWidth:domStyle.get(elm,"maxWidth") || "",
								maxHeight:domStyle.get(elm,"maxHeight") || "",
								margin:domStyle.get(elm,"margin"),
							};
							domStyle.set(elm,{
								maxWidth:this.tileSize + "px",
								maxHeight:this.tileSize + "px",
								margin:this.tileMargin
							});
						} else {
							domStyle.set(elm,child._oriStyle);
							delete child._oriStyle;
						}
					}
				},this);
				layoutChildren(this.domNode, this._contentBox, children);
				this._prog = prog;
			}
		}
	});
});
