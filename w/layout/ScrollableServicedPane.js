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
	"dojo/query",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/dom-attr",
	"dojo/aspect",
	"dojo/Deferred",
	"dijit/layout/_LayoutWidget",
	"dijit/_Templated",
	"dlagua/x/mobile/Scrollable",
	"dlagua/w/layout/_PersvrMixin",
	"dlagua/w/layout/_PagedMixin",
	"dijit/form/Button",
	"dojox/mobile/sniff",
	"dlagua/c/store/JsonRest",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dlagua/c/rpc/FeedReader",
	"dlagua/c/Subscribable",
	"dojo/text!dlagua/w/layout/templates/ScrollableServicedPane.html",
	"dojox/mobile/parser",
	"dojox/mobile",
	"dojox/mobile/compat"
],function(declare,lang,array,event,win,fx,on,request,query,dom,domConstruct,domGeometry,domClass,domStyle,domAttr,aspect,Deferred,_LayoutWidget,_Templated,Scrollable,_PersvrMixin,_PagedMixin,Button,has,JsonRest,ScrollableServicedPaneItem,Memory,Cache,FeedReader,Subscribable,templateString){
return declare("dlagua.w.layout.ScrollableServicedPane",[Scrollable,_LayoutWidget, _Templated, _PersvrMixin,_PagedMixin, Subscribable],{
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
	loadingAnimation:true,
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
	height:"inherit",
	postscript:function(params, srcNodeRef){
		var args = arguments;
		if(window.fluxProcessor) {
			require(["dlagua/w/layout/_XFormMixin"],lang.hitch(this,function(_XFormMixin){
				declare.safeMixin(this,new _XFormMixin());
				this.inherited(args);
			}));
			return;
		}
		this.inherited(args);
	},
	startup: function(){
		if(this._started){ return; }
		this.listitems = [];
		this.itemnodesmap = {};
		this.orifilter = this.filter;
		// servicetype+locale will be set by loader
		this.own(
			this.watch("locale",this.forcedLoad),
			this.watch("reload",this.loadFromItem),
			this.watch("currentId",this.selectItemByCurrentId),
			this.watch("currentItem",this.loadFromItem)
		);
		var self = this;
		var node, params = {};
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
			node = dom.byId(this.fixedHeader);
			if(node.parentNode == this.domNode){ // local footer
				this.isLocalHeader = true;
			}
			params.fixedHeaderHeight = node.offsetHeight;
		} else {
			domStyle.set(this.fixedHeader,"display","none");
			params.fixedHeaderHeight = 0;
		}
		this.init(params);
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
			node = dom.byId(this.fixedFooter);
			if(node.parentNode == this.domNode){ // local footer
				this.isLocalFooter = true;
				node.style.bottom = "0px";
			}
			params.fixedFooterHeight = node.offsetHeight;
		} else {
			domStyle.set(this.fixedFooter,"display","none");
			params.fixedFooterHeight = 0;
		}
		this.init(params);
		this.inherited(arguments);
		if(this.count>this.maxCount) this.count = this.maxCount;
		// wait for any pub/sub loaders
		if(this.loadOnCreation) {
			console.log(this.id,"loadOnCreation")
			if(this.start>this.count) return;
			if(this.model || this.path) {
				this.forcedLoad();
			}
		}
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
	cancel:function(){
		var o = this.oldItem;
		var n = this.currentItem;
		// should we cancel oldItem and let currentItem take over?
		var props = this.reloadTriggerProperties.split(",");
		// if any of the keys below are different, cancel
		var cancel = this._beingDestroyed;
		if(!cancel && o) {
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
				if(this.results && this.results.fired==-1) {
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
	rebuild:function(item) {
		this.currentService = item.service;
		this.destroyDescendants();
		domStyle.set(this.containerNode,{
			top:0
		});
		if(this.useScrollBar) {
			this.scrollToInitPos();
		}
		if(this.loadingAnimation && this.footer) {
			domClass.add(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
		}
		this.selectedIndex = 0;
		this.selectedItem = null;
		this.listitems = [];
		this.itemnodesmap = {};
		if(this.servicetype=="persvr") {
			this._getSchema().then(lang.hitch(this,function(){
				var q = this.createQuery();
				var start = this.start;
				this.start += this.count;
				var results = this.results = this.store.query(q,{
					start:start,
					count:this.count,
					useXDomain:this.useXDomain
				});
				results.total.then(lang.hitch(this,function(total){
					this.total = total;
					if(total===0 || isNaN(total)) this.onReady();
				}));
				results.forEach(lang.hitch(this,this.addItem));
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
		if(this._loading) this.cancel();
		this.inherited(arguments);
	},
	onFlickAnimationEnd:function(e){
		if(e && e.srcElement){
			event.stopEvent(e);
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
			this.startTime = 0;
			// this really is dim reset
			this._dim = this.getDim();
		}
		this.inherited(arguments);
	},
	layout:function(){
		// moved from init() to support dynamically added fixed bars
		if(this.footer) {
			this.fixedFooterHeight = domGeometry.getMarginBox(this.fixedFooter).h;
		}
		this._appFooterHeight = (this.fixedFooterHeight && !this.isLocalFooter) ? this.fixedFooterHeight : 0;
		if(this.header) {
			this.fixedHeaderHeight = domGeometry.getMarginBox(this.fixedHeader).h;
			this.containerNode.style.paddingTop = this.fixedHeaderHeight + "px";
		}
		this.resetScrollBar();
		this.onTouchEnd();
		var _this = this;
		setTimeout(function(){
			if(!_this || _this._beingDestroyed) {
				return;
			}
			// recalc dim
			var pos = _this.getPos();
			_this.pageStore(pos.y);
		}, 100);
	},
	_initContent: function(item) {
		// setcontent = false will not set the content here
		var self = this;
		var listItem = new ScrollableServicedPaneItem({
			itemHeight:"auto"
		});
		var href = item.service+"/"+item.locale+"/"+item.path;
		if(item.type=="xform") {
			this.setXFormTarget(href);
			setTimeout(function(){
				self.onReady();
			},100);
		} else {
			request(href).then(function(res){
				listItem.set("content",res);
				setTimeout(function(){
					self.onReady();
				},10);
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
		var pos = this.getPos();
		this.showScrollBar();
		if(this.useScrollBar) {
			this.slideScrollBarTo(pos, 0.3, "ease-out");
		}
	}
});

});
