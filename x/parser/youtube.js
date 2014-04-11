define([
"dojo/_base/lang",
"dojo/_base/window",
"dojo/io-query",
"dojo/dom-construct"
], function(lang,win,ioQuery,domConstruct) {

	var dp = lang.getObject("dlagua.x.parser.youtube", true);
	var url = "//www.youtube.com/embed/";
	return lang.mixin(dp,{
		embed:function(val, options){
			options = options || {};
			var qo = {
				enablejsapi:1,
				autohide:1,
				showinfo:1,
				html5:1,
				origin:location.protocol+"//"+location.host
			};
			var div = domConstruct.create("div");
			//title=0byline=0portrait=0color=ff9f0c&autoplay=1&loop=1
			var frameattrs = {
				webkitAllowFullScreen:"webkitAllowFullScreen",
				mozallowfullscreen:"mozallowfullscreen",
				allowFullScreen:"allowFullScreen"
			};
			if(options.width) {
				frameattrs.width = options.width;
			}
			if(options.height) {
				frameattrs.height = options.height;
			}
			if(options.frameborder) {
				frameattrs.frameborder = options.frameborder;
			} else {
				frameattrs.frameborder = 0;
			}
			var q = ioQuery.objectToQuery(qo);
			frameattrs.src = url+val+(q ? "?"+q : "");
			domConstruct.create("iframe",frameattrs,div);
			setTimeout(function(){
				options._parsable.containerNode.appendChild(div);
			},100);
			return "<div data-dojo-attach-point=\"containerNode\"></div>";
		}
	});
});

