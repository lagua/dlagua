dojo.provide("dlagua.c.string.stripTags");

dlagua.c.string.stripTags = function(/*String*/ text){
    var div = dojo.create("div",{
    	innerHTML:text
    });
    if(document.all) {
    	text = div.innerText;
    } else {
    	text = div.textContent;
    }
    return text;
};
/*
String.prototype.stripTags = function() {
	return dlagua.c.string.stripTags(this);
}
*/