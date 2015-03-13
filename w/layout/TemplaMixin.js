define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-geometry",
	"dojo/request",
	"dojo/Deferred",
	"dojo/promise/all",
	"dojo/date/stamp",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Contained",
	"mustache/mustache",
	"dlagua/c/templa/Mixin",
	"dojo/dom-attr",
	"dojo/query",
	"dojo/sniff"
],function(declare,lang,array,domGeometry,request,Deferred,all,stamp,_Widget,_Templated,_Contained,mustache,Mixin,domAttr,query,sniff) {

	var isIE = !!sniff("ie");
	
	return declare("dlagua.w.layout.TemplaMixin", [], {
		resolveProperties:null,
		schema:null,
		data:null,
		mixeddata:null,
		applyTemplate: function(tpl,partials){
			mustache.to_html(tpl,this.mixeddata,partials,lang.hitch(this,function(result){
				this.set("content",result);
				if(isIE){
					// IE style workaround
					query("*[data-style]",this.domNode).forEach(function(_){
						domAttr.set(_,"style",domAttr.get(_,"data-style"));
					});
				}
			}));
		},
		_setContentAttr: function(/*String|DomNode|Nodelist*/data){
			this._setContent(data || "");
			setTimeout(lang.hitch(this,function(){
				if(!this.containerNode) return;
				this.marginBox = this.data.hidden ? {l:0,t:0,w:0,h:0} : domGeometry.getMarginBox(this.containerNode);
			}),1);
		},
		resize:function() {
			this.inherited(arguments);
			if(!this.containerNode) return;
			this.marginBox = this.data.hidden ? {l:0,t:0,w:0,h:0} : domGeometry.getMarginBox(this.containerNode);
		}
	});

});