//TODO:
/* take apart ScrollablePane and _ServicedMixin
 * make services require plugin RPCs
 * move persvr to RPC
 * make _MustacheTemplatableMixin -> move hasDeferredContent there?
 * take out skip / autofire / timer and add param for plugin
 * dynamic loading of modules:
 * make JSON / ATOM / XML pluggable, require first
 */
define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/event",
	"dojo/_base/window",
	"dojo/_base/fx",
	"dojo/on",
	"dojo/request",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/topic",
	"dojo/aspect",
	"dojo/Deferred",
	"dijit/layout/_LayoutWidget",
	"dijit/_Templated",
	"dlagua/x/mobile/_ScrollableMixin",
	"dijit/form/Button",
	"dojox/timing",
	"dojox/mobile/sniff",
	"dlagua/c/store/JsonRest",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dlagua/c/rpc/FeedReader",
	"persvr/rql/query",
	"persvr/rql/parser",
	"dlagua/c/Subscribable",
	"dojo/text!dlagua/w/layout/templates/ScrollableServicedPane.html",
	"dojox/mobile/parser",
	"dojox/mobile",
	"dojox/mobile/compat"
],function(declare,lang,array,event,win,fx,on,request,domGeom,domStyle,topic,aspect,Deferred,_LayoutWidget,_Templated,_ScrollableMixin,Button,timing,has,JsonRest,ScrollableServicedPaneItem,Memory,Cache,FeedReader,rqlQuery,rqlParser,Subscribable,templateString){
return declare("dlagua.w.layout.ScrollableServicedPane",[_LayoutWidget, _Templated, _ScrollableMixin, Subscribable],{
	store:null,
	stores:{},
	listitems:null,
	itemnodesmap:null,
	idProperty:"id",
	hrProperty:"",
	hasDeferredContent:false,
	filter:"",
	sort:"",
	filterByItemProperties:"",
	filters:null,
	orifilters:null,
	schema:null,
	schemata:{},
	_ch:null,
	childrenReady:0,
	selectedIndex:0,
	selectedItem:null,
	itemHeight:0,
	template:"",
	childTemplate:"",
	templateModule:null,
	scrollBar:true,
	header:false,
	footer:false,
	snap:false,
	query:"",
	href:"",
	content:"",
	oldItem:null,
	service:"",
	locale:"",
	path:"",
	newData:null,
	servicetype:"",
	labelAttr:"title",
	templateProperty:"path",
	start:0,
	count:25,
	maxCount:Infinity,
	pageSize:5,
	total:Infinity,
	headerLabel:"",
	footerLabel:"",
	pageButtons:true,
	loadOnCreation:true,
	currentService:"",
	resolveProperties:"",
	allowedLoadDepth:0,
	filterById:"",
	reloadTriggerProperties:"path,locale,type",
	reload:false,
	_timer:null,
	autoSkipInterval:300,
	filterByLocale:true,
	baseClass:"dlaguaScrollableServicedPane",
	templateString:templateString,
	useScrollBar:true,
	startup: function(){
		if(this._started){ return; }
		if(!has('touch')){
			this.connect(this.containerNode, (!has('mozilla') ? "onmousewheel" : "DOMMouseScroll"), this.onScroll);
		}
		this._timer = new timing.Timer(this.autoSkipInterval);
		var params={};
		this.listitems = [];
		this.itemnodesmap = {};
		this.orifilter = this.filter;
		// servicetype+locale will be set by loader
		this.own(
			this.watch("locale",this.forcedLoad),
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
			this.watch("reload",this.loadFromItem),
			this.watch("filters",this.onFilters),
			this.watch("sort",function(){
				this.newsort = true;
				this.forcedLoad();
				this.newsort = false;
			}),
			this.watch("childTemplate",function(){
				this.replaceChildTemplate();
			}),
			this.watch("currentId",this.selectItemByCurrentId),
			this.watch("currentItem",this.loadFromItem)
		);
		var self = this;
		if(this.header) {
			if(this.pageButtons) {
				this.prevButton = new Button({
					label:"Prev",
					showLabel:false,
					"class":"dlaguaScrollableServicedPanePrevButton",
					onMouseDown:function(){
						self.autoFire(-1);
					},
					onClick:function(){
						self.skip(-1);
					}
				});
				this.fixedHeader.appendChild(this.prevButton.domNode);
			}
			params.fixedHeaderHeight = domGeom.getMarginBox(this.fixedHeader).h;
		} else {
			domStyle.set(this.fixedHeader,"display","none");
			params.fixedHeaderHeight = 0;
		}
		if(this.footer) {
			if(this.pageButtons) {
				this.nextButton = new Button({
					label:"Next",
					showLabel:false,
					"class":"dlaguaScrollableServicedPaneNextButton",
					onMouseDown:function(){
						self.autoFire(1);
					},
					onClick:function(){
						self.skip(1);
					}
				});
				this.fixedFooter.appendChild(this.nextButton.domNode);
			}
			params.fixedFooterHeight = domGeom.getMarginBox(this.fixedFooter).h;
		} else {
			domStyle.set(this.fixedFooter,"display","none");
			params.fixedFooterHeight = 0;
		}
		this.init(params);
		if(this.count>this.maxCount) this.count = this.maxCount;
		// wait for any pub/sub loaders
		if(this.loadOnCreation) {
			console.log(this.id,"loadOnCreation")
			if(this.start>this.count) return;
			if(this.model || this.path) {
				this.forcedLoad();
			}
		}
		this.inherited(arguments);
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
	forcedLoad: function(){
		this.reload = true;
		if(this.model || this.path) {
			// set default servicetype
			if(!this.servicetype) {
				this.servicetype = (this.model ? "persvr" : "page");
			}
			this.currentItem = {
				path: this.path,
				model:this.model
			};
		}
		this.loadFromItem();
	},
	_fetchTpl: function(template) {
		// TODO add xdomain fetch
		return request(require.toUrl(this.templateModule)+"/"+template);
	},
	replaceChildTemplate: function(child,templateDir) {
		if(!templateDir) templateDir = this.templateDir;
		var template = this.getTemplate(templateDir);
		this._fetchTpl(template).then(lang.hitch(this,function(tpl){
			if(child && child!="childTemplate"){
				child.applyTemplate(tpl);
			} else {
				dojo.forEach(this.listitems,function(li){
					li.applyTemplate(tpl);
				});
			}
		}));
	},
	getSchema:function(){
		var d = new Deferred;
		// prevent getting schema again
		if(this.schemata[this.store.schemaUri]) {
			this.schemaUri = this.store.schemaUri;
			var schema = this.schema = this.schemata[this.schemaUri];
			for(var k in schema.properties) {
				if(schema.properties[k].primary) this.idProperty = k;
				if(schema.properties[k].hrkey) this.hrProperty = k;
			}
			this.store.idProperty = this.idProperty;
			d.resolve(true);
			return d;
		}
		if(!this.schemaUri || this.schemaUri!=this.store.schemaUri) {
			this.schemaUri = this.store.schemaUri;
			this.store.getSchema(this.store.schemaUri).then(lang.hitch(this,function(schema){
				this.schema = schema;
				this.schemata[this.schemaUri] = schema;
				for(var k in schema.properties) {
					if(schema.properties[k].primary) this.idProperty = k;
					if(schema.properties[k].hrkey) this.hrProperty = k;
				}
				this.store.idProperty = this.idProperty;
				d.resolve(true);
			}));
		} else {
			d.resolve(true);
		}
		return d;
	},
	cancel:function(){
		var o = this.oldItem;
		var n = this.currentItem;
		// should we cancel oldItem and let currentItem take over?
		var props = this.reloadTriggerProperties.split(",");
		// if any of the keys below are different, cancel
		var cancel = false;
		if(o) {
			for(var i=0;i<props.length;i++) {
				var p = props[i];
				if(p in n && p in o && n[p]!=o[p]) {
					cancel = true;
					break;
				}
			}
		}
		if(!cancel) return;
		switch(o.type || this.servicetype) {
			case "persvr":
				if(this.results.fired==-1) {
					this.results.cancel();
				}
			break;
		}
	},
	loadFromItem: function() {
		if(this._beingDestroyed || !this.currentItem) return;
		if(!this.currentItem.locale) this.currentItem.locale = this.locale;
		console.log("reload?",this.id,this.reload)
		var o = this.oldItem;
		var n = this.currentItem;
		var allowdepth = parseInt(this.allowedLoadDepth);
		if(allowdepth && allowdepth!=n.__depth) return;
		if(!this.reload) {
			// if all of the keys below are the same, don't reload
			var props = this.reloadTriggerProperties.split(",");
			if(o) {
				var reload = false;
				for(var i=0;i<props.length;i++) {
					var p = props[i];
					if(p in n && p in o && n[p]!=o[p]) {
						reload = true;
						break;
					}
				}
				if(!reload) return;
			}
		}
		if(this._loading) {
			console.warn("Aborting SSP loading!")
			this.cancel();
		} else {
			console.warn("reload!",this.id,n);
		}
		// resetters
		this._loading = true;
		this.start = 0;
		this.total = 0;
		this.reload = false;
		this.hasDeferredContent = false;
		//this.idProperty = this.hrProperty = "";
		this.childrenReady = 0;
		// make a shallow copy to compare next load
		var item = lang.mixin({},this.currentItem);
		// copy type if have one
		if(item.type) this.servicetype = item.type;
		this.oldItem = item;
		if(this.servicetype=="xform") {
			this.servicetype = "page";
		} else if(this.servicetype=="persvr" || this.servicetype=="atom") {
			this.template = this.getTemplate();
		}
		switch(this.servicetype) {
			case "persvr":
				if(!item.service) item.service = (this.service || "/persvr/");
				if(!item.model) return;
				var model = item.model;
				var target = item.service+model+"/";
				var schemaUri = item.service+"Class/"+model;
				if(!this.newsort && item.sort) this.sort = item.sort;
				if(item.filter) this.orifilter = this.filter = item.filter;
				if(!this.store) {
					this.store = new JsonRest({
						target:target,
						schemaUri:schemaUri
					});
					if(this.stores) {
						if(!this.stores[target]) {
							this.stores[target] = new Cache(this.store, new Memory());
						}
					}
				} else {
					this.store.target = target;
					this.store.schemaUri = schemaUri;
				}
				break;
			case "atom":
				if(!item.service) item.service = (this.service || "/atom/content");
				break;
			default:
				if(!item.service) item.service = (this.service || "/xbrota/rest");
				break;
		}
		this.rebuild(item);
	},
	selectItemByCurrentId: function(){
		if(this._beingDestroyed) return;
		var item = this.itemnodesmap[this.currentId];
		if(!item) return;
		this.currentId = null;
		var index = item.getIndexInParent();
		this.scrollToItem(index);
	},
	rebuild:function(item) {
		this.currentService = item.service; 
		this.destroyDescendants();
		domStyle.set(this.containerNode,{
			top:0
		});
		var lh = aspect.after(this,"onReady",function(){
			lh.remove();
			if(this.useScrollBar) {
				this.showScrollBar();
				this.scrollToInitPos();
			}
		});
		this.selectedIndex = 0;
		this.selectedItem = null;
		this.listitems = [];
		this.itemnodesmap = {};
		if(this.servicetype=="persvr") {
			this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
				this.tpl = tpl;
				this.getSchema().then(lang.hitch(this,function(){
					var q = this.createQuery();
					var start = this.start;
					this.start += this.count;
					var results = this.results = this.store.query(q,{
						start:start,
						count:this.count
					});
					results.total.then(lang.hitch(this,function(total){
						this.total = total;
						if(total===0 || isNaN(total)) this.onReady();
					}));
					results.forEach(lang.hitch(this,this.addItem));
				}));
			}));
		} else if(this.servicetype=="atom") {
        	var fr = new FeedReader();
        	fr.read(item.service+"/"+item.path).then(lang.hitch(this,function(items){
        		var total = items.length;
        		this.total = total;
				if(total===0 || isNaN(total)) {
					this.onReady();
				} else {
					array.forEach(items,this.addItem,this);
				}
        	}));
		} else {
			if(item) {
				this._initContent(item);
			} else {
				this.onReady();
			}
		}
	},
	
	destroyRecursive: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroy the ContentPane and its contents
		this.inherited(arguments);
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
	setSelectedItem: function(index) {
		this.selectedIndex = index;
		var py = this.getPos().y;
		var dim = this.getDim();
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
		if(this.id) topic.publish("/components/"+this.id,this.listitems[index].data);

		if(this.store && -py>=dim.o.h && len<this.total && this.total<this.maxCount) {
			// try to get more stuff from the store...
			var count = (this.pageSize || this.count);
			if(this.start+count>this.maxCount) return;
			if(this.start+count>=this.total) count = this.total-this.start;
			var start = this.start;
			this.start += count;
			var q = this.createQuery();
			var results = this.results = this.store.query(q,{
				start:start,
				count:count
			});
			results.total.then(lang.hitch(this,function(total){
				this.total = total;
			}));
			results.forEach(lang.hitch(this,this.addItem));
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
	onFlickAnimationEnd: function(e){
		this.checkSelectedItem();
		this.inherited(arguments);
	},
	resize: function(changeSize, resultSize) {
		_LayoutWidget.prototype.resize.apply(this,arguments);
		this.inherited(arguments);
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
		var content = "";
		var id = item[this.idProperty];
		var listItem = new ScrollableServicedPaneItem({
			parent:this,
			data:item,
			itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
		});
		this.listitems.push(listItem);
		aspect.after(listItem,"onLoad",lang.hitch(this,function(){
			if(this._beingDestroyed) return;
			listItem.applyTemplate(this.tpl);
			fx.fadeIn({node:listItem.containerNode}).play();
			this.childrenReady++;
			if(this.childrenReady == this.listitems.length) this.onReady();
			this.itemnodesmap[item[this.idProperty]] = listItem;
		}));
		this.addChild(listItem,insertIndex);
	},
	_initContent: function(item) {
		// setcontent = false will not set the content here
		var self = this;
		var listItem = new ScrollableServicedPaneItem({
			itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
		});
		var href = item.service+"/"+item.locale+"/"+item.path;
		if(item.type=="xform") {
			this.setXFormTarget(listItem,href);
			setTimeout(function(){
				self.onReady();
			},100);
		} else {
			request(href,{
			}).then(function(res){
				listItem.set("content",res);
				setTimeout(function(){
					self.onReady();
				},1);
			});
		}
		this.listitems.push(listItem);
		this.addChild(listItem);
		this.itemnodesmap[item[this.idProperty]] = listItem;
		fx.fadeIn({node:listItem.containerNode}).play();
	},
	onReady: function(){
		console.log("done loading "+this.id);
		this._loading = false;
		this.resetScrollBar();
		// select currentId for #anchor simulation
		if(this.currentId) this.selectItemByCurrentId();
	}
});

});
