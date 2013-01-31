define([
"dojo/_base/lang",
"dojo/_base/window",
"dojo/dom",
"dojo/dom-construct"
], function(lang,win,dom,domConstruct) {

lang.getObject("dlagua.x.parser.twitter", true);

dlagua.x.parser.twitter.like = function(val,options) {
	var id = "twitter-wjs";
	var src = "//platform.twitter.com/widgets.js";
	if(!dom.byId(id)){
		domConstruct.create("script",{
			id:id,
			src:src
		},win.body());
	}
	var div = domConstruct.create("div");
	domConstruct.create("a",{
		href:options.href,
		"class": "twitter-follow-button",
		"data-show-count": options.showCount || "false",
		"data-lang": options.lang || "nl",
		"data-show-screen-name": options.showScreenName || "false",
		innerHTML:val
	},div);
	return div.innerHTML;
};

return dlagua.x.parser.twitter;
});