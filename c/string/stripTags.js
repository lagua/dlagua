define("dlagua/c/string/stripTags", ["dojo/_base/lang","dojo/dom-construct"], function(lang,domConstruct) {
lang.getObject("dlagua.c.string", true);
dlagua.c.string.stripTags = function(/*String*/ text){
    var div = domConstruct.create("div",{
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
return dlagua.c.string.stripTags;

});