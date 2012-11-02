define("dlagua/c/rpc/MetaService", ["dojo"], function(dojo) {

dlagua.c.rpc.MetaService = function(data) {
	var result = {};
	dojo.xhrGet({
		url:data.target,
		sync:true,
		handleAs:"json",
		header:{
			accept:"application/json",
			"content-type":"application/json"
		},
		load:function(res){
			result[data.property] = res[0].start.data;
			data.ref.meta = dojo.mixin(data.ref.meta,result);
			// replace all meta to replace any loaded variables
			for(var k in data.ref.nodes){
				var node = data.ref.nodes[k];
				if(node.data.type!="domain") data.ref.replaceMeta(node,"domain");
			}
		}
	});
}

return dlagua.c.rpc.MetaService;

});