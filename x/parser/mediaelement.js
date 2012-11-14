dojo.provide("dlagua.x.parser.mediaelement");

dojo.require("dlagua.c._base");
dojo.require("dojox.uuid.generateRandomUuid");

dojo.getObject("c.x.parser.mediaelement", true, dlagua);

dlagua.x.parser.mediaelement.audio = function(val,options) {
	var jsid = "me-js";
	var version = options.version || "2.9.5";
	var root = "/js_shared/mejs-"+version;
	var src = root+"/mediaelement-and-player.js";
	var head = dojo.query("head")[0];
	var d = new dojo.Deferred();
	if(!dojo.byId(jsid)){
		dlagua.c._base.addScript(src,function(){
			d.callback();
		},jsid);
		dojo.create("link",{
			rel:"stylesheet",
			href:root+"/mediaelementplayer.min.css"
		},head);
		dojo.create("link",{
			rel:"stylesheet",
			href:root+"/mejs-skins.css"
		},head);
	} else {
		d.callback();
	}
	// whenever the content must be deferred, we need an uuid
	// BUT we also may need one for pub/sub
    var id = options.id || dojox.uuid.generateRandomUuid();
    var types = options.types || ["mp3"];
	// declare audio player with jQuery
	var parse = function(){
		// check if the div AND mediaelement are available
		if(window.mejs && dojo.byId("audio_"+id)){
			$("#audio_"+id).mediaelementplayer({
				audioWidth : (options.width || 280),
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
		} else {
			setTimeout(function(){
				parse();
			},10);
		}
	}
	d.then(parse);
	var text = '<audio id="audio_'+id+'" controls="controls">';
	var exts = {
		"mp3":"audio/mpeg",
		"ogg":"audio/ogg"
	};
	dojo.forEach(types,function(type){
		var mime = exts[type];
		var src = val.replace("."+types[0],"");
		text += '<source type="'+mime+'" src="'+src+'.'+type+'"/>';
	});
	text += '</audio>';
	if(dojo.isIE && dojo.isIE<9) text = '<span style="display:none;">&nbsp;</span><audio id="audio_'+id+'" controls type="'+mime+'" src="'+val+'">&nbsp;</audio>';	
	return text;
};
