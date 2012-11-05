define("dlagua/c/string/toProperCase", ["dojo"], function(dojo) {

dlagua.c.string.toProperCase = function(/*String*/ value){
	return value.charAt(0).toUpperCase() + value.substring(1,value.length).toLowerCase();
};

String.prototype.toProperCase = function() {
	return dlagua.c.string.toProperCase(this);
}

return dlagua.c.string.toProperCase;

});