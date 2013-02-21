define([
"dojo/_base/declare",
"dojo/_base/lang",
"dojo/_base/window",
"dojo/fx",
"dojo/fx/easing",
"dojo/on",
"dojo/dom-construct",
"dojo/dom-geometry"
],function(declare,lang,win,fx,easing,on,domConstruct,domGeometry) {
	return declare("dlagua.x.fx.Flare",[],{
		postCreate: function(){
			// summary:
			//		Initializes the flare
			this.inherited(arguments);
			this._resetFlare();
			var imgpath = require.toUrl("dlagua/x/fx/resources/flare.png");
			this._flare = domConstruct.create("div",{
				style:"position:absolute;",
				innerHTML:'<img src="'+imgpath+'"/>'
			});
		},
		//destroy:function(){
		//	this.inherited(arguments);
		//},
		_showFlare:function(){
			this._fh.remove();
			var mb = domGeometry.position(this.domNode);
			var _f = this._flare;
			var fh = 50;
			_f.style.top = (mb.y + mb.h/2 - fh)+"px";
			_f.style.left = (mb.x - fh)+"px";
			var self = this;
			domConstruct.place(_f,win.body());
			var slideArgs = {
				node: _f,
				top: (mb.y + mb.h/2 - fh).toString(),
				left: (mb.x + mb.w - fh).toString(),
				unit: "px",
				easing: easing.quadInOut,
				onEnd:function(){
					self._fh = self.own(
						on(self, "mouseLeave", lang.hitch(self,"_resetFlare"))
					)[0];
					_f.parentNode.removeChild(_f);
				}
			};
			fx.slideTo(slideArgs).play();
		},
		_resetFlare:function(){
			if(this._fh) this._fh.remove();
			this._fh = this.own(
				on(this, "mouseEnter", lang.hitch(this,"_showFlare"))
			)[0];
		},
		_hideFlare:function(){
			
		}
	});
});