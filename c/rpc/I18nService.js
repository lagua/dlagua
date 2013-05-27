define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/request",
	"dlagua/w/Subscribable"
], function(declare,lang,request,Subscribable) {
	
	return declare("dlagua.c.rpc.I18nService",[Subscribable],{
		locale:"",
		domain:"",
		target:"",
		ref:null,
		_geti18n:function(){
			request(this.target,{
				handleAs:"json",
				sync:true,
				query:{
					locale:this.locale
				},
				headers:{
					accept:"application/json",
					"content-type":"application/json"
				}
			}).then(lang.hitch(this,function(res){
				this.ref.set("i18n", res);
			}));
		},
		postscript: function(mixin){
			if(mixin){
				lang.mixin(this, mixin);
			}
			this.own(this.watch("locale",this._geti18n));
			this._geti18n();
		}
	});

});