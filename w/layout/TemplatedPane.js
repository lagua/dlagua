define([
	"dojo/_base/declare",
	"dijit/layout/ContentPane",
	"mustache/mustache",
	"dlagua/w/Subscribable"
],function(declare,ContentPane,mustache,Subscribable) {
	return declare("dlagua.w.layout.TemplatedPane",[ContentPane,Subscribable],{
		template:"",
		data:null,
		_setTemplateAttr:function(template){
			this.set("content",mustache.to_html(template,this.data,this.partials));
		},
		_setDataAttr:function(data){
			this.set("content",mustache.to_html(this.template,data,this.partials));			
		}
	});
});