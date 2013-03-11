define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/window",
	"dojo/_base/event",
	"dojo/_base/fx",
	"dojo/topic",
	"dojo/aspect",
	"dojo/on",
	"dojo/keys",
	"dojo/dom-class",
	"dijit/typematic",
	"dijit/form/Button",
	"dojox/timing",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"rql/query",
	"rql/parser"
],function(declare,lang,array,win,event,fx,topic,aspect,on,keys,domClass,typematic,Button,timing,ScrollableServicedPaneItem,rqlQuery,rqlParser) {
	return declare("dlagua.w.layout._PagedMixin",[],{
		start:0,
		count:25,
		maxCount:Infinity,
		pageSize:5,
		total:Infinity,
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
					}, this, function(){
						this.skip(1);
					}, this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
					typematic.addListener(this.prevButton, this.domNode, {
						keyCode: keys.UP_ARROW, 
						ctrlKey: false, 
						altKey: false, 
						shiftKey: false, 
						metaKey: false
					}, this, function(){
						this.skip(-1);
					}, this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
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
			this.own(
				this.watch("filter",function(){
					console.log(this.id,"reloading from filter",this.filter)
					this.orifilter = this.filter;
					this.forcedLoad();
				}),
				this.watch("filterById",this.forcedLoad),
				this.watch("newData",function(){
					array.forEach(this.newData,lang.hitch(this,function(item,i,items){
						this.addItem(item,i,items,"first");
						this.currentId = item[this.idProperty];
					}));
				}),
				this.watch("filters",this.onFilters),
				this.watch("sort",function(){
					this.newsort = true;
					this.forcedLoad();
					this.newsort = false;
				}),
				this.watch("childTemplate",function(){
					this.replaceChildTemplate();
				})
			);
		},
		onFilters:function(){
			if(!this.orifilters) {
				this.orifilters = this.filters;
			} else {
				this.orifilters = lang.mixin(this.orifilters,this.filters);
			}
			this.filters = null;
			var fa = new rqlQuery.Query();
			var keys = {};
			for(var k in this.orifilters){
				if(this.orifilters[k].checked) {
					var fo = rqlParser.parseQuery(this.orifilters[k].filter);
					fo.walk(function(name,terms){
						var k = terms[0];
						var v;
						if(terms.length>1) v = terms[1];
						if(keys[k]) {
							fa = fa.or();
						}
						if(v) {
							fa = fa[name](k,v);
						} else {
							fa = fa[name](k);
						}
					});
				}
			}
			if(this.orifilter) {
				var oo = rqlParser.parseQuery(this.orifilter);
				oo.walk(function(name,terms){
					var k = terms[0];
					var v;
					if(terms.length>1) v = terms[1];
					if(keys[k]) {
						fa = fa.or();
					}
					if(v) {
						fa = fa[name](k,v);
					} else {
						fa = fa[name](k);
					}
				});
			}
			this.filter = fa.toString();
			this.forcedLoad();
		},
		replaceChildTemplate: function(child,templateDir) {
			if(!templateDir) templateDir = this.templateDir;
			var template = this.getTemplate(templateDir);
			this._fetchTpl(template).then(lang.hitch(this,function(tpl){
				this.parseTemplate(tpl).then(function(tplo){
					if(child && child!="childTemplate"){
						child.applyTemplate(tplo.tpl,tplo.partials);
					} else {
						// FIXME: is this really permanent?
						this._tplo = tplo;
						array.forEach(this.listitems,function(li){
							li.applyTemplate(tplo.tpl,tplo.partials);
						});
					}
				});
			}));
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
			var index = item.getIndexInParent();
			this.scrollToItem(index);
		},
		skip:function(dir) {
			var nxt = this.selectedIndex+dir;
			this.scrollToItem(nxt);
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
			var len = this.listitems.length;
			if(n>=len || n<0) return;
			var y = 0;
			if(this.itemHeight) { 
				y = this.itemHeight*n;
			} else {
				for(var i=0; i<Math.min(n,len); i++) {
					y += this.listitems[i].marginBox.h;
				}
			}
			this.slideTo({x:0,y:-y},0.3,"ease-out");
		},
		pageStore:function(py){
			if(this._loading) return;
			if(!py) py = this.getPos().y;
			var dim = this._dim;
			var len = this.listitems.length;
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
			if(this.selectedIndex==index) return;
			this.selectedIndex = index;
			var py = this.getPos().y;
			var dim = this._dim;
			var len = this.listitems.length;
			if(this.snap) {
				var y = 0;
				if(this.itemHeight) { 
					y = this.itemHeight*index;
				} else {
					for(var i=0; i<Math.min(index,len); i++) {
						y += this.listitems[i].marginBox.h;
					}
				}
				var dy = y+py;
				// FIXME: for border, but margin may differ
				if(dy==1 || dy==-1) dy = 0;
				if(dy!=0 && !this._bounce) this._bounce = {x:0,y:-y};
			}
			this.selectedItem = this.listitems[index];
			console.log("selectedItem",this.selectedItem);
			if(this.id && this.listitems && this.listitems.length) topic.publish("/components/"+this.id,this.listitems[index].data);
			this.pageStore(py);
		},
		createQuery:function(){
			var qo = this.query ? rqlParser.parseQuery(this.query) : new rqlQuery.Query();
			if(this.filterByLocale) qo = qo.eq("locale",this.locale);
			if(this.filter) {
				// try to parse it first
				var fo = rqlParser.parseQuery(this.filter);
				fo.walk(function(name,terms){
					var k = terms[0];
					var v;
					if(terms.length>1) v = terms[1];
					if(v) {
						if(typeof v == "string") v = v.replace("undefined","*");
						qo = qo[name](k,v);
					} else {
						qo = qo[name](k);
					}
				});
			}
			if(this.filterByItemProperties) {
				var ar = this.filterByItemProperties.split(",");
				for(var i in ar) {
					var k = ar[i];
					if(k in this.currentItem) {
						var v = this.currentItem[k];
						qo = qo.eq(k,v);
					}
				}
			}
			if(this.filterById) {
				qo = qo.eq(this.idProperty,this.filterById);
			}
			if(this.sort) {
				qo = qo.sort(this.sort);
			}
			return "?"+qo.toString();
		},
		checkSelectedItem: function(){
			// get proximate item
			// BIG FIXME!: py is NOT safe for borders / gutters
			var py = this.getPos().y;
			var li = this.listitems;
			var len = li.length;
			var y=0, y1=0, y2=0, i=0;
			var h = this.itemHeight;
			// won't work for inline items
			for(;i<len;i++) {
				y1 = (h ? y-0.5*h : y-(0.5*li[(i>0 ? i-1 : i)].marginBox.h));
				y2 = (h ? y+0.5*h : y+(0.5*li[i].marginBox.h));
				if(-py>=y1 && -py<y2) break;
				y += (h ? h : li[i].marginBox.h);
			}
			if(i>=len) i=0;
			this.setSelectedItem(i);
		},
		onFlickAnimationEnd:function(e){
			if(!this._bounce){
				this.checkSelectedItem();
			}
		},
		getModel:function(){
			return this.model || this.currentItem.model;
		},
		getTemplate:function(templateDir){
			var xtemplate = "";
			var item = this.currentItem;
			if(!item) return;
			if(!templateDir) templateDir = this.templateDir;
			if(!this.childTemplate && item[this.templateProperty]) {
				var tpath = item[this.templateProperty];
				if(this.templateProperty=="path" && this.filterById) {
					var ar = tpath.split("/");
					var i;
					for(i=0;i<ar.length;i++){
						if(ar[i]==this.filterById) {
							break;
						}
					}
					tpath = ar.splice(0,i).join("/");
				}
				xtemplate = (templateDir ? templateDir+"/" : "")+tpath+(this.filterById ? "_view.html" : ".html");
			}
			return item.locale+"/"+(this.childTemplate ? this.childTemplate : xtemplate);
		},
		addItem:function(item,index,items,insertIndex) {
			if(this._beingDestroyed) return;
			var content = "";
			var id = item[this.idProperty];
			var listItem = new ScrollableServicedPaneItem({
				parent:this,
				data:item,
				itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
			});
			this.listitems.push(listItem);
			aspect.after(listItem,"onLoad",lang.hitch(this,function(){
				// as this can take a while, listItem may be destroyed in the meantime
				if(this._beingDestroyed || listItem._beingDestroyed) return;
					listItem.applyTemplate(this._tplo.tpl,this._tplo.partials);
					fx.fadeIn({node:listItem.containerNode}).play();
					this.childrenReady++;
					if(this.childrenReady == items.length) {
						// wait for the margin boxes to be set
						setTimeout(lang.hitch(this,function(){
							this.onReady();
						}),10);
					}
					this.itemnodesmap[item[this.idProperty]] = listItem;
			}));
			this.addChild(listItem,insertIndex);
		},
		onReady: function(){
			if(this._beingDestroyed) return;
			if(this.loadingAnimation && this.footer) {
				domClass.remove(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
			}
			// if needed, get more stuff from the store
			this.pageStore();
			// select currentId for #anchor simulation
			if(this.currentId) {
				this.selectItemByCurrentId();
			}
		}
	});

});