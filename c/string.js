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
	if(typeof pat=="string" && typeof rep=="string"){
		val = val.replace(options.pattern,rep);
	} else if(pat instanceof Array && rep instanceof Array){
		for(var i=0,l=pat.length;i<l;i++){
			val = val.replace(pat[i],rep[i] || "");
		}
	} else if(typeof rep=="object" && rep instanceof Array){
		val = val.replace(options.pattern,function(){
			var args = Array.prototype.slice.call(arguments);
			var match = args.shift();
			var ret = "";
			for(var i=0,l=args.length-2;i<l;i++){
				ret += (rep[i] || ""); 
			}
			return ret;
		});
	}
	return val;
};

return exports;

});