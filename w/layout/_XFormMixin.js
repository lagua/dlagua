define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/topic",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/query"
],function(declare,lang,array,topic,dom,domConstruct,domStyle,query){
return declare("dlagua.w.layout._XFormMixin",[],{
	xformTarget:"",
	xformLoaded: function(uri) {
		if(uri != this.xformTarget) return; 
		// make sure the DOM is moved
		var xfc = dom.byId("xformContainer");
		var dest = this.listitems[0];
		if(!xfc || !dest) return;
		dest.set("content","");
		query(">",xfc).forEach(function(node){
	    	dest.domNode.appendChild(node);
		})
		xfc.innerHTML = "";
		domStyle.set(xfc,"display","none");
	},
	setXFormTarget:function(href){
		this.xformTarget = href;
		if(fluxProcessor) {
			fluxProcessor.sendValue("xform-url",href);
			fluxProcessor.dispatchEventType("main","load-xform");
		}
	},
	xformUnloaded: function(ref) {
		if(fluxProcessor) {
			fluxProcessor.sendValue("xform-url","");
			fluxProcessor.dispatchEventType("main","unload-xform");
		}
		// make sure the DOM is moved
		var xfc = dom.byId("xformContainer");
		if(typeof ref == "string") ref = dijit.registry.byId(ref);
		array.forEach(ref.domNode.childNodes,function(node){
			node = lang.clone(node);
			xfc.appendChild(node);
		});
		ref.set("content","");
	},
	unloadXform:function(){
		if(this.listitems.length===0) return;
		console.log("unloading xform", this.listitems[0]);
		if(this.xformUnloaded) this.xformUnloaded(this.listitems[0]);
	},
	destroyRecursive: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroy the ContentPane and its contents
		if(this.servicetype=="xform") this.unloadXform();
		this.inherited(arguments);
	},
	rebuild:function(){
		if(this.servicetype=="xform") this.unloadXform();
		this.inherited(arguments);
	},
	startup:function(){
		var self = this;
		var reset = function(){
			if(!self.containerNode) return;
			// BF BUG update locale every time
			fluxProcessor.setLocale(dojo.locale.split("-")[0]);
			self._dim = self.getDim();
			self.showScrollBar();
			if(self.useScrollBar) {
				var pos = self.getPos();
				self.slideScrollBarTo(pos, 0.3, "ease-out");
			}
		}
		dojo.subscribe("/xf/ready",this,function(data){
			if(!this.containerNode) return;
			this.scrollToItem(0);
			setTimeout(reset,100);
		});
		dojo.connect(fluxProcessor,"dispatchEvent",function(xmlEvent){
			setTimeout(reset,100);
		});
		dojo.connect(fluxProcessor,"dispatchEventType",function(xmlEvent){
			setTimeout(reset,100);
		});
		dojo.connect(fluxProcessor,"_handleBetterFormLoadURI",function(xmlEvent){
			if(!self.containerNode || self.listitems.length===0 || !self.xformTarget) return;
			var uri = xmlEvent.contextInfo.uri;
			if(uri) uri = domConstruct.create("a",{href:uri}).pathname.replace(/^[^\/]/,'/');
			self.xformLoaded(uri);
			self.scrollToItem(0);
			setTimeout(reset,100);
		});
		this.inherited(arguments);
	}
});

});