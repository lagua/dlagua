define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/request",
	"dojo/dom",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-style",
	"dlagua/x/mobile/Scrollable",
	"dijit/layout/_LayoutWidget",
	"dijit/Destroyable",
	"dijit/_TemplatedMixin",
	"dojo/text!./templates/ScrollableServicedPane.html",
	"dojox/mobile/parser",
	"dojox/mobile",
	"dojox/mobile/compat"
],function(declare,lang,request,dom,domGeometry,domClass,domStyle,Scrollable,_LayoutWidget,Destroyable,_TemplatedMixin,templateString){
return declare("dlagua.w.layout.ScrollablePane",[Scrollable, _LayoutWidget, Destroyable, _TemplatedMixin],{
	templateString:templateString,
	scrollBar:true,
	header:false,
	footer:false,
	loadingAnimation:true,
	href:"",
	content:"",
	headerLabel:"",
	footerLabel:"",
	baseClass:"dlaguaScrollablePane",
	useScrollBar:true,
	noTouch:true,
	noCover:true,
	height:"inherit",
	startup: function(){
		if(this._started){ return; }
		var self = this;
		var node, params = {};
		if(this.header) {
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
	},
	_setHrefAttr: function(href) {
		// setcontent = false will not set the content here
		var self = this;
		request(href).then(function(res){
			self.containerNode.innerHTML = res;
			setTimeout(function(){
				self.onReady();
			},10);
		});
	},
	_setContentAttr: function(content) {
		// setcontent = false will not set the content here
		var self = this;
		self.containerNode.innerHTML = content;
	},
	onReady: function(){
		if(this._beingDestroyed) return;
		console.log("done loading "+this.id);
		this._loading = false;
		if(this.loadingAnimation && this.footer) {
			domClass.remove(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
		}
		this.showScrollBar();
		if(this.useScrollBar) {
			this.slideScrollBarTo(this.getPos(), 0.3, "ease-out");
		}
	}
});

});
