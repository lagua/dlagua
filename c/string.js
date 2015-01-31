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
	return val.replace(options.pattern,options.replace);
};

return exports;

});