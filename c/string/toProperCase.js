define("dlagua/c/string/toProperCase", ["dojo/_base/lang"], function(lang) {
lang.getObject("dlagua.c.string", true);
dlagua.c.string.toProperCase = function(/*String*/ value){
	return value.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

String.prototype.toProperCase = function() {
	return dlagua.c.string.toProperCase(this);
}

return dlagua.c.string.toProperCase;

});