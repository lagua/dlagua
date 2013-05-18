define([
	"dojo/_base/kernel",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/touch",
	"dojox/mobile/sniff",
	"./_css3",
	"dojox/mobile/scrollable"
], function(dojo, connect, declare, lang, event, win, domClass, domConstruct, domStyle, touch, has, css3, Scrollable){
	
	var dm = lang.getObject("dojox.mobile", true);
	
	return declare("dlagua.x.mobile.Scrollable", Scrollable, {
		noTouch:false,
		init: function(/*Object?*/params){
			if(this._beingDestroyed) return;
			// WSH: scrollbar only (bit hacky)
			if(this.noTouch) {
				this._v = (this.scrollDir.indexOf("v") != -1); // vertical scrolling
				this._h = (this.scrollDir.indexOf("h") != -1); // horizontal scrolling
				var bars = this.showScrollBar(true);
				this.touchNode = bars._scrollBarV ? bars._scrollBarV : bars._scrollBarH;
				this.inherited(arguments);
				if(bars._scrollBarV) this._scrollBarV = bars._scrollBarV;
				if(bars._scrollBarH) this._scrollBarH = bars._scrollBarH;
			} else {
				this.inherited(arguments);
			}
			// WSH: add wheel handle after everything
			if(!has("touch")) this._ch.push(connect.connect(this.containerNode, (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), this, "onScroll"));
		},
		isScrollable:function(node){
			var w = dijit.registry.getEnclosingWidget(node);
			if(w && w.baseClass=="dlaguaScrollableServicedPaneItem") {
				w = w.getParent();
			}
			return (w && w.baseClass=="dlaguaScrollableServicedPane" && w != this);
		},
		onTouchStart: function(e){
			// summary:
			//		User-defined function to handle touchStart events.
			
			// WSH: escape on form inputs
			if(this.isFormElement(e.target) || domClass.contains(e.target,"dlaguaPreventScroll") || this.isScrollable(e.target)) return;
			
			if(this.disableTouchScroll){ return; }
			if(this._conn && (new Date()).getTime() - this.startTime < 500){
				return; // ignore successive onTouchStart calls
			}
			if(!this._conn){
				this._conn = [];
				this._conn.push(connect.connect(win.doc, touch.move, this, "onTouchMove"));
				this._conn.push(connect.connect(win.doc, touch.release, this, "onTouchEnd"));
			}

			this._aborted = false;
			if(domClass.contains(this.containerNode, "mblScrollableScrollTo2")){
				this.abort();
			}else{ // reset scrollbar class especially for reseting fade-out animation
				if(this._scrollBarNodeV){ this._scrollBarNodeV.className = ""; }
				if(this._scrollBarNodeH){ this._scrollBarNodeH.className = ""; }
			}
			this.touchStartX = e.touches ? e.touches[0].pageX : e.clientX;
			this.touchStartY = e.touches ? e.touches[0].pageY : e.clientY;
			this.startTime = (new Date()).getTime();
			// WSH: set startpos to scrollbar on invert
			this.invert = (e.target==this._scrollBarV || e.target==this._scrollBarH);
			if(this.invert) {
				this.startPos = this.getScrollBarPos(this._v ? this._scrollBarV : this._scrollBarH);
			} else {
				this.startPos = this.getPos();
			}
			// WSH: dim is already set on many occasions
			if(!this._dim) this._dim = this.getDim();
			this._time = [0];
			// WSH: set posx/y to scrollbar on invert
			this._posX = [this.invert ? -this.touchStartX : this.touchStartX];
			this._posY = [this.invert ? -this.touchStartY : this.touchStartY];
			this._locked = false;

			if(!this.isFormElement(e.target)){
				this.propagatable ? e.preventDefault() : event.stop(e);
			}
		},
		
		onTouchMove: function(e){
			// summary:
			//		User-defined function to handle touchMove events.
			if(this._locked){ return; }
			var x = e.touches ? e.touches[0].pageX : e.clientX;
			var y = e.touches ? e.touches[0].pageY : e.clientY;
			var dx = x - this.touchStartX;
			var dy = y - this.touchStartY;
			var to = {x:this.startPos.x + dx, y:this.startPos.y + dy};
			var dim = this._dim;
			// WSH: extra check
			if(!dim) dim = this_dim = this.getDim();

			dx = Math.abs(dx);
			dy = Math.abs(dy);

			// WSH: set to to inverted pos on invert  
			// TODO: add for horizontal
			if(this.invert) {
				to = this.getPosInv(to);
				if(this._scrollBarV) {
					if(to.y>0) to.y=0;
					if(to.y<-dim.o.h) to.y = -dim.o.h;
				}
			}

			if(this._time.length == 1){ // the first TouchMove after TouchStart
				if(this.dirLock){
					if(this._v && !this._h && dx >= this.threshold && dx >= dy ||
						(this._h || this._f) && !this._v && dy >= this.threshold && dy >= dx){
						this._locked = true;
						return;
					}
				}
				if(this._v && this._h){ // scrollDir="hv"
					if(dy < this.threshold &&
					   dx < this.threshold){
						return;
					}
				}else{
					if(this._v && dy < this.threshold ||
					   (this._h || this._f) && dx < this.threshold){
						return;
					}
				}
				this.addCover();
				this.showScrollBar();
			}

			var weight = this.weight;
			if(this._v && this.constraint){
				if(to.y > 0){ // content is below the screen area
					to.y = Math.round(to.y * weight);
				}else if(to.y < -dim.o.h){ // content is above the screen area
					if(dim.c.h < dim.d.h){ // content is shorter than display
						to.y = Math.round(to.y * weight);
					}else{
						to.y = -dim.o.h - Math.round((-dim.o.h - to.y) * weight);
					}
				}
			}
			if((this._h || this._f) && this.constraint){
				if(to.x > 0){
					to.x = Math.round(to.x * weight);
				}else if(to.x < -dim.o.w){
					if(dim.c.w < dim.d.w){
						to.x = Math.round(to.x * weight);
					}else{
						to.x = -dim.o.w - Math.round((-dim.o.w - to.x) * weight);
					}
				}
			}
			this.scrollTo(to);

			var max = 10;
			var n = this._time.length; // # of samples
			if(n >= 2){
				// Check the direction of the finger move.
				// If the direction has been changed, discard the old data.
				var d0, d1;
				if(this._v && !this._h){
					d0 = this._posY[n - 1] - this._posY[n - 2];
					d1 = y - this._posY[n - 1];
				}else if(!this._v && this._h){
					d0 = this._posX[n - 1] - this._posX[n - 2];
					d1 = x - this._posX[n - 1];
				}
				if(d0 * d1 < 0){ // direction changed
					// leave only the latest data
					this._time = [this._time[n - 1]];
					this._posX = [this._posX[n - 1]];
					this._posY = [this._posY[n - 1]];
					n = 1;
				}
			}
			if(n == max){
				this._time.shift();
				this._posX.shift();
				this._posY.shift();
			}
			this._time.push((new Date()).getTime() - this.startTime);
			// WSH: push inverted pos if inverted
			this._posX.push(this.invert ? -x : x);
			this._posY.push(this.invert ? -y : y);
		},
		
		onTouchEnd: function(/*Event*/e){
			// summary:
			//		User-defined function to handle touchEnd events.
			if(this._locked){ return; }
			var speed = this._speed = {x:0, y:0};
			var dim = this._dim;
			var pos = this.getPos();
			var to = {}; // destination
			if(e){
				if(!this._conn){ return; } // if we get onTouchEnd without onTouchStart, ignore it.
				for(var i = 0; i < this._conn.length; i++){
					connect.disconnect(this._conn[i]);
				}
				this._conn = null;

				var n = this._time.length; // # of samples
				var clicked = false;
				if(!this._aborted){
					if(n <= 1){
						clicked = true;
						// WSH: don't do this on invert (any scroll is scroll)
					}else if(n == 2 && Math.abs(this._posY[1] - this._posY[0]) < 4
						&& has('touch') && !this.invert){ // for desktop browsers, posY could be the same, since we're using clientY, see onTouchMove()
						clicked = true;
					}
				}
				if(clicked){ // clicked, not dragged or flicked
					this.hideScrollBar();
					this.removeCover();
					// need to send a synthetic click?
					if(has("touch") && has("clicks-prevented") && !this.isFormElement(e.target)){
						var elem = e.target;
						if(elem.nodeType != 1){
							elem = elem.parentNode;
						}
						setTimeout(function(){
							dm._sendClick(elem, e);
						});
					}
					return;
				}
				speed = this._speed = this.getSpeed();
			}else{
				if(pos.x == 0 && pos.y == 0){ return; } // initializing
				dim = this.getDim();
			}

			if(this._v){
				to.y = pos.y + speed.y;
			}
			if(this._h || this._f){
				to.x = pos.x + speed.x;
			}

			if(this.adjustDestination(to, pos, dim) === false){ return; }

			if(this.constraint){
				if(this.scrollDir == "v" && dim.c.h < dim.d.h){ // content is shorter than display
					this.slideTo({y:0}, 0.3, "ease-out"); // go back to the top
					return;
				}else if(this.scrollDir == "h" && dim.c.w < dim.d.w){ // content is narrower than display
					this.slideTo({x:0}, 0.3, "ease-out"); // go back to the left
					return;
				}else if(this._v && this._h && dim.c.h < dim.d.h && dim.c.w < dim.d.w){
					this.slideTo({x:0, y:0}, 0.3, "ease-out"); // go back to the top-left
					return;
				}
			}

			var duration, easing = "ease-out";
			var bounce = {};
			if(this._v && this.constraint){
				if(to.y > 0){ // going down. bounce back to the top.
					if(pos.y > 0){ // started from below the screen area. return quickly.
						duration = 0.3;
						to.y = 0;
					}else{
						to.y = Math.min(to.y, 20);
						easing = "linear";
						bounce.y = 0;
					}
				}else if(-speed.y > dim.o.h - (-pos.y)){ // going up. bounce back to the bottom.
					if(pos.y < -dim.o.h){ // started from above the screen top. return quickly.
						duration = 0.3;
						to.y = dim.c.h <= dim.d.h ? 0 : -dim.o.h; // if shorter, move to 0
					}else{
						to.y = Math.max(to.y, -dim.o.h - 20);
						easing = "linear";
						bounce.y = -dim.o.h;
					}
				}
			}
			if((this._h || this._f) && this.constraint){
				if(to.x > 0){ // going right. bounce back to the left.
					if(pos.x > 0){ // started from right of the screen area. return quickly.
						duration = 0.3;
						to.x = 0;
					}else{
						to.x = Math.min(to.x, 20);
						easing = "linear";
						bounce.x = 0;
					}
				}else if(-speed.x > dim.o.w - (-pos.x)){ // going left. bounce back to the right.
					if(pos.x < -dim.o.w){ // started from left of the screen top. return quickly.
						duration = 0.3;
						to.x = dim.c.w <= dim.d.w ? 0 : -dim.o.w; // if narrower, move to 0
					}else{
						to.x = Math.max(to.x, -dim.o.w - 20);
						easing = "linear";
						bounce.x = -dim.o.w;
					}
				}
			}
			this._bounce = (bounce.x !== undefined || bounce.y !== undefined) ? bounce : undefined;

			if(duration === undefined){
				var distance, velocity;
				if(this._v && this._h){
					velocity = Math.sqrt(speed.x*speed.x + speed.y*speed.y);
					distance = Math.sqrt(Math.pow(to.y - pos.y, 2) + Math.pow(to.x - pos.x, 2));
				}else if(this._v){
					velocity = speed.y;
					distance = to.y - pos.y;
				}else if(this._h){
					velocity = speed.x;
					distance = to.x - pos.x;
				}
				if(distance === 0 && !e){ return; } // #13154
				duration = velocity !== 0 ? Math.abs(distance / velocity) : 0.01; // time = distance / velocity
			}
			this.slideTo(to, duration, easing);
		},
		
		getSpeed: function(){
			// summary:
			//		Returns an object that indicates the scrolling speed.
			// description:
			//		From the position and elapsed time information, calculates the
			//		scrolling speed, and returns an object with x and y.
			var x = 0, y = 0, n = this._time.length;
			// if the user holds the mouse or finger more than 0.5 sec, do not move.
			// WSH: 0.2 sec
			if(n >= 2 && (new Date()).getTime() - this.startTime - this._time[n - 1] < 200){
				var dy = this._posY[n - (n > 3 ? 2 : 1)] - this._posY[(n - 6) >= 0 ? n - 6 : 0];
				var dx = this._posX[n - (n > 3 ? 2 : 1)] - this._posX[(n - 6) >= 0 ? n - 6 : 0];
				var dt = this._time[n - (n > 3 ? 2 : 1)] - this._time[(n - 6) >= 0 ? n - 6 : 0];
				y = this.calcSpeed(dy, dt);
				x = this.calcSpeed(dx, dt);
			}
			return {x:x, y:y};
		},
		
		showScrollBar: function(force){
			// summary:
			//		Shows the scroll bar.
			// description:
			//		This function creates the scroll bar instance if it does not
			//		exist yet, and calls resetScrollBar() to reset its length and
			//		position.

			if(!this.scrollBar){ return; }

			// WSH: recalc dimensions
			var dim = this._dim = this.getDim();

			// WSH: update extra scrollbar features
			var skip = (this.scrollDir == "v" && dim.c.h <= dim.d.h) || 
				(this.scrollDir == "h" && dim.c.w <= dim.d.w) || 
				(this._v && this._h && dim.c.h <= dim.d.h && dim.c.w <= dim.d.w);
			
			if(skip && !force) {
				this.clearScrollBar = true;
				this.hideScrollBar();
				return;
			}

			var createBar = function(self, dir){
				var bar = self["_scrollBarNode" + dir];
				if(!bar){
					var wrapper = domConstruct.create("div", null, self.domNode);
					var props = { position: "absolute", overflow: "hidden" };
					if(dir == "V"){
						props.right = "0px";
						props.width = "13px";
					}else{
						props.bottom = (self.isLocalFooter ? self.fixedFooterHeight : 0) + 0 + "px";
						props.height = "13px";
					}
					domStyle.set(wrapper, props);
					wrapper.className = "mblScrollBarWrapper";
					self["_scrollBarWrapper"+dir] = wrapper;

					bar = domConstruct.create("div", null, wrapper);
					domStyle.set(bar, css3.add({
						opacity: 0.6,
						position: "absolute",
						backgroundColor: "#606060",
						fontSize: "1px",
						MozBorderRadius: "4px",
						zIndex: 2147483647 // max of signed 32-bit integer
					}, {
						borderRadius: "4px",
						transformOrigin: "0 0"
					}));
					domStyle.set(bar, dir == "V" ? {width: "8px", marginLeft:"3px"} : {height: "8px", marginTop:"3px"});
					self["_scrollBarNode" + dir] = bar;
				}
				return bar;
			};
			if(force) {
				var bars = {};
				if(this._v){
					bars._scrollBarV = createBar(this, "V");
				}
				if(this._h){
					bars._scrollBarH = createBar(this, "H");
				}
				return bars;
			}
			if(this._v && !this._scrollBarV){
				this._scrollBarV = createBar(this, "V");
				this._ch.push(connect.connect(this._scrollBarV, has("touch") ? "touchstart" : "onmousedown", this, "onTouchStart"));
			}
			if(this._h && !this._scrollBarH){
				this._scrollBarH = createBar(this, "H");
				this._ch.push(connect.connect(this._scrollBarH, has("touch") ? "touchstart" : "onmousedown", this, "onTouchStart"));
			}
			this.resetScrollBar();
		},
		
		hideScrollBar: function(){
			// summary:
			//		Hides the scroll bar.
			// description:
			//		If the fadeScrollBar property is true, hides the scroll bar with
			//		the fade animation.
			// WSH: scrollbar resetters
			if(this.useScrollBar && !this.clearScrollBar) return;
			if(this.clearScrollBar) this.clearScrollBar = false;
			
			if(this.fadeScrollBar && has("css3-animations")){
				if(!dm._fadeRule){
					var node = domConstruct.create("style", null, win.doc.getElementsByTagName("head")[0]);
					node.textContent =
						".mblScrollableFadeScrollBar{"+
						"  " + css3.name("animation-duration", true) + ": 1s;"+
						"  " + css3.name("animation-name", true) + ": scrollableViewFadeScrollBar;}"+
						"@" + css3.name("keyframes", true) + " scrollableViewFadeScrollBar{"+
						"  from { opacity: 0.6; }"+
						"  to { opacity: 0; }}";
					dm._fadeRule = node.sheet.cssRules[1];
				}
			}
			if(!this.scrollBar){ return; }
			var f = function(bar, self){
				domStyle.set(bar, css3.add({
					opacity: 0
				}, {
					animationDuration: ""
				}));
				// do not use fade animation in case of using top/left on Android
				// since it causes screen flicker during adress bar's fading out
				if(!(self._useTopLeft && has('android'))){
					bar.className = "mblScrollableFadeScrollBar";
				}
			};
			if(this._scrollBarV){
				f(this._scrollBarV, this);
				this._scrollBarV = null;
			}
			if(this._scrollBarH){
				f(this._scrollBarH, this);
				this._scrollBarH = null;
			}
			// WSH: added this to resize scrollbar wrapper, could also be hiding
			var f2 = function(wrapper, d, c, hd, v){
				if(!wrapper) return;
				var props = {};
				props[v ? "top" : "left"] = hd + 4 + "px"; // +4 is for top or left margin
				props[v ? "height" : "width"] = d - 8 + "px";
				domStyle.set(wrapper, props);
			};
			var dim = this._dim;
			f2(this._scrollBarWrapperV, dim.d.h, dim.c.h, this.fixedHeaderHeight, true);
			f2(this._scrollBarWrapperH, dim.d.w, dim.c.w, 0);
		},
		
		resetScrollBar: function(){
			// summary:
			//		Resets the scroll bar length, position, etc.
			var f = function(wrapper, bar, d, c, hd, v){
				if(!bar){ return; }
				var props = {};
				props[v ? "top" : "left"] = hd + 4 + "px"; // +4 is for top or left margin
				var t = (d - 8) <= 0 ? 1 : d - 8;
				props[v ? "height" : "width"] = t + "px";
				domStyle.set(wrapper, props);
				var l = Math.round(d * d / c); // scroll bar length
				l = Math.min(Math.max(l - 8, 5), t); // -8 is for margin for both ends
				bar.style[v ? "height" : "width"] = l + "px";
				domStyle.set(bar, {"opacity": 0.6});
			};
			// WSH: set this._dim to recalc globally (e.g. new content)
			var dim = this._dim = this.getDim();
			f(this._scrollBarWrapperV, this._scrollBarV, dim.d.h, dim.c.h, this.fixedHeaderHeight, true);
			f(this._scrollBarWrapperH, this._scrollBarH, dim.d.w, dim.c.w, 0);
			this.createMask();
		},
		
		getPosInv: function(to){ // to: {x, y}
			var pos = {};
			var dim = this._dim;
			var f = function(wrapperH, barH, t, d, c){
				var y = Math.round((d - c) / (d - barH - 8) * t);
				/*if(y < -barH + 5){
					y = -barH + 5;
				}
				if(y > wrapperH - 5){
					y = wrapperH - 5;
				}*/
				return y;
			};
			if(typeof to.y == "number" && this._scrollBarV){
				pos.y = f(this._scrollBarWrapperV.offsetHeight, this._scrollBarV.offsetHeight, to.y, dim.d.h, dim.c.h);
			}
			if(typeof to.x == "number" && this._scrollBarH){
				pos.x = f(this._scrollBarWrapperH.offsetWidth, this._scrollBarH.offsetWidth, to.x, dim.d.w, dim.c.w);
			}
			return pos;
		},
		
		// WSH: custom additions
		getScrollBarPos: function(bar){
			if(!bar) return {x:0,y:0};
			if(has("css3-animations")){
				var s = win.doc.defaultView.getComputedStyle(bar, '');
				var m = s[css3.name("transform")];
				if(m && m.indexOf("matrix") === 0){
					var arr = m.split(/[,\s\)]+/);
					// IE10 returns a matrix3d
					var i = m.indexOf("matrix3d") === 0 ? 12 : 4;
					return {y:arr[i+1] - 0, x:arr[i] - 0};
				}
				return {x:0, y:0};
			}else{
				return {y:bar.offsetTop, x:bar.offsetLeft};
			}
		},
		onScroll: function(e){
			var scroll = e[(!has("mozilla") ? "wheelDelta" : "detail")] * (!has("mozilla") ? 0.025 : -1);
			var x = e.clientX;
			var y = e.clientY;
			this._posX = [x];
			this._posY = [y];
			var dx = 0;
			var dy = scroll*15;
			var pos = this.getPos();
			var to = {x:pos.x + dx, y:pos.y + dy};
			var dim = this.getDim();
			var weight = this.weight;
			if(this._v){
				if(to.y > 0){ // content is below the screen area
					// reset to top
					to.y = 0;
				}else if(to.y < -dim.o.h){ // content is above the screen area
					if(dim.c.h < dim.d.h){ // content is shorter than display
						// reset to top
						to.y = 0;
					}else{
						// reset to max
						to.y = -dim.o.h;
					}
				}
			}
			if(this._h || this._f){
				if(to.x > 0){
					to.x = 0
				}else if(to.x < -dim.o.w){
					if(dim.c.w < dim.d.w){
						to.x = 0;
					}else{
						to.x = -dim.o.w;
					}
				}
			}
			this.scrollTo(to);
			// wait for timer
			if(!this.startTime) {
				this.startTime = (new Date()).getTime();
				console.log("setting starttime", this.startTime)
				this._time = [0];
				var ontime = lang.hitch(this,function(){
					var l = this._time.length;
					if(l>1) {
						// still scrolling, wait again
						var t = this._time.shift();
						// if it was the first time, measure it from startTime
						// else from the previous time
						var t2 = (t==0 ? 10 : t-this._time[0]);
						console.log("still scrolling", l)
						
						// t is the time in between scroll actions...
						setTimeout(ontime,t2);
					} else {
						console.log("done scrolling", l)
						this.startTime = 0;
						this._time = [0];
						var speed = {x:0, y:0};
						// if the user holds the mouse or finger more than 0.5 sec, do not move.
						
						to = {}; // destination

						if(this._v){
							to.y = pos.y + speed.y;
						}
						if(this._h || this._f){
							to.x = pos.x + speed.x;
						}

						if(this.scrollDir == "v" && dim.c.h <= dim.d.h){ // content is shorter than display
							this.slideTo({y:0}, 0.3, "ease-out"); // go back to the top
							return;
						}else if(this.scrollDir == "h" && dim.c.w <= dim.d.w){ // content is narrower than display
							this.slideTo({x:0}, 0.3, "ease-out"); // go back to the left
							return;
						}else if(this._v && this._h && dim.c.h <= dim.d.h && dim.c.w <= dim.d.w){
							this.slideTo({x:0, y:0}, 0.3, "ease-out"); // go back to the top-left
							return;
						}

						var duration, easing = "ease-out";
						var bounce = {};
						if(this._v){
							if(to.y > 0){ // going down. bounce back to the top.
								if(pos.y > 0){ // started from below the screen area. return quickly.
									duration = 0.3;
									to.y = 0;
								}else{
									to.y = Math.min(to.y, 20);
									easing = "linear";
									bounce.y = 0;
								}
							}else if(-speed.y > dim.o.h - (-pos.y)){ // going up. bounce back to the bottom.
								if(pos.y < -dim.o.h){ // started from above the screen top. return quickly.
									duration = 0.3;
									to.y = dim.c.h <= dim.d.h ? 0 : -dim.o.h; // if shorter, move to 0
								}else{
									to.y = Math.max(to.y, -dim.o.h - 20);
									easing = "linear";
									bounce.y = -dim.o.h;
								}
							}
						}
						if(this._h || this._f){
							if(to.x > 0){ // going right. bounce back to the left.
								if(pos.x > 0){ // started from right of the screen area. return quickly.
									duration = 0.3;
									to.x = 0;
								}else{
									to.x = Math.min(to.x, 20);
									easing = "linear";
									bounce.x = 0;
								}
							}else if(-speed.x > dim.o.w - (-pos.x)){ // going left. bounce back to the right.
								if(pos.x < -dim.o.w){ // started from left of the screen top. return quickly.
									duration = 0.3;
									to.x = dim.c.w <= dim.d.w ? 0 : -dim.o.w; // if narrower, move to 0
								}else{
									to.x = Math.max(to.x, -dim.o.w - 20);
									easing = "linear";
									bounce.x = -dim.o.w;
								}
							}
						}
						this._bounce = (bounce.x !== undefined || bounce.y !== undefined) ? bounce : undefined;
						this.onFlickAnimationEnd();
					}
				})
				setTimeout(ontime,100);
			} else {
				this._time.push((new Date()).getTime());
			}
		},
		onFlickAnimationEnd:function(e){
			if(e){
				var an = e.animationName;
				if(an && an.indexOf("scrollableViewScroll2") === -1){
					if(an.indexOf("scrollableViewScroll0") !== -1){ // scrollBarV
						if(this._scrollBarNodeV){ domClass.remove(this._scrollBarNodeV, "mblScrollableScrollTo0"); }
					}else if(an.indexOf("scrollableViewScroll1") !== -1){ // scrollBarH
						if(this._scrollBarNodeH){ domClass.remove(this._scrollBarNodeH, "mblScrollableScrollTo1"); }
					}else{ // fade or others
						if(this._scrollBarNodeV){ this._scrollBarNodeV.className = ""; }
						if(this._scrollBarNodeH){ this._scrollBarNodeH.className = ""; }
					}
					return;
				}
				if(this._useTransformTransition || this._useTopLeft){
					var n = e.target;
					if(n === this._scrollBarV || n === this._scrollBarH){
						var cls = "mblScrollableScrollTo" + (n === this._scrollBarV ? "0" : "1");
						if(domClass.contains(n, cls)){
							domClass.remove(n, cls);
						}else{
							n.className = "";
						}
						return;
					}
				}
				if(e.srcElement){
					event.stop(e);
				}
			}
			this.stopAnimation();
			if(this._bounce){
				var _this = this;
				var bounce = _this._bounce;
				setTimeout(function(){
					_this.slideTo(bounce, 0.3, "ease-out");
				}, 0);
				_this._bounce = undefined;
			}else{
				this.hideScrollBar();
				this.removeCover();
				// WSH: reset startTime for scrollbar
				this.startTime = 0;
				// WSH: this really is dim reset
				this._dim = this.getDim();
			}
		},
		scrollToInitPos:function(){
			if(this._scrollBarV) domStyle.set(this._scrollBarV, "top", 0);
			if(this._scrollBarH) domStyle.set(this._scrollBarH, "left", 0);
		}
	});
});