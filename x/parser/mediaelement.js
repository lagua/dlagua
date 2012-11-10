dojo.provide("dlagua.x.parser.mediaelement");

dojo.getObject("c.x.parser.mediaelement", true, dlagua);

dlagua.x.parser.mediaelement.audio = function(val,options) {
	var jsid = "me-js";
	var version = options.version || "2.9.5";
	var root = "/js_shared/mejs-"+version;
	var src = root+"/mediaelementplayer.min.js";
	var head = dojo.query("head")[0];
	if(!dojo.byId(jsid)){
		dojo.create("script",{
			id:jsid,
			src:src
		},head);
		dojo.create("link",{
			rel:"stylesheet",
			href:root+"/mediaelementplayer.min.css"
		},head);
		dojo.create("link",{
			rel:"stylesheet",
			href:root+"/mejs-skins.css"
		},head);
	}
	var mime = "audio/mp3";
	var text = '<audio controls="controls"><source type="'+mime+'" src="'+audio+'"/></audio>';
	if(dojo.isIE && dojo.isIE<9) text = '<span style="display:none;">&nbsp;</span><audio controls type="'+mime+'" src="'+audio+'">&nbsp;</audio>';
	var div = dojo.create("div",{
		innerHTML:text
	});
	// declare audio player with jQuery
	$("audio",div).mediaelementplayer({
		audioWidth : (props.width || 280),
		success : function(me) {
			dojo.connect(me,"play",function(){
				console.log("play "+id);
				dojo.publish("/audio",[{node:me,event:"play",id:id}]);
			});
			dojo.connect(me,"pause",function(){
				console.log("pause "+id);
				dojo.publish("/audio",[{node:me,event:"pause",id:id}]);
			});
		}
	});
	return div.innerHTML;
};
