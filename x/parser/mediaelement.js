define([
	"require",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dojo/topic",
	"dojox/uuid/generateRandomUuid",
	"dlagua/x/$",
	"dojo/has",
	"dojo/_base/sniff"
], function(require,lang,array,on,topic,generateRandomUuid,$,has) {

lang.getObject("dlagua.x.parser.mediaelement", true);

dlagua.x.parser.mediaelement.audio = function(val,options) {
	// whenever the content must be deferred, we need an uuid
	// BUT we also may need one for pub/sub
    var id = options.id || generateRandomUuid();
    var types = options.types || ["mp3"];
    var tries = 10;
	// declare audio player with bling
	mejs = {};
	mejs.$ = $;
	var parse = function(){
		// check if the div AND mediaelement are available
		var x = $("#audio_"+id);
		if(x.length && x.mediaelementplayer){
			x.mediaelementplayer({
				audioWidth : (options.width || 280),
				success : function(me) {
					on(me,"play",function(){
						console.log("play "+id);
						topic.publish("/audio",{node:me,event:"play",id:id});
					});
					on(me,"pause",function(){
						console.log("pause "+id);
						topic.publish("/audio",{node:me,event:"pause",id:id});
					});
				}
			});
		} else {
			if(tries>0) {
				tries--;
				setTimeout(function(){
					parse();
				},10);
			}
		}
	};
	// require mejs after bling is assigned (and to keep out of dojo build)
	var reqs = ["mediaelement/mediaelement-and-player.min"];
	require(reqs,function(){
		$.fn.mediaelementplayer = function(options) {
			if (options === false) {
				this.each(function() {
				var player = $(this).data('mediaelementplayer');
				if (player) {
					player.remove();
				}
				$(this).removeData('mediaelementplayer');
			});
			} else {
				this.each(function() {
					$(this).data('mediaelementplayer', new mejs.MediaElementPlayer(this, options));
				});
			}
			return this;
		};
		parse();
	});
	var text = '<audio id="audio_'+id+'" controls="controls">';
	var exts = {
		"mp3":"audio/mpeg",
		"ogg":"audio/ogg"
	};
	array.forEach(types,function(type){
		var mime = exts[type];
		var src = val.replace("."+types[0],"");
		text += '<source type="'+mime+'" src="'+src+'.'+type+'"/>';
	});
	text += '</audio>';
	if(has("IE") && has("IE")<9) text = '<span style="display:none;">&nbsp;</span><audio id="audio_'+id+'" controls type="'+mime+'" src="'+val+'">&nbsp;</audio>';	
	return text;
};

return dlagua.x.parser.mediaelement;
});