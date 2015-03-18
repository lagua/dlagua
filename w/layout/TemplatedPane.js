define([
	"dojo/_base/declare",
	"dijit/layout/ContentPane",
	"dforma/_TemplatedMixin",
	"dlagua/w/Subscribable"
],function(declare,ContentPane,_TemplatedMixin,Subscribable) {
	return declare("dlagua.w.layout.TemplatedPane",[ContentPane,_TemplatedMixin,Subscribable],{
		templatePath:"",
		data:null,
		_setTemplatePathAttr:function(tpl){
			this.fetchTemplate(tpl);
		},
		_setDataAttr:function(data){
			this.renderTemplate(data);
		},
		onTemplate:function(){
			this.renderTemplate(this.data);
		}
	});
});