define("dlagua/c/rpc/I18nService", ["dojo", "dlagua/c/Subscribable"], function(dojo,Subscribable) {
	
return dojo.declare("dlagua.c.rpc.I18nService",[Subscribable],{
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
			load:dojo.hitch(this,function(res){
				this.ref.set("i18n", res);
			})
		});
	},
	postscript: function(mixin){
		if(mixin){
			dojo.mixin(this, mixin);
		}
		this.watch("locale",this._geti18n);
		this._geti18n();
	}
});

});