dojo.provide("dlagua.x.html.styles");
dojo.require("dojox.html.styles");
(function(){
	dlagua.x.html.styles.insertCssRule = function(/*String*/selector, /*String*/declaration, /*String*/styleSheetName){
		var ss = dojox.html.getStyleSheet(styleSheetName).ownerNode;
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
})();