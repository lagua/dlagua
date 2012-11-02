define("dlagua/c/rpc/XformRest", ["dojo", "dlagua/c/rpc/ExistRest"], function(dojo) {

dojo.declare("dlagua.c.rpc.XformRest",[dlagua.c.rpc.ExistRest],{
	ref:null,
	loadItem: function(item,postfix,newItem) {
		if(fluxProcessor && this.ref) {
			fluxProcessor.setControlValue("xform-url",this.target+item.uri);
			fluxProcessor.dispatchEventType("main","load-xform");
			this.ref.onUnload = function(){
				console.log("unloading",this)
			}
		}
	}
});

});