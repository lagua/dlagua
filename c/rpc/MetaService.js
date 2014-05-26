define([
	"dojo/_base/lang",
	"dojo/io-query",
	"dojo/request"
], function(lang,ioQuery,request) {

lang.getObject("dlagua.c.rpc", true);

var MetaService = function(data) {
	var result = {};
	var query = data.query;
	var hasQ = query && query.charAt(0)=="?";
	var qstr = query ? hasQ ? query : "?" + query : "";
	request(data.target+qstr,{
		sync:true,
		handleAs:"json",
		headers:{
			accept:"application/json",
			"content-type":"application/json"
		}
	}).then(function(res){
		result[data.property] = res[0].data;
		data.ref.meta = dojo.mixin(data.ref.meta,result);
		// replace all meta to replace any loaded variables
		for(var k in data.ref.nodes){
			var node = data.ref.nodes[k];
			if(node.data.type!="domain") data.ref.replaceMeta(node,"domain");
		}
	});
}

dlagua.c.rpc.MetaService = MetaService;
return MetaService;

});