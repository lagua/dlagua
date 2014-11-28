define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/fx",
	"dojo/fx",
	"dojo/fx/easing",
	"dojo/request",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/parser",
	"dlagua/w/layout/ScrollableServicedPaneItem",
	"dijit/layout/_LayoutWidget",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/ScrollableServicedPane.html"
],function(declare,lang,fx,dfx,easing,request,dom,domConstruct,domGeometry,domClass,domStyle,parser,ScrollableServicedPaneItem,_LayoutWidget,_TemplatedMixin,templateString){
	
return declare("dlagua.w.layout._ScrollableServicedPane",[_LayoutWidget, _TemplatedMixin],{
	itemnodesmap:null,
	templateString:templateString,
	idProperty:"id",
	hrProperty:"",
	filter:"",
	sort:"",
	base:"",
	filters:null,
	orifilters:null,
	childrenReady:0,
	selectedIndex:0,
	selectedItem:null,
	itemHeight:0,
	template:"",
	templateModule:null,
	scrollBar:true,
	header:false,
	footer:false,
	href:"",
	content:"",
	oldItem:null,
	service:"",
	locale:"",
	path:"",
	newData:null,
	scrollDir:"v",
	servicetype:"",
	labelAttr:"title",
	templateProperty:"path",
	headerLabel:"",
	footerLabel:"",
	loadingAnimation:true,
	loadOnCreation:true,
	currentService:"",
	resolveProperties:"",
	allowedLoadDepth:0,
	filterById:"",
	reloadTriggerProperties:"path,locale,type",
	reload:false,
	filterByLocale:true,
	baseClass:"dlaguaScrollableServicedPane",
	useScrollBar:true,
	height:"inherit",
	nativeScroll:true,
	flex:false, // TODO add flex solution
	_containerInitTop:0,
	startup: function(){
		if(this._started){ return; }
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
			this._containerInitTop = domGeometry.getPadExtents(this.containerNode).t;
			node = dom.byId(this.fixedHeader);
			if(node.parentNode == this.domNode){ // local footer
				this.isLocalHeader = true;
			}
			params.fixedHeaderHeight = node.offsetHeight;
		} else {
			domStyle.set(this.fixedHeader,"display","none");
			params.fixedHeaderHeight = 0;
		}
		if(this.footer) {
			node = dom.byId(this.fixedFooter);
			if(node.parentNode == this.domNode){ // local footer
				this.isLocalFooter = true;
				//node.style.bottom = "0px";
			}
			params.fixedFooterHeight = node.offsetHeight;
		} else {
			domStyle.set(this.fixedFooter,"display","none");
			params.fixedFooterHeight = 0;
		}
		if(this.nativeScroll) {
			lang.mixin(this,params);
			/*domStyle.set(this.containerNode,{
				overflow:"auto",
				WebkitOverflowScrolling: "touch"
			});*/
			this.useScrollBar = false;
		} else {
			this.init(params);
		}
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
				this.servicetype = (this.model ? "model" : "page");
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
			case "model":
				if(this.results && this.results.fired==-1) {
					this.results.cancel();
				}
			break;
		}
	},
	_allowLoad:function(oldValue,newValue){
		if(this._beingDestroyed || !this.currentItem) return;
		if(!this.currentItem.locale) this.currentItem.locale = this.locale;
		/*
		 * TODO: should this be generic 'escape on same item' check?
		if(oldValue) {
				var same = true;
				for(var k in newValue) {
					if(newValue[k] instanceof Object || k.substr(0,2) == "__") continue;
					if(oldValue.hasOwnProperty(k) && oldValue[k] !== newValue[k]) {
						same = false;
						break;
					}
				}
				if(same) {
					console.warn("StatefulController", this.id, "escaping on same item")
					return;
				}
			}
		 */
		console.log("reload?",this.id,this.reload)
		var o = oldValue;
		var n = newValue;
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
		return true;
	},
	loadFromItem: function(prop,oldValue,newValue) {
		if(!this._allowLoad(oldValue,newValue)) return;
		if(this._loading) {
			console.warn("Aborting SSP loading!")
			this.cancel();
		} else {
			console.warn("reload!",this.id);
		}
		// resetters
		this._loading = true;
		this.reload = false;
		//this.idProperty = this.hrProperty = "";
		this.childrenReady = 0;
		// make a shallow copy to compare next load
		var item = lang.mixin({},this.currentItem);
		// copy type if have one
		if(item.type) this.servicetype = item.type;
		this.oldItem = item;
		if(this.servicetype=="model" || this.servicetype=="atom") {
			this.template = this.getTemplate();
		}
		// set servicetype now as last resort
		switch(this.servicetype) {
			case "model":
			case "form":
			case "atom":
				// find in mixin
				break;
			case "page":
				if(!item.service) item.service = this.base+"rest";
				this.rebuild(item);
				break;
		}
	},
	scrollTo:function(pos){
		if(this.nativeScroll) {
			this.containerNode.scrollLeft = pos.x;
			this.containerNode.scrollTop = pos.y;
		}
	},
	slideTo:function(to,duration,easing) {
		var self = this;
		var s = dfx.slideTo({
			node: this.containerNode,
			duration: duration*1000,
			left: to.x,
			top: to.y,
			easing: (easing == "ease-out") ? easing.quadOut : easing.linear,
			onEnd: function(){
				self.onFlickAnimationEnd();
			}
		}).play();
	},
	rebuild:function(item) {
		this.currentService = item.service;
		this.destroyDescendants();
		this.scrollTo({x:0,y:0});
		if(this.loadingAnimation && this.footer) {
			domClass.add(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
		}
		this._tplo = {};
		this.selectedIndex = 0;
		this.selectedItem = null;
		this.itemnodesmap = {};
		if(this.servicetype=="model") {
			// find in _PervsMixin
		} else if(this.servicetype=="form") {
			// find in _FormMixin
		} else if(this.servicetype=="atom") {
        	// find in _AtomMixin
		} else if(this.servicetype=="page") {
			if(item) {
				this._initContent(item);
			} else {
				this.ready();
			}
		}
	},
	startSelect:function(){
		domClass.toggle(this.domNode,"dlaguaSSPSelect",true);
		this.inherited(arguments);
	},
	endSelect:function(){
		domClass.toggle(this.domNode,"dlaguaSSPSelect",false);
		this.inherited(arguments);
	},
	startDrag:function(){
		domClass.toggle(this.domNode,"dlaguaSSPDrag",true);
		this.inherited(arguments);
	},
	onTouchEnd:function(){
		domClass.toggle(this.domNode,"dlaguaSSPDrag",false);
		this.inherited(arguments);
	},
	destroyRecursive: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroy the ContentPane and its contents
		if(this._loading) this.cancel();
		this.inherited(arguments);
	},
	layout:function(){
		// moved from init() to support dynamically added fixed bars
		if(this.footer) {
			this.fixedFooterHeight = domGeometry.getMarginBox(this.fixedFooter).h;
		}
		this._appFooterHeight = (this.fixedFooterHeight && !this.isLocalFooter) ? this.fixedFooterHeight : 0;
		if(!this._dim || this.nativeScroll) this._dim = this.getDim();
		if(this.header) {
			this.fixedHeaderHeight = domGeometry.getMarginBox(this.fixedHeader).h;
			domStyle.set(this.containerNode,this.nativeScroll ? "marginTop" : "paddingTop", this.fixedHeaderHeight + this._containerInitTop + "px");
		}
		if(!this.flex) {
			if(this.nativeScroll) {
				var h = this._dim.d.h;
				domStyle.set(this.containerNode, "height",h+"px");
			} else {
				var w = this._dim.v.w-(this._scrollBarV ? 13 : 0);
				domStyle.set(this.containerNode,"width",w+"px");				
			}
		}
		if(!this.nativeScroll) this.resetScrollBar();
		this.onTouchEnd();
		this.layoutChildren();
	},
	getPos: function(){
		if(this.nativeScroll) {
			return {x:-this.containerNode.scrollLeft,y:-this.containerNode.scrollTop};
		}
		return this.inherited(arguments);
	},
	getDim: function(){
		if(this.nativeScroll) {
			// summary:
			//		Returns various internal dimensional information needed for calculation.
			var h = this.containerNode.style.height;
			var st = this.containerNode.scrollTop;
			this.containerNode.style.height = "auto";
			var d = {};
			// content width/height
			d.c = {h:this.containerNode.offsetHeight, w:this.containerNode.offsetWidth};
	
			// view width/height
			d.v = {h:this.domNode.offsetHeight + this._appFooterHeight, w:this.domNode.offsetWidth};
			// display width/height
			d.d = {h:d.v.h - this.fixedHeaderHeight - this.fixedFooterHeight - this._appFooterHeight - this._containerInitTop, w:d.v.w};
	
			// overflowed width/height
			d.o = {h:d.c.h - d.v.h + this.fixedHeaderHeight + this.fixedFooterHeight + this._appFooterHeight, w:d.c.w - d.v.w};
			this.containerNode.style.height = h;
			this.containerNode.scrollTop = st;
			return d;
		}
		return this.inherited(arguments);
	},
	layoutChildren: function(){
		var children = this.getChildren(),
			widget,
			i = 0;
		while(widget = children[i++]){
			if(widget.resize){
				widget.resize();
			}
		}
	},
	_setHeaderLabelAttr:function(val) {
		this.headerLabelNode.innerHTML = val;
		parser.parse(this.headerLabelNode);
	},
	_setFooterLabelAttr:function(val) {
		this.footerLabelNode.innerHTML = val;
		parser.parse(this.footerLabelNode);
	},
	_initContent: function(item) {
		// setcontent = false will not set the content here
		var self = this;
		var listItem = new ScrollableServicedPaneItem({
			itemHeight:"auto"
		});
		var href = item.service+"/"+item.locale+"/"+item.path;
		request(href).then(function(res){
			listItem.set("content",res);
			setTimeout(function(){
				self.ready();
			},10);
		});
		this.addChild(listItem);
		this.itemnodesmap[item[this.idProperty]] = listItem;
		fx.fadeIn({node:listItem.containerNode}).play();
	},
	ready: function(){
		this._loading = false;
		if(this._beingDestroyed) return;
		console.log("done loading "+this.id);
		if(this.loadingAnimation && this.footer) {
			domClass.remove(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
		}
		if(this.useScrollBar) {
			this.showScrollBar();
			this.slideScrollBarTo(this.getPos(), 0.3, "ease-out");
		}
		this.inherited(arguments);
	}
});

});