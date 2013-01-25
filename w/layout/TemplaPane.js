define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Deferred",
	"dijit/layout/ContentPane",
	"dlagua/w/layout/_PersvrMixin",
	"dlagua/w/layout/TemplaMixin",
	"dlagua/c/store/JsonRest",
	"dlagua/c/templa/Mixin"
],function(declare,lang,Deferred,ContentPane,_PersvrMixin,TemplaMixim,JsonRest,Mixin) {

	return declare("dlagua.w.layout.TemplaPane",[ContentPane,_PersvrMixin,TemplaMixin],{
		template:"",
		templateModule:"",
		service:"",
		model:"",
		idProperty:"",
		schema:null,
		data:null,
		store:null,
		startup: function(){
			this.inherited(arguments);
			if(this.service && this.model) {
				this._fetchTpl(this.template).then(lang.hitch(this,function(tpl){
					var tplo = this.parseTemplate(tpl);
					this.store = new JsonRest({
						target:this.service+"/"+this.model+"/",
						schemaUri:this.service+"/Class/"+this.model
					});
					this._getSchema().then(lang.hitch(this,function(sxs){
						if(sxs) {
							this.store.query().then(lang.hitch(this,function(res){
								this.data = {items:res};
								this._load().then(lang.hitch(this,function(sxs){
									if(sxs) {
										this.applyTemplate(tpl);
									}
								}))
							}));
						}
					}))
				}));
			}
		}
	});
	
});