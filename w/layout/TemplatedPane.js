define([
	"dojo/_base/declare",
	"dijit/layout/ContentPane",
	"dforma/_TemplatedMixin",
	"dlagua/w/Subscribable"
],function(declare,ContentPane,_TemplatedMixin,Subscribable) {
	return declare("dlagua.w.layout.TemplatedPane",[ContentPane,_TemplatedMixin,Subscribable],{
		templatePath:"",
		template:"",
		data:null,
		_setTemplateAttr:function(tpl){
			this.parseTemplate(tpl);
		},
		_setTemplatePathAttr:function(tplp){
			this.fetchTemplate(tplp);
		},
		_setDataAttr:function(data){
			this.data = data;
			this.onTemplate();
		},
		onTemplate:function(){
			this.set("content",this.renderTemplate(this.data || {}));
		}
	});
});