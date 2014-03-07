define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/window",
	"dojo/topic",
	"dojo/on",
	"dojo/keys",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dijit/typematic",
	"dijit/form/Button",
	"dojox/timing"
],function(declare,lang,array,win,topic,on,keys,domClass,domGeometry,typematic,Button,timing) {
	return declare("dlagua.w.layout._PagedMixin",[],{
		maxCount:Infinity,
		pageSize:5,
		pageThreshold:50,
		childTemplate:"",
		snap:false,
		pageButtons:true,
		pageButtonPlacement:"HF", // prev in Header + next in Footer (default), or both in either Header or Footer
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
		_timer:null,
		autoSkipInterval:300,
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
			this._timer = new timing.Timer(this.autoSkipInterval);
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
						keyCode: keys.DOWN_ARROW, 
						ctrlKey: false, 
						altKey: false, 
						shiftKey: false, 
						metaKey: false
					}, this, this.skipNext, this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
					typematic.addListener(this.prevButton, this.domNode, {
						keyCode: keys.UP_ARROW, 
						ctrlKey: false, 
						altKey: false, 
						shiftKey: false, 
						metaKey: false
					}, this, this.skipPrev, this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
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
			if(cnt>-1) this.scrollToItem(this.selectedIndex-1);
		},
		skipNext:function(cnt) {
			if(cnt>-1) this.scrollToItem(this.selectedIndex+1);
		},
		_stopFiring: function(){
			this.MOUSE_UP.remove();
			this.MOUSE_UP = null;
			this._timer.stop();
			this._timer.onTick = function(){};
		},
		autoFire: function(dir) {
			if(this.MOUSE_UP) return;
			this.MOUSE_UP = on(win.body(),"onmouseup",lang.hitch(this,this._stopFiring));
			if(!this._timer.isRunning) {
				var _me = this;
				this._timer.onTick = function() {
					_me.skip(dir);
				};
				this._timer.start();
			}
		},
		scrollToItem: function(n) {
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
				items[n].domNode.scrollIntoView();
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
					this.total = total;
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
				if(dy!=0 && !this._bounce) this._bounce = {x:0,y:-y};
			}
			this.pageStore(py);
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
			var py = this.getPos().y;
			var li = this.getChildren();
			var len = li.length;
			if(!len) return;
			var y1=0, y2=0, i=0;
			var y = (this.header ? this.fixedHeaderHeight + this._containerInitTop : 0);
			// won't work for inline items
			for(;i<len;i++) {
				y1 = y-(0.5*li[(i>0 ? i-1 : i)].marginBox.h);
				y2 = li[i].marginBox.t+(0.5*li[i].marginBox.h);
				if(-py>=y1 && -py<y2 && !li[i].data.hidden) break;
				y = li[i].marginBox.t;
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
		onReady: function(){
			this.inherited(arguments);
			if(this._beingDestroyed || this.servicetype!="model") return;
			this.resize();
			// if needed, get more stuff from the store
			this.pageStore();
			// select currentId for #anchor simulation
			if(this.currentId) {
				this.selectItemByCurrentId();
			}
		}
	});
});