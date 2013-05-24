define("dlagua/c/string/toProperCase", ["dojo/_base/lang"], function(lang) {
lang.getObject("dlagua.c.string", true);
dlagua.c.string.toProperCase = function(/*String*/ value, force){
	return value.replace(/\w\S*/g, function(txt){
		return txt.charAt(0).toUpperCase() + (force ? txt.substr(1).toLowerCase() : txt.substr(1));
	});
};

String.prototype.toProperCase = function(force) {
	return dlagua.c.string.toProperCase(this,force);
}

return dlagua.c.string.toProperCase;

});