define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/window",
	"dojo/_base/fx",
	"dojo/topic",
	"dojo/on",
	"dojo/aspect",
	"dojo/keys",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dijit/typematic",
	"dijit/form/Button",
	"dojox/timing"
],function(declare,lang,array,win,baseFx,topic,on,aspect,keys,domClass,domGeometry,typematic,Button,timing) {
	return declare("dlagua.w.layout._PagedMixin",[],{
		maxCount:Infinity,
		pageSize:5,
		pageThreshold:25,
		scrollTransition:500,
		childTemplate:"",
		snap:false,
		pageButtons:true,
		pageButtonPlacement:"HF", // prev in Header + next in Footer (default), or both in either Header or Footer
		// subsequentDelay:
		//		if > 1, the number of milliseconds until the 3->n events occur
		//		or else the fractional time multiplier for the next event's delay, default=0.9
		// initialDelay:
		//		the number of milliseconds until the 2nd event occurs, default=500ms
		// minDelay:
		//		the minimum delay in milliseconds for event to fire, default=10ms
		initialDelay: 500,
		minDelay: 5,
		subsequentDelay: 0.5,
		destroyRecursive: function(/*Boolean*/ preserveDom){
			// summary:
			//		Destroy the ContentPane and its contents
			if(this.pageButtons) {
				this.prevButton.destroy();
				this.nextButton.destroy();
			}
			this.inherited(arguments);
		},
		startup:function(){
			if(this._started) return;
			this.inherited(arguments);
			if(this.pageButtons) {
				this.prevButton = new Button({
					label:"Prev",
					showLabel:false,
					"class":"dlaguaScrollableServicedPanePrevButton"
				});
				this.nextButton = new Button({
					label:"Next",
					showLabel:false,
					"class":"dlaguaScrollableServicedPaneNextButton"
				});
				this.own(
					typematic.addListener(this.nextButton, this.domNode, {
						keyCode: keys.DOWN_ARROW
					}, this, this.skipNext, this.subsequentDelay, this.initialDelay, this.minDelay),
					typematic.addListener(this.prevButton, this.domNode, {
						keyCode: keys.UP_ARROW
					}, this, this.skipPrev, this.subsequentDelay, this.initialDelay, this.minDelay),
					this.watch("focused",function(){
						if(this.focused) {
							try{ this.domNode.focus(); }catch(e){/*quiet*/}
						} else {
							try{ this.domNode.blur(); }catch(e){/*quiet*/}
						}
					})
				);
				var pp = this.pageButtonPlacement;
				var prevTrgt = (pp[0]=="H") ? this.fixedHeader : this.fixedFooter;
				var nextTrgt = (pp[1]=="H") ? this.fixedHeader : this.fixedFooter;
				prevTrgt.appendChild(this.prevButton.domNode);
				nextTrgt.appendChild(this.nextButton.domNode);
			}
			if(this.nativeScroll) {
				var delay = 250;
				var timeout = null;
				this.own(
					on(this.containerNode,"scroll",lang.hitch(this,function(){
						clearTimeout(timeout);
						timeout = setTimeout(lang.hitch(this,function(){
					        this.onFlickAnimationEnd();
					    }),delay);
					}))
				);
			}
		},
		layout:function(){
			this.inherited(arguments);
			var _this = this;
			setTimeout(function(){
				if(!_this || _this._beingDestroyed) {
					return;
				}
				// recalc dim
				var pos = _this.getPos();
				_this.pageStore(pos.y);
			}, 10);
		},
		selectItemByCurrentId: function(){
			if(this._beingDestroyed) return;
			var item = this.itemnodesmap[this.currentId];
			if(!item) {
				// force more stuff from the store
				this.pageStore(-Infinity);
				return;
			}
			this.currentId = null;
			if(this.selectedItem && this.selectedItem == item) return;
			var index = item.getIndexInParent();
			this.scrollToItem(index);
		},
		skipPrev:function(cnt) {
			if(cnt>-1) this.scrollToItem(this.selectedIndex-1,cnt);
		},
		skipNext:function(cnt) {
			if(cnt>-1) this.scrollToItem(this.selectedIndex+1,cnt);
		},
		scrollToItem: function(n,cnt) {
			// FIXME item should not scroll beyond min/max
			var items = this.getChildren();
			var len = items.length;
			if(n>=len || n<0) return;
			var y = 0;
			var top = this.header ? this.fixedHeaderHeight + this._containerInitTop : 0;
			if(items[n]) {
				y = items[n].marginBox.t - top;
			}
			if(this.nativeScroll) {
				var self = this;
				if(this.scrollTransition && cnt<1){
					new baseFx.Animation({
						beforeBegin: function(){
							if(this.curve){ delete this.curve; }
							this.curve = new baseFx._Line(self.containerNode.scrollTop,y);
						},
						onAnimate: (function(val){
							self.containerNode.scrollTop = val;
						}),
						duration:this.scrollTransition
					}).play();
				} else {
					this.containerNode.scrollTop = y;
				}
			} else {
				this.slideTo({x:0,y:-y},0.3,"ease-out");
			}
		},
		pageStore:function(py){
			if(this._loading || this.servicetype!="model" || !this._dim || this._dim.o.h<=0) return;
			if(!py) py = this.getPos().y;
			var dim = this._dim;
			var threshold = Math.round(dim.o.h * this.pageThreshold/100); 
			py -= threshold;
			var items = this.getChildren();
			var len = items.length;
			if(this.store && -py>=dim.o.h && len<this.total && this.total<this.maxCount) {
				// try to get more stuff from the store...
				this._loading = true;
				this.childrenReady = 0;
				if(this.loadingAnimation && this.footer) {
					domClass.add(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
				}
				var count = (this.pageSize || this.count);
				if(this.start+count>this.maxCount) return;
				if(this.start+count>=this.total) count = this.total-this.start;
				var start = this.start;
				this.start += count;
				var q = this.createQuery();
				var results = this.results = this.store.query(q,{
					start:start,
					count:count,
					useXDomain:this.useXDomain
				});
				results.total.then(lang.hitch(this,function(total){
					this.total = parseInt(total,10);
					if(this.total===0 || isNaN(this.total)) this.ready();
				}));
				results.forEach(lang.hitch(this,this.addItem));
			}
		},
		setSelectedItem: function(index) {
			if(this._loading || this.servicetype!="model") return;
			var py = this.getPos().y;
			var dim = this._dim;
			var items = this.getChildren();
			var len = items.length;
			var top = this.header ? this.fixedHeaderHeight + this._containerInitTop : 0;
			if(this.snap) {
				var y = items[index] && items[index].marginBox.t - top;
				var dy = y+py;
				// FIXME: for border, but margin may differ
				if(dy==1 || dy==-1) dy = 0;
				if(dy!=0 && !this._bounce && !this.nativeScroll) this._bounce = {x:0,y:-y};
			}
			this.pageStore(py);
			if(this.pageButtons) {
				this.prevButton.set("disabled",index<=0);
				this.nextButton.set("disabled",index>=len-1);
			}
			if(this.selectedIndex==index) return;
			this.selectedIndex = index;
			this.selectedItem = items[index];
			if(this.id && len) {
				topic.publish("/components/"+this.id,items[index].data);
				var id = items[index].data[this.idProperty];
				topic.publish("/components/"+this.id+"/currentId",id);
			}
		},
		checkSelectedItem: function(){
			if(this._loading || this.servicetype!="model") return;
			// get proximate item
			// BIG FIXME!: py is NOT safe for borders / gutters
			var li = this.getChildren();
			var len = li.length;
			if(!len) return;
			var p = this.getPos();
			if(this.scrollDir=="v") {
				var py = p.y;
				var y1=0, y2=0, i=0;
				var y = (this.header ? this.fixedHeaderHeight + this._containerInitTop : 0);
				// won't work for inline items
				for(;i<len;i++) {
					y1 = y-(0.5*li[(i>0 ? i-1 : i)].marginBox.h);
					y2 = li[i].marginBox.t+(0.5*li[i].marginBox.h);
					if(-py>=y1 && -py<y2 && !li[i].data.hidden) break;
					y = li[i].marginBox.t;
				}
			} else if(this.scrollDir=="h") {
				var px = p.x;
				var x1=0, x2=0, i=0;
				var x = 0;
				// won't work for inline items
				for(;i<len;i++) {
					x1 = x-(0.5*li[(i>0 ? i-1 : i)].marginBox.w);
					x2 = li[i].marginBox.l+(0.5*li[i].marginBox.w);
					if(-px>=x1 && -px<x2 && !li[i].data.hidden) break;
					x = li[i].marginBox.l;
				}
			}
			if(i>=len) i=0;
			this.setSelectedItem(i);
		},
		onFlickAnimationEnd:function(e){
			if(!this._bounce && this.servicetype=="model"){
				this.checkSelectedItem();
			}
			this.inherited(arguments);
		},
		ready: function(){
			this.inherited(arguments);
			if(this._beingDestroyed || this.servicetype!="model") return;
			this.resize();
			// if needed, get more stuff from the store
			this.pageStore();
			// select currentId for #anchor simulation
			if(this.currentId) {
				this.selectItemByCurrentId();
			} else {
				this.checkSelectedItem();
			}
		}
	});
});