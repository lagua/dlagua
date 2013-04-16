dojo.provide("dlagua.c.string.cleanWhitespace");

dlagua.c.string._cleanWhitespaceRecursive = function(node) {
	for (var i=0; i<node.childNodes.length; i++) {
		var child = node.childNodes[i];
		if(child.nodeType == 3 && !/\S/.test(child.nodeValue)) {
			node.removeChild(child);
			i--;
		}
		if(child.nodeType == 1) {
			dlagua.c.string._cleanWhitespaceRecursive(child);
		}
	}
	return node;
};

dlagua.c.string.cleanWhitespace = function(/*String*/ value){
	var div = dojo.create("div",{
		innerHTML:value
	});
	return dlagua.c.string._cleanWhitespaceRecursive(div).innerHTML;
};
/*
String.prototype.cleanWhitespace = function() {
	return dlagua.string.cleanWhitespace(this);
}
*/