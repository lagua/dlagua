define(["dojo/_base/lang", "dojox/lang/functional"], function(lang, df){
	var dlf = lang.getObject("dlagua.x.lang.functional", true);
	
	dlf.lambda = function(s) {
		x = df.lambda(s);
		return x.apply(null,this);
	}
	
	return dlf;
	
});