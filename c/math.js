define([
"dojo/_base/lang",
"module"
],function(lang,module){

var exports = {
	// summary:
	//		This modules defines dlagua/c/math functions for e.g. template modifiers
};

lang.setObject(module.id.replace(/\//g, "."), exports);

exports.multiply = function(val,options) {
	return val*options.x;
};

exports.add = function(val,options) {
	return val+options.x;
};

exports.subtract = function(val,options) {
	return val-options.x;
};


return exports;

});