dojo.provide("dlagua.x.parser.twitter");

dojo.getObject("c.x.parser.twitter", true, dlagua);

dlagua.x.parser.twitter.like = function(val,options) {
	var id = "twitter-wjs";
	var src = "//platform.twitter.com/widgets.js";
	if(!dojo.byId(id)){
		dojo.create("script",{
			id:id,
			src:src
		},dojo.body());
	}
	var div = dojo.create("div");
	dojo.create("a",{
		href:options.href,
		"class":options["class"] || "twitter-follow-button",
		"data-show-count": options.showCount || "false",
		"data-lang": options.lang || "nl",
		"data-show-screen-name": options.showScreenName || "false",
		innerHTML:val
	},div);
	return div.innerHTML;
};