dojo.provide("dlagua.x.mobile.compat");
dojo.require("dojox.mobile.compat");

if(!dojo.isWebKit){
	dojox.mobile.getCssPaths = function(){
		var paths = [];
		var i, j;
	
		// find @import
		var s = dojo.doc.styleSheets;
		for(i = 0; i < s.length; i++){
			var r;
			try {
				r = s[i].cssRules || s[i].imports;
			} catch(e) {
				console.warn("dojox.mobile.compat CSS checks called but failed.");
			}
			if(!r){ continue; }
			for(j = 0; j < r.length; j++){
				if(r[j].href){
					paths.push(r[j].href);
				}
			}
		}
		
		// find <link>
		var elems = dojo.doc.getElementsByTagName("link");
		for(i = 0, len = elems.length; i < len; i++){
			if(elems[i].href){
				paths.push(elems[i].href);
			}
		}
		return paths;
	};
}