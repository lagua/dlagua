dojo.provide("dlagua.x.mobile._ScrollableMixin");
dojo.require("dojox.mobile._ScrollableMixin");

if(!dlagua) dlagua = {};
if(!dlagua.x.mobile) dlagua.x.mobile = {};

dojo.isAndroid = parseFloat(navigator.userAgent.split("Android")[1]) || undefined;

dlagua.x.mobile.hasTouch = (typeof dojo.doc.documentElement.ontouchstart != "undefined" &&
		navigator.appVersion.indexOf("Mobile") != -1) || !!dojo.isAndroid || navigator.appVersion.indexOf("Android")!=-1;

dojo.declare("dlagua.x.mobile._ScrollableMixin",[dojox.mobile._ScrollableMixin],{
	cleanup:function(){}, // override cleanup
	useScrollBar:false,
	clearScrollBar:false,
	useTouch:true,
	androidWorkaround:true,
	init: function(/*Object?*/params){
		if(this._beingDestroyed) return;
		if (params){
			for(var p in params){
				if (params.hasOwnProperty(p)) {
					this[p] = ((p == "domNode" || p == "containerNode") && typeof params[p] == "string") ?
						dojo.doc.getElementById(params[p]) : params[p]; // mix-in params
				}
			}
		}
		this._v = (this.scrollDir.indexOf("v") != -1); // vertical scrolling
		this._h = (this.scrollDir.indexOf("h") != -1); // horizontal scrolling
		this._f = (this.scrollDir == "f"); // flipping views
		this._ch = []; // connect handlers in dojox.mobile.scrollable prototype... will not be used but needs to exist
		if(this.useTouch) this.connect(this.containerNode, dlagua.x.mobile.hasTouch ? "touchstart" : "onmousedown",  "onTouchStart");
		if(dojo.isWebKit){
			this.connect(this.domNode, "webkitAnimationEnd", "onFlickAnimationEnd");
			this.connect(this.domNode, "webkitAnimationStart", "onFlickAnimationStart");
		}
		this._aw = this.androidWorkaround && dojo.isAndroid >= 2.2 && dojo.isAndroid < 3;
		if(this._aw){
			this._ch.push(this.connect(window, "onresize", this, "onScreenSizeChanged"));
			this._ch.push(this.connect(window, "onfocus", this, function(e){
				if(this.containerNode.style.webkitTransform){
					this.stopAnimation();
					this.toTopLeft();
				}
			}));
			this._sz = this.getScreenSize();
		}
		if(!dlagua.x.mobile.hasTouch){
			this.connect(this.containerNode, (!dojo.isMozilla ? "onmousewheel" : "DOMMouseScroll"), this.onScroll);
		}
		if(dojo.global.onorientationchange !== undefined){
			this.connect(dojo.global, "onorientationchange", "resizeView");
		}else{
			this.connect(dojo.global, "onresize", "resizeView");
		}
		this.resizeView();
		if(!this.useScrollBar) {
			var _this = this;
			setTimeout(function(){
				_this.flashScrollBar();
			}, 600);
		}
	},
	getScreenSize: function(){
		// summary:
		//		Returns the dimensions of the browser window.
		return {
			h: window.innerHeight||dojo.doc.documentElement.clientHeight||dojo.doc.documentElement.offsetHeight,
			w: window.innerWidth||dojo.doc.documentElement.clientWidth||dojo.doc.documentElement.offsetWidth
		};
	},
	onScreenSizeChanged: function(e){
		// summary:
		//		Internal function for android workaround.
		var sz = this.getScreenSize();
		if(sz.w * sz.h > this._sz.w * this._sz.h){
			this._sz = sz; // update the screen size
		}
		this.disableScroll(this.isKeyboardShown());
	},
	stopAnimation: function(){
		// stop the currently running animation
		dojo.removeClass(this.containerNode, "mblScrollableScrollTo2");
		if(dojo.isAndroid){
			dojo.style(this.containerNode, "webkitAnimationDuration", "0s"); // workaround for android screen flicker problem
		}
		if(this._scrollBarV){
			this._scrollBarV.className = "";
		}
		if(this._scrollBarH){
			this._scrollBarH.className = "";
		}
	},
	disableScroll: function(/*Boolean*/v){
		// summary:
		//		Internal function for android workaround.
		// description:
		//		Disables the touch scrolling and enables the browser's default
		//		scrolling.
		if(this.disableTouchScroll === v || this.domNode.style.display === "none"){ return; }
		this.disableTouchScroll = v;
		this.scrollBar = !v;
		dm.disableHideAddressBar = dm.disableResizeAll = v;
		var of = v ? "visible" : "hidden";
		domStyle.set(this.domNode, "overflow", of);
		domStyle.set(dojo.doc.documentElement, "overflow", of);
		domStyle.set(dojo.body(), "overflow", of);
		var c = this.containerNode;
		if(v){
			if(!c.style.webkitTransform){
				// stop animation when soft keyborad is shown before animation ends.
				// TODO: there might be a better way to wait for animation ending.
				this.stopAnimation();
				this.toTopLeft();
			}
			var mt = parseInt(c.style.marginTop) || 0;
			var h = c.offsetHeight + mt + this.fixedFooterHeight - this._appFooterHeight;
			domStyle.set(this.domNode, "height", h + "px");
			
			this._cPos = { // store containerNode's position
				x: parseInt(c.style.left) || 0,
				y: parseInt(c.style.top) || 0
			};
			domStyle.set(c, {
				top: "0px",
				left: "0px"
			});
			
			var a = dojo.doc.activeElement; // focused input field
			if(a){ // scrolling to show focused input field
				var at = 0; // top position of focused input field
				for(var n = a; n.tagName != "BODY"; n = n.offsetParent){
					at += n.offsetTop;
				}
				var st = at + a.clientHeight + 10 - this.getScreenSize().h; // top postion of browser scroll bar
				if(st > 0){
					dojo.body().scrollTop = st;
				}
			}	
		}else{
			if(this._cPos){ // restore containerNode's position
				domStyle.set(c, {
					top: this._cPos.y + "px",
					left: this._cPos.x + "px"
				});
				this._cPos = null;
			}
			var tags = this.domNode.getElementsByTagName("*");
			for(var i = 0; i < tags.length; i++){
				tags[i].blur && tags[i].blur();
			}
			// Call dojox.mobile.resizeAll if exists.
			dm.resizeAll && dm.resizeAll();
		}
	},
	toTopLeft:function(){
		// summary:
		//		Internal function for android workaround.
		var c = this.containerNode;
		if(!c.style.webkitTransform){ return; } // already converted to top/left
		c._webkitTransform = c.style.webkitTransform;
		var pos = this.getPos();
		domStyle.set(c, {
			webkitTransform: "",
			top: pos.y + "px",
			left: pos.x + "px"
		});
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
	getScrollBarPos: function(bar){
		if(!bar) return {x:0,y:0};
		if(dojo.isWebKit){
			var m = dojo.doc.defaultView.getComputedStyle(bar, '')["-webkit-transform"];
			if(m && m.indexOf("matrix") === 0){
				var arr = m.split(/[,\s\)]+/);
				return {y:arr[5] - 0, x:arr[4] - 0};
			}
			return {x:0, y:0};
		}else{
			return {y:bar.offsetTop, x:bar.offsetLeft};
		}
	},
	onTouchStart: function(e){
		this.invert = (e.target==this._scrollBarV || e.target==this._scrollBarH);
		if(this._conn && (new Date()).getTime() - this.startTime < 500){
			return; // ignore successive onTouchStart calls
		}
		if(!this._conn){
			this._conn = [];
			this._conn.push(dojo.connect(dojo.doc, dlagua.x.mobile.hasTouch ? "touchmove" : "onmousemove", this, "onTouchMove"));
			this._conn.push(dojo.connect(dojo.doc, dlagua.x.mobile.hasTouch ? "touchend" : "onmouseup", this, "onTouchEnd"));
		}

		this._aborted = false;
		if(dojo.hasClass(this.containerNode, "mblScrollableScrollTo2")){
			this.abort();
		}
		this.touchStartX = e.touches ? e.touches[0].pageX : e.clientX;
		this.touchStartY = e.touches ? e.touches[0].pageY : e.clientY;
		// dim is already set on many occasions
		if(!this._dim) this._dim = this.getDim();
		this.startTime = (new Date()).getTime();
		this.startPos = this.getPos();
		if(this.invert) {
			this.startPos = this.getScrollBarPos(this._v ? this._scrollBarV : this._scrollBarH);
		}
		this._time = [0];
		this._posX = [this.invert ? -this.touchStartX : this.touchStartX];
		this._posY = [this.invert ? -this.touchStartY : this.touchStartY];

		if(e.target.nodeType != 1 || (e.target.tagName != "SELECT" && e.target.tagName != "INPUT" && e.target.tagName != "TEXTAREA")){
			dojo.stopEvent(e);
		}
	},
	onTouchMove: function(e){
		var x = e.touches ? e.touches[0].pageX : e.clientX;
		var y = e.touches ? e.touches[0].pageY : e.clientY;
		var dx = x - this.touchStartX;
		var dy = y - this.touchStartY;
		
		var to = {x:this.startPos.x + dx, y:this.startPos.y + dy};
		var dim = this._dim;
		// TODO: add for horizontal
		if(this.invert) {
			to = this.getPosInv(to);
			if(this._scrollBarV) {
				if(to.y>0) to.y=0;
				if(to.y<-dim.o.h) to.y = -dim.o.h;
			}
		}

		if(this._time.length == 1){ // the first TouchMove after TouchStart
			if(dx < this.threshold && dy < this.threshold){ return; }
			this.addCover();
			if(!this.useScrollBar) this.showScrollBar();
		}

		var weight = this.weight;
		if(this._v){
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
		if(this._h || this._f){
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
		this._posX.push(this.invert ? -x : x);
		this._posY.push(this.invert ? -y : y);
	},
	onTouchEnd: function(e){
		if(!this._conn){ return; } // if we get onTouchEnd without onTouchStart, ignore it.
		for(var i = 0; i < this._conn.length; i++){
			dojo.disconnect(this._conn[i]);
		}
		this._conn = null;

		var n = this._time.length; // # of samples
		var clicked = false;
		if(!this._aborted){
			if(n <= 1){
				clicked = true;
			// don't do this on invert (any scroll is scroll)
			}else if(n == 2 && Math.abs(this._posY[1] - this._posY[0]) < 4 && !this.invert){
				clicked = true;
			}
		}
		if(clicked){ // clicked, not dragged or flicked
			this.hideScrollBar();
			this.removeCover();
			if(dlagua.x.mobile.hasTouch){
				var elem = e.target;
				if(elem.nodeType != 1){
					elem = elem.parentNode;
				}
				var ev = dojo.doc.createEvent("MouseEvents");
				ev.initEvent("click", true, true);
				elem.dispatchEvent(ev);
			}
			return;
		}
		var speed = {x:0, y:0};
		// if the user holds the mouse or finger more than 0.5 sec, do not move.
		// WSH: 0.2 sec
		if(n >= 2 && (new Date()).getTime() - this.startTime - this._time[n - 1] < 200){
			var dy = this._posY[n - (n > 3 ? 2 : 1)] - this._posY[(n - 6) >= 0 ? n - 6 : 0];
			var dx = this._posX[n - (n > 3 ? 2 : 1)] - this._posX[(n - 6) >= 0 ? n - 6 : 0];
			var dt = this._time[n - (n > 3 ? 2 : 1)] - this._time[(n - 6) >= 0 ? n - 6 : 0];
			speed.y = this.calcSpeed(dy, dt);
			speed.x = this.calcSpeed(dx, dt);
		}

		var pos = this.getPos();
		var to = {}; // destination
		var dim = this._dim;

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

		if(duration === undefined){
			var distance, velocity;
			if(this._v && this._h){
				velocity = Math.sqrt(speed.x+speed.x + speed.y*speed.y);
				distance = Math.sqrt(Math.pow(to.y - pos.y, 2) + Math.pow(to.x - pos.x, 2));
			}else if(this._v){
				velocity = speed.y;
				distance = to.y - pos.y;
			}else if(this._h){
				velocity = speed.x;
				distance = to.x - pos.x;
			}
			duration = velocity !== 0 ? Math.abs(distance / velocity) : 0.01; // time = distance / velocity
		}
		this.slideTo(to, duration, easing);
	},
	onScroll: function(e){
		var scroll = e[(!dojo.isMozilla ? "wheelDelta" : "detail")] * (!dojo.isMozilla ? 0.025 : -1);
		var x = e.clientX;
		var y = e.clientY;
		this._posX = [x];
		this._posY = [y];
		var dx = 0;
		var dy = scroll*15;
		var pos = this.getPos();
		var to = {x:pos.x + dx, y:pos.y + dy};
		var dim = this._dim;
		if(!dim) dim = this_dim = this.getDim();
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
			var ontime = dojo.hitch(this,function(){
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
	showScrollBar: function(){
		if(!this.scrollBar){ return; }
		var dim = this._dim = this.getDim();
		if(this.scrollDir == "v" && dim.c.h <= dim.d.h){
			this.clearScrollBar = true;
			this.hideScrollBar();
			return;
		}
		if(this.scrollDir == "h" && dim.c.w <= dim.d.w){
			this.clearScrollBar = true;
			this.hideScrollBar();
			return;
		}
		if(this._v && this._h && dim.c.h <= dim.d.h && dim.c.w <= dim.d.w){
			this.clearScrollBar = true;
			this.hideScrollBar();
			return;
		}

		var createBar = function(self, dir){
			var bar = self["_scrollBarNode" + dir];
			if(!bar){
				var wrapper = dojo.create("div", null, self.domNode);
				var props = { position: "absolute", overflow: "hidden" };
				if(dir == "V"){
					props.right = "0px";
					props.width = "13px";
				}else{
					props.bottom = (self.isLocalFooter ? self.fixedFooterHeight : 0) + 0 + "px";
					props.height = "13px";
				}
				dojo.style(wrapper, props);
				wrapper.className = "mblScrollBarWrapper";
				self["_scrollBarWrapper"+dir] = wrapper;

				bar = dojo.create("div", null, wrapper);
				dojo.style(bar, {
					opacity: 0.6,
					filter:"alpha(opacity=60)",
					position: "absolute",
					backgroundColor: "#606060",
					fontSize: "1px",
					webkitBorderRadius: "4px",
					MozBorderRadius: "4px",
					borderRadius: "4px",
					webkitTransformOrigin: "0 0",
					zIndex: 2147483647 // max of signed 32-bit integer
				});
				dojo.style(bar, dir == "V" ? {width: "8px", marginLeft:"3px"} : {height: "8px", marginTop:"3px"});
				self["_scrollBarNode" + dir] = bar;
			}
			return bar;
		};
		if(this._v && !this._scrollBarV){
			this._scrollBarV = createBar(this, "V");
			this._ch.push(dojo.connect(this._scrollBarV, dlagua.x.mobile.hasTouch ? "touchstart" : "onmousedown", this, "onTouchStart"));
		}
		if(this._h && !this._scrollBarH){
			this._scrollBarH = createBar(this, "H");
			this._ch.push(dojo.connect(this._scrollBarH, dlagua.x.mobile.hasTouch ? "touchstart" : "onmousedown", this, "onTouchStart"));
		}
		this.resetScrollBar();
	},
	scrollToInitPos:function(){
		if(this._scrollBarV) dojo.style(this._scrollBarV, "top", 0);
		if(this._scrollBarH) dojo.style(this._scrollBarH, "left", 0);
	},
	hideScrollBar: function(){
		if(this.useScrollBar && !this.clearScrollBar) return;
		if(this.clearScrollBar) this.clearScrollBar = false;
		var fadeRule;
		if(this.fadeScrollBar && dojo.isWebKit){
			if(!dojox.mobile._fadeRule){
				var node = dojo.create("style", null, dojo.doc.getElementsByTagName("head")[0]);
				node.textContent =
					".mblScrollableFadeOutScrollBar{"+
					"  -webkit-animation-duration: 1s;"+
					"  -webkit-animation-name: scrollableViewFadeOutScrollBar;}"+
					"@-webkit-keyframes scrollableViewFadeOutScrollBar{"+
					"  from { opacity: 0.6; }"+
					"  50% { opacity: 0.6; }"+
					"  to { opacity: 0; }}";
				dojox.mobile._fadeRule = node.sheet.cssRules[1];
			}
			fadeRule = dojox.mobile._fadeRule;
		}
		if(!this.scrollBar){ return; }
		var f = function(bar){
			dojo.style(bar, {
				opacity: 0,
				filter: "alpha(opacity=0)", 
				webkitAnimationDuration: ""
			});
			bar.className = "mblScrollableFadeOutScrollBar";
		};
		if(this._scrollBarV){
			f(this._scrollBarV);
			this._scrollBarV = null;
		}
		if(this._scrollBarH){
			f(this._scrollBarH);
			this._scrollBarH = null;
		}
		// added this to resize scrollbar wrapper, could also be hiding
		var f2 = function(wrapper, d, c, hd, v){
			if(!wrapper) return;
			var props = {};
			props[v ? "top" : "left"] = hd + 4 + "px"; // +4 is for top or left margin
			props[v ? "height" : "width"] = d - 8 + "px";
			dojo.style(wrapper, props);
		};
		var dim = this._dim;
		f2(this._scrollBarWrapperV, dim.d.h, dim.c.h, this.fixedHeaderHeight, true);
		f2(this._scrollBarWrapperH, dim.d.w, dim.c.w, 0);
	},
	resetScrollBar: function(){
		//	summary:
		//		Resets the scroll bar length, position, etc.
		var f = function(wrapper, bar, d, c, hd, v){
			if(!bar){ return; }
			var props = {};
			props[v ? "top" : "left"] = hd + 4 + "px"; // +4 is for top or left margin
			props[v ? "height" : "width"] = d - 8 + "px";
			dojo.style(wrapper, props);
			var l = Math.round(d * d / c); // scroll bar length
			l = Math.min(Math.max(l - 8, 5), d - 8); // -8 is for margin for both ends
			bar.style[v ? "height" : "width"] = l + "px";
			dojo.style(bar, {"opacity": 0.6,filter:"alpha(opacity=60)"});
		};
		// set this._dim to recalc globally (e.g. new content)
		var dim = this._dim = this.getDim();
		f(this._scrollBarWrapperV, this._scrollBarV, dim.d.h, dim.c.h, this.fixedHeaderHeight, true);
		f(this._scrollBarWrapperH, this._scrollBarH, dim.d.w, dim.c.w, 0);
		this.createMask();
	},
	addCover: function(){
		if(!dlagua.x.mobile.hasTouch && !this.noCover){
			if(!this._cover){
				this._cover = dojo.create("div", null, dojo.doc.body);
				dojo.style(this._cover, {
					backgroundColor: "#ffff00",
					opacity: 0,
					filter:"alpha(opacity=0)",
					position: "absolute",
					top: "0px",
					left: "0px",
					width: "100%",
					height: "100%",
					zIndex: 2147483647 // max of signed 32-bit integer
				});
				this._ch.push(dojo.connect(this._cover,
					dlagua.x.mobile.hasTouch ? "touchstart" : "onmousedown", this, "onTouchEnd"));
			}else{
				this._cover.style.display = "";
			}
		}
		this.setSelectable(this.domNode, false);
		var sel;
		if(dojo.global.getSelection){
			sel = dojo.global.getSelection();
			sel.collapse(dojo.doc.body, 0);
		}else{
			sel = dojo.doc.selection.createRange();
			sel.setEndPoint("EndToStart", sel);
			sel.select();
		}
	}
});