define([
"dojo/_base/lang",
"dojo/_base/window",
"dojo/dom",
"dojo/dom-construct"
], function(lang,win,dom,domConstruct) {

lang.getObject("dlagua.x.parser.facebook", true, dlagua);

dlagua.x.parser.facebook.like = function(val,options) {
	var id = "facebook-jssdk";
	var src = "//connect.facebook.net/nl_NL/all.js#xfbml=1";
	if(!dom.byId(id)){
		domConstruct.create("script",{
			id:id,
			src:src
		},win.body());
	}
	var div = domConstruct.create("div");
	domConstruct.create("a",{
		"data-href":options.href,
		"class": "fb-like",
		"data-send": options.send || "false",
		"data-layout": options.layout || "button_count",
		"data-width": options.width || 450,
		"data-show-faces": options.showFaces || "false",
		innerHTML:val
	},div);
	return div.innerHTML;
};

return dlagua.x.parser.facebook.like;

});