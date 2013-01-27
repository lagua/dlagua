define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/query",
],function(declare,lang,array,dom,domStyle,query){
return declare("dlagua.w.layout._XFormMixin",[],{
	xformTarget:null,
	xformLoaded: function() {
		// make sure the DOM is moved
		var xfc = dom.byId("xformContainer");
		var dest = this.xformTarget;
		if(!xfc || !dest) return;
		dest.set("content","");
		query(">",xfc).forEach(function(node){
	    	dest.domNode.appendChild(node);
		});
		xfc.innerHTML = "";
		domStyle.set(xfc,"display","none");
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
		var xfc = dom.byId("xformContainer");
		if(lang.isString(ref)) ref = dijit.registry.byId(ref);
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
	}
});

});