dojo.provide("dlagua.w.layout._XFormMixin");
dojo.declare("dlagua.w.layout._XFormMixin",[],{
	xformTarget:null,
	xformLoaded: function() {
		// make sure the DOM is moved
		var xfc = dojo.byId("xformContainer");
		var dest = this.xformTarget;
		if(!xfc || !dest) return;
		this.xformTarget = null;
		dest.set("content","");
		dojo.query(">",xfc).forEach(function(node){
	    	dest.domNode.appendChild(node);
		});
		xfc.innerHTML = "";
		dojo.style(xfc,"display","none");
	},
	setXFormTarget:function(target,href){
		this.xformTarget = target;
		if(fluxProcessor) {
			fluxProcessor.setControlValue("xform-url",href);
			fluxProcessor.dispatchEventType("main","load-xform");
		}
	},
	xformUnloaded: function(ref) {
		if(fluxProcessor) {
			fluxProcessor.setControlValue("xform-url","");
			fluxProcessor.dispatchEventType("main","unload-xform");
		}
		// make sure the DOM is moved
		var xfc = dojo.byId("xformContainer");
		if(dojo.isString(ref)) ref = dijit.byId(ref);
		dojo.forEach(ref.domNode.childNodes,function(node){
			node = dojo.clone(node);
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
			self._dim = self.getDim();
			self.showScrollBar();
			if(self.useScrollBar) {
				var pos = self.getPos();
				self.slideScrollBarTo(pos, 0.3, "ease-out");
			}
		}
		dojo.subscribe("/xf/ready",this,function(data){
			this.xformLoaded();
			self.scrollToItem(0);
			setTimeout(reset,100);
		});
		dojo.connect(fluxProcessor,"dispatchEvent",function(xmlEvent){
			setTimeout(reset,100);
		});
		dojo.connect(fluxProcessor,"dispatchEventType",function(xmlEvent){
			setTimeout(reset,100);
		});
		dojo.connect(fluxProcessor,"_handleBetterFormLoadURI",function(xmlEvent){
			self.scrollToItem(0);
			setTimeout(reset,100);
		});
		this.inherited(arguments);
	}
});