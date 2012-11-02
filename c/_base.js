define("dlagua/c/_base",["dojo"],function(dojo){
	dojo.mixin(dlagua.c._base,{
		addScript: function(url,callback) {
		    var script = document.createElement('script');
		    script.src = url;
		    if(navigator.appName == 'Microsoft Internet Explorer') {
		    	script.onreadystatechange= function () {
		    		if(script.readyState=='loaded' || script.readyState=='complete') {
		    			callback();
		    			script.onreadystatechange = null;
		    		}
		    	}
		    } else {
		    	script.onload = callback;
		    }
		    document.body.appendChild(script);
		},
		_addRQL: function(){
			require(["rql/parser","rql/query","rql/js-array"],function(rqlParser,rqlQuery,rqlArray){
				utils.rql = {
					Parser:rqlParser,
					Query:rqlQuery,
					Array:rqlArray
				}
			});
		},
		addRequirejs: function(){
			// pre-dojo-1.7 stuff
			var baseUrl = "/persvr/packages/";
			if(!window.require) {
				window.require = {
					baseUrl: baseUrl
				};
				dlagua.c.addScript(baseUrl+"requirejs/require.js",function(){
					if(!window.utils) window.utils = {};
					if(!utils.rql) {
						dlagua.c._addRQL();
					}
				});
			}
		}

	});
	return dlagua.c._base;
});