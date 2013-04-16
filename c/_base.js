dojo.provide("dlagua.c._base");
dojo.getObject("dlagua.c._base",true);

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
		var h = d.getElementsByTagName("head")[0];
		h.appendChild(css);
	},
	addBase:function(_base) {
		var d = document;
		var h = d.getElementsByTagName("head")[0];
		var base = domConstruct.create("base",{
			href: _base
		},h);
	}
});
