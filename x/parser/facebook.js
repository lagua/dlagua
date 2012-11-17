dojo.provide("dlagua.x.parser.facebook");

dojo.getObject("c.x.parser.facebook", true, dlagua);

dlagua.x.parser.facebook.like = function(val,options) {
	var id = "facebook-jssdk";
	var src = "//connect.facebook.net/nl_NL/all.js#xfbml=1";
	if(!dojo.byId(id)){
		dojo.create("script",{
			id:id,
			src:src
		},dojo.body());
	}
	var div = dojo.create("div");
	dojo.create("a",{
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
