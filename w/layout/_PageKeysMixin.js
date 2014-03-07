define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dojo/keys",
	"dijit/typematic"
],function(declare,lang,array,on,keys,typematic) {

	return declare("dlagua.w.layout._PageKeysMixin",[],{
		pageKeys:true,
		// defaultTimeout: Number
		//		Number of milliseconds before a held arrow key or up/down button becomes typematic
		defaultTimeout: 500,

		// minimumTimeout: Number
		//		minimum number of milliseconds that typematic event fires when held key or button is held
		minimumTimeout: 10,

		// timeoutChangeRate: Number
		//		Fraction of time used to change the typematic timer between events.
		//		1.0 means that each typematic event fires at defaultTimeout intervals.
		//		Less than 1.0 means that each typematic event fires at an increasing faster rate.
		timeoutChangeRate: 0.90,
		startup:function(){
			if(this._started) return;
			this.inherited(arguments);
			if(this.pageKeys) {
				this.own(
					typematic.addKeyListener(window, {
						keyCode: keys.PAGE_DOWN 
					}, this, this._pageDown, this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
					typematic.addKeyListener(window, {
						keyCode: keys.PAGE_UP
					}, this, this._pageUp, this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
					on(window, "keypress", lang.hitch(this,function(evt){
						switch(evt.keyCode) {
							case keys.HOME:
								this._home();
							break;
							case keys.END:
								this._end();
							break;
						}
					}))
				);
			}
		},
		_pageUp:function(cnt) {
			if(cnt==-1) return;
			var pos = this.getPos();
			var dim = this._dim;
			var y = pos.y + dim.d.h;
			var duration, easing = "ease-out";
			var bounce = {x:0};
			if(this._v && this.constraint){
				if(y > 0){ // going down. bounce back to the top.
					if(pos.y > 0){ // started from below the screen area. return quickly.
						duration = 0.3;
						y = 0;
					}else{
						y = Math.min(y, 20);
						easing = "linear";
						bounce.y = 0;
					}
				}
			}
			this._bounce = (bounce.x !== undefined || bounce.y !== undefined) ? bounce : undefined;
			this.slideTo({x:0,y:y},0.3,"ease-out");
		},
		_pageDown:function(cnt) {
			if(cnt==-1) return;
			var pos = this.getPos();
			var dim = this._dim;
			var y = pos.y - dim.d.h;
			var duration, easing = "ease-out";
			var bounce = {x:0};
			if(this._v && this.constraint){
				if(dim.d.h > dim.o.h - (-pos.y)){ // going up. bounce back to the bottom.
					if(pos.y < -dim.o.h){ // started from above the screen top. return quickly.
						duration = 0.3;
						y = dim.c.h <= dim.d.h ? 0 : -dim.o.h; // if shorter, move to 0
					}else{
						y = Math.max(y, -dim.o.h - 20);
						easing = "linear";
						bounce.y = -dim.o.h;
					}
				}
			}
			this._bounce = (bounce.x !== undefined || bounce.y !== undefined) ? bounce : undefined;
			this.slideTo({x:0,y:y},0.3,"ease-out");
		},
		_home:function(){
			this.slideTo({x:0,y:0},0.3,"ease-out");
		},
		_end:function(){
			var dim = this._dim;
			this.slideTo({x:0,y:-dim.o.h},0.3,"ease-out");
		}
	});
});