define(["dojo/_base/lang","dojo/on","dijit/form/Button","dojox/uuid/generateRandomUuid","dlagua/c/string/toProperCase"
], function(lang,on,Button,generateRandomUuid) {

var dispatch = lang.getObject("dlagua.x.parser.dispatch", true);

var button = function(val,options) {
	var id = options.id || dojox.uuid.generateRandomUuid();
	options.label = val || options.label;
	setTimeout(function(){
		var bt = new Button(options,id);
		if(options.on) {
			var event = options.event;
			var args = options.args;
			on(bt,"on"+options.on.toProperCase(),lang.hitch(this,function(){
				try {
					var evt = dojo.getObject(event);
					evt(args);
				} catch(err) {
					console.error(err);
				}
			}));
		}
	},10);
	return '<span id="'+id+'"></span>';
}

var flux = function(val,options) {
	var text;
	var targetId = options.targetId;
	var contextInfo = options.contextInfo;
	var values = options.values;
	return button(val,{
		onClick:function(){
			if(!window.fluxProcessor) return;
			if(values) {
				for(var k in options.values) {
					fluxProcessor.sendValue(k,values[k]);
				}
				fluxProcessor.dispatchEventType(targetId,contextInfo)
			}
		}
	});
}

dispatch.button = button;
dispatch.flux = flux;

return dispatch;
});