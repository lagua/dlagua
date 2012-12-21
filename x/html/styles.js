dojo.provide("dlagua.x.html.styles");
dojo.require("dojox.html.styles");
(function(){
	dlagua.x.html.insertCssRule = function(/*String*/selector, /*String*/declaration, /*String*/styleSheetName){
		var ss = dlagua.x.html.getStyleSheet(styleSheetName).ownerNode;
		if(!ss) ss = dojox.html.getDynamicStyleSheet(styleSheetName);
		if(!ss._indicies) ss._indicies = [];
		var styleText = selector + " {" + declaration + "}";
		console.log("insertRule:", styleText)
		if(dojo.isIE){
			// Note: check for if(ss.cssText) does not work
			ss.cssText+=styleText;
			console.log("ss.cssText:", ss.cssText)
		}else if(ss.sheet){
			ss.sheet.insertRule(styleText, ss._indicies.length);
		}else{
			ss.appendChild(dojo.doc.createTextNode(styleText));
		}
		ss._indicies.push(selector+" "+declaration);
		return selector; // String
	}
	dlagua.x.html.getStyleSheet = function(/*String*/styleSheetName){
		if(!styleSheetName) return false;
		var allSheets = dojox.html.getStyleSheets();
		// now try document style sheets by name
		if(allSheets[styleSheetName]){
			return dojox.html.getStyleSheets()[styleSheetName];
		}
		// check for partial matches in hrefs (so that a fully
		//qualified name does not have to be passed)
		for(var nm in allSheets){
			if(allSheets[nm].href && allSheets[nm].href.indexOf(styleSheetName)>-1){
				return allSheets[nm];
			}
		}
		return false; //StyleSheet or false
	}
})();