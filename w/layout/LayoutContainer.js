define("dlagua/w/layout/LayoutContainer", [
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/fx",
	"dojo/_base/fx",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/dom-class",
	"dijit/registry",
	"dijit/layout/LayoutContainer",
	"./utils"
 ], function(declare, lang, array, coreFx, fx, domGeometry, domStyle, domClass, registry, LayoutContainer, layoutUtils){

	/*var layoutChildren = utils.layoutChildren;
	var layoutUtils = lang.mixin(lang.mixin({},utils),{
		layoutChildren: function(DomNode container, Object dim, Widget[] children,
				String? changedRegionId, Number? changedRegionSize){
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
	});*/
	
	return declare("dlagua.w.layout.LayoutContainer",[LayoutContainer],{
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
			layoutUtils.layoutChildren(this.domNode, this._contentBox, this._getOrderedChildren());
		}
		/*layout: function(){
			var children = this._getOrderedChildren();
			var cb = this._contentBox;
			var landsc = cb.w>cb.h;
			var layoutPrio=0;
			var dw;
			array.forEach(children,function(_){
				domClass.toggle(_.domNode,"dlaguaTile",false);
				domAttr.remove(_.domNode,"style")
				if(!_.params.layoutPrio) delete _.layoutPrio;
				_.region = _.params.region;
				if(_.region=="center") {
					dw = _._contentBox.w - parseInt(domStyle.get(_.domNode,"minWidth"),10);
				}
				if((landsc && _.region=="trailing") || (!landsc && _.region=="bottom")) {
					if(_.layoutPrio) layoutPrio = Math.max(layoutPrio,_.layoutPrio);
					layoutPrio++;
				}
			});
			var prog = layoutUtils.layoutChildren(this.domNode, cb, children);
			if(prog>0) {
				array.forEach(children, function(child){
					var elm = child.domNode;
					if(child.region=="leading" || child.region=="trailing" || child.oriRegion=="leading" || child.oriRegion=="trailing") {
						// prog 1 = tile
						domClass.toggle(elm,"dlaguaTile",prog==1);
						child.region = landsc && dw>0 ? "trailing" : "bottom";
						child.layoutPriority = layoutPrio++;
					}
				},this);
				layoutChildren(this.domNode, cb, children);
				this._prog = prog;
			}
		}*/
	});
});
