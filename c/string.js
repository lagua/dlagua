define([
"dojo/_base/lang",
"module"
],function(lang,module){

var exports = {
	// summary:
	//		This modules defines dlagua/c/math functions for e.g. template modifiers
};

lang.setObject(module.id.replace(/\//g, "."), exports);

exports.replace = function(val,options) {
	var pat = options.pattern;
	var rep = options.replace;
	if(pat instanceof Array){
		rep = rep instanceof Array ? rep : [rep];
		for(var i=0,l=pat.length;i<l;i++){
			val = val.replace(pat[i],rep[i] || "");
		}
	} else if(rep instanceof Array){
		// FIXME
		val = val.replace(options.pattern,function(){
			var args = Array.prototype.slice.call(arguments);
			var match = args.shift();
			var ret = "";
			for(var i=0,l=args.length-2;i<l;i++){
				ret += (rep[i] || ""); 
			}
			return ret;
		});
	} else {
		val = val.replace(options.pattern,rep);
	}
	return val;
};

return exports;

});