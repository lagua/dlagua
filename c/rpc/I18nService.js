define(["dojo/_base/declare","dojo/_base/lang","dlagua/c/Subscribable"], function(declare,lang,Subscribable) {
	
	return declare("dlagua.c.rpc.I18nService",[Subscribable],{
		locale:"",
		domain:"",
		target:"",
		ref:null,
		_geti18n:function(){
			dojo.xhrGet({
				url:this.target,
				handleAs:"json",
				sync:true,
				content:{
					locale:this.locale
				},
				headers:{
					accept:"application/json",
					"content-type":"application/json"
				},
				load:lang.hitch(this,function(res){
					this.ref.set("i18n", res);
				})
			});
		},
		postscript: function(mixin){
			if(mixin){
				lang.mixin(this, mixin);
			}
			this.watch("locale",this._geti18n);
			this._geti18n();
		}
	});

});