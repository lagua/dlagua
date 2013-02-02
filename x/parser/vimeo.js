define([
"dojo/_base/lang",
"dojo/_base/window",
"dojo/io-query",
"dojo/dom-construct"
], function(lang,win,ioQuery,domConstruct) {

	var dp = lang.getObject("dlagua.x.parser.vimeo", true);
	var url = "//player.vimeo.com/video/";
	dp = lang.mixin(dp,{
		embed:function(val, options){
			options = options || {};
			var div = domConstruct.create("div");
			//title=0byline=0portrait=0color=ff9f0c&autoplay=1&loop=1
			var frameattrs = {
				webkitAllowFullScreen:"webkitAllowFullScreen",
				mozallowfullscreen:"mozallowfullscreen",
				allowFullScreen:"allowFullScreen"
			};
			if(options.width) {
				frameattrs.width = options.width;
				delete options.width;
			}
			if(options.height) {
				frameattrs.height = options.height;
				delete options.height;
			}
			if(options.frameborder) {
				frameattrs.frameborder = options.frameborder;
				delete options.frameborder;
			} else {
				frameattrs.frameborder = 0;
			}
			frameattrs.src = url+val+"?"+ioQuery.objectToQuery(options);
			dojo.create("iframe",frameattrs,div);
			return div.innerHTML;
		}
	}
}

