define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/Deferred",
	"dojo/aspect",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dlagua/c/store/JsonRest",
	"dojo/topic",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dlagua/x/json/ref",
	"rql/query",
	"rql/parser",
	"dlagua/w/layout/ScrollableServicedPane"
],function(declare,lang,array,fx,Deferred,aspect,Memory,Cache,JsonRest,topic,domStyle,domGeometry,jsonref,rqlQuery,rqlParser,ScrollableServicedPane) {
	return declare("dlagua.w.layout._SwipeMixin",[],{
		servicetype:"persvr",
		scrollDir:"h",
		//height:"inherit",
		stores:{},
		scrollBar:false,
		locked:false,
		useScrollBar:false,
		startup:function(){
			this.inherited(arguments);
		},
		layout:function(){
			this.inherited(arguments);
			var w = this._dim.v.w;
			this.containerNode.style.width = this.total > 0 ? w*this.total+"px" : "inherit";
			var h = this._dim.v.h;
			this.containerNode.style.height = h+"px";
			array.forEach(this.getChildren(),function(_){
				var node = _.domNode;
				var cs = domStyle.getComputedStyle(node);
				var me = domGeometry.getMarginExtents(node, cs);
				var be = domGeometry.getBorderExtents(node, cs);
				var pe = domGeometry.getPadExtents(node, cs);
				_.domNode.style.height = h - me.h - be.h - pe.h +"px";
				_.domNode.style.width = w+"px";
				_.layout();
			});
			this.scrollToItem(this.selectedIndex);
		},
		isScrollable:function(){
			return false;
		},
		_getSchema:function(){
			var d = new Deferred;
			if(this.schema) {
				d.resolve();
				return d;
			}
			// prevent getting schema again
			if(!this.schemaUri || this.schemaUri!=this.store.schemaUri) {
				this.schemaUri = this.store.schemaUri;
				this.store.getSchema(this.store.schemaUri,{useXDomain:(this.useXDomain)}).then(lang.hitch(this,function(schema){
					this.schema = schema;
					for(var k in schema.properties) {
						if(schema.properties[k].primary) this.idProperty = k;
						if(schema.properties[k].hrkey) this.hrProperty = k;
					}
					this.store.idProperty = this.idProperty;
					d.resolve();
				}));
			} else {
				d.resolve();
			}
			return d;
		},
		loadFromItem:function(prop,oldValue,newValue){
			if(!this._allowLoad(oldValue,newValue)) return;
			if(this._loading) {
				console.warn("Aborting SSP loading!")
				this.cancel();
			} else {
				console.warn("reload!",this.id);
			}
			// resetters
			this._loading = true;
			this.start = 0;
			this.total = 0;
			this.reload = false;
			//this.idProperty = this.hrProperty = "";
			this.childrenReady = 0;
			if(this.servicetype=="persvr") {
				var item = lang.mixin({},this.currentItem);
				if(!item.service) item.service = (this.service || "/persvr/");
				var model = "Page";
				var target = item.service+model+"/";
				var schemaUri = item.service+"Class/"+model;
				// reset if triggered by currentItem
				if(arguments.length>0) {
					this.sort = this.filter = this.orifilter = "";
					this.filters = this.orifilters = null;
				}
				if(!this.newsort && item.sort) this.sort = item.sort;
				if(item.filter) this.orifilter = this.filter = item.filter;
				if(!this.stores[target]) {
					this.store = new JsonRest({
						target:target,
						schemaUri:schemaUri
					});
					this.stores[target] = new Cache(this.store, new Memory());
				} else {
					this.store = this.stores[target];
				}
				this.rebuild(item);
			}
		},
		rebuild:function(){
			this.inherited(arguments);
			if(this.servicetype=="persvr") {
				var item = lang.mixin({},this.currentItem);
				this.total = item.children ? item.children.length : 0;
				if(this.total===0 || isNaN(this.total)) {
					this.addItem(item,0,[]);
					this.onReady();
					return;
				}
				jsonref.refAttribute = "_ref";
				var store = this.store;
				item = jsonref.resolveJson(item,{
					loader:function(callback,d){
						store.get(this["_ref"]).then(function(item){
							callback(item,d);
						});
					}
				});
				item.children.forEach(lang.hitch(this,this.addItem));
				this.onReady();
			}
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
		onTouchMove:function(e){
			if(this.locked) return;
			var n = this._time.length; // # of samples
			if(n >= 2){
				// Check the direction of the finger move.
				// If the direction has been changed, discard the old data.
				var x0 = this._posX[n - 1] - this._posX[n - 2];
				var y0 = this._posY[n - 1] - this._posY[n - 2];
				if(Math.abs(x0) > 0) {
					console.log("lock child", x0)
					this.childlocked = true;
				}
			}
			this.inherited(arguments);
		},
		addItem:function(item,index,items,insertIndex) {
			if(this._beingDestroyed) return;
			var content = "";
			var x = this._dim.v.w;
			var props = lang.mixin({
				id:"content_"+index,
				"class":"dlaguaSwipeContainerChild",
				parent:this,
				currentItem:item,
				style:"position:relative;display:inline-block;width:"+x+"px;zoom:1;*display:inline;"
			},this.params);
			delete props.region;
			delete props.id;
			var listItem = new ScrollableServicedPane(props);
			// TODO: set when selected
			if(item._loadObject) {
				var self = this;
				item._loadObject(function(item){
					listItem.currentItem = item;
				});
			}
			var self = this;
			aspect.after(listItem,"onTouchEnd",function(){
				this.locked = self.locked = false;
			},true);
			aspect.after(listItem,"onTouchMove",function(e){
				this.locked = self.childlocked;
				if(self.locked || this.locked) return;
				if(e.target.className=="mblScrollBar" || e.target.className=="mblScrollBarWrapper") {
					self.locked = true;
					//return;
				}
				var n = this._time.length; // # of samples
				if(n >= 2){
					// Check the direction of the finger move.
					// If the direction has been changed, discard the old data.
					var y0 = this._posY[n - 1] - this._posY[n - 2];
					if(Math.abs(y0) > 6) {
						console.log("lock parent")
						self.locked = true;
					}
				}
			},true);
			this.listitems.push(listItem);
			fx.fadeIn({node:listItem.containerNode}).play();
			this.childrenReady++;
			if(this.childrenReady == items.length) {
				this.onReady();
			}
			var id = item.id || item._ref;
			this.itemnodesmap[id] = listItem;
			this.addChild(listItem,insertIndex);
		},
		scrollToItem: function(n) {
			// FIXME item should not scroll beyond min/max
			var len = this.listitems.length;
			if(n>=len || n<0) return;
			var x = this._dim.v.w * n;
			this.slideTo({x:0,x:-x},0.3,"ease-out");
		},
		selectItemByCurrentId: function(prop,oldVal,newVal){
			if(this._beingDestroyed || !newVal || oldVal==newVal) return;
			var item = this.itemnodesmap[newVal];
			if(!item) return;
			this.currentId = null;
			if(this.selectedItem && this.selectedItem == item) return;
			//item.scrollTo({x:0,y:0});
			var index = item.getIndexInParent();
			this.scrollToItem(index);
			item.loadFromItem();
		},
		setSelectedItem: function(index) {
			var px = this.getPos().x;
			var dim = this._dim;
			var len = this.listitems.length;
			// snap
			var x = dim.v.w * index;
			var dx = x+px;
			// FIXME: for border, but margin may differ
			if(dx==1 || dx==-1) dx = 0;
			if(dx!=0 && !this._bounce) this._bounce = {x:-x,y:0};
			if(this.selectedIndex==index) return;
			this.selectedIndex = index;
			this.selectedItem = this.listitems[index];
			//this.selectedItem.scrollTo({x:0,y:0});
			console.log("selectedItem",this.selectedItem);
			if(this.id && this.listitems && this.listitems.length) topic.publish("/components/"+this.id,this.listitems[index].currentItem);
			//this.selectedItem.loadFromItem();
		},
		checkSelectedItem: function(){
			// get proximate item
			// BIG FIXME!: py is NOT safe for borders / gutters
			var px = this.getPos().x;
			var li = this.listitems;
			var len = li.length;
			if(!len) return;
			var x=0, x1=0, x2=0, i=0;
			var w = this._dim.v.w;
			// won't work for inline items
			for(;i<len;i++) {
				x1 = x-0.5*w
				x2 = x+0.5*w;
				if(-px>=x1 && -px<x2) break;
				x += w;
			}
			if(i>=len) i=0;
			this.setSelectedItem(i);
		},
		onFlickAnimationEnd:function(e){
			if(!this._bounce){
				this.checkSelectedItem();
			}
			this.locked = this.childlocked = false;
			this.inherited(arguments);
		},
		onReady: function(){
			this.inherited(arguments);
			if(this._beingDestroyed) return;
			this.layout();
			// select currentId for #anchor simulation
			if(this.currentId) {
				this.selectItemByCurrentId("currentId",null,this.currentId);
			}
		}
	});
});