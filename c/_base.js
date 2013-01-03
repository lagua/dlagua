define("dlagua/c/_base",["dojo"],function(dojo){
	dojo.mixin(dlagua.c._base,{
		addScript: function(url,callback,id) {
			var s = "script", d = document;
			if(id && d.getElementById(id)) {
				callback();
				return;
			}
			var script = d.createElement(s);
			script.src = url;
			if(id) script.id = id;
			if(navigator.appName == "Microsoft Internet Explorer") {
				script.onreadystatechange= function () {
					if(script.readyState=="loaded" || script.readyState=="complete") {
						callback();
						script.onreadystatechange = null;
					}
				}
			} else {
				script.onload = callback;
			}
			var fjs = d.getElementsByTagName(s)[0];
			fjs.parentNode.insertBefore(script,fjs);
		},
		addCss:function(_css,title) {
			var s = "link", d = document;
			var css = d.createElement(s);
			css.href= _css;
			css.rel = "stylesheet";
			if(title) css.title = title;
			var first = d.getElementsByTagName(s)[0];
			first.parentNode.insertBefore(css,first);
		},
		_addRQL: function(){
			var d = new dojo.Deferred();
			require(["rql/parser","rql/query","rql/js-array"],function(rqlParser,rqlQuery,rqlArray){
				persvr.rql = {
					Parser:rqlParser,
					Query:rqlQuery,
					Array:rqlArray
				}
				d.callback(true);
			});
			return d;
		},
		addRequirejs: function(){
			var d = new dojo.Deferred();
			// pre-dojo-1.7 stuff
			var baseUrl = "/persvr/packages/";
			if(!window.require) {
				window.require = {
					baseUrl: baseUrl
				};
				dlagua.c._base.addScript(baseUrl+"requirejs/require.js",function(){
					if(!window.persvr) window.persvr = {};
					if(!window.persvr.rql) {
						dlagua.c._base._addRQL().then(function(){
							d.callback(true);
						});
					} else {
						d.callback(true);
					}
				});
			} else {
				d.callback(true);
			}
			return d;
		}
	});
	return dlagua.c._base;
});