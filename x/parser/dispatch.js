define([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/hash",
	"dijit/form/Button",
	"dojox/uuid/generateRandomUuid",
	"dlagua/c/store/FormData",
	"dlagua/c/string/toProperCase"
], function(lang,on,hash,Button,generateRandomUuid,FormData) {

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
};

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
};

var form = function(val,options) {
	var text;
	var ref = this.ref;
	var data = options.values;
	var action = options.action;
	var service = options.service || "/persvr/";
	var target = service+options.model+"/";
	delete options.values;
	delete options.action;
	delete options._ref;
	if(!ref.stores[target]){
		ref.stores[target] = new FormData(options);
	}
	return button(val,{
		onClick:function(){
			var id = ref.stores[target].put(data);
			ref.stores[target].selectedId = id;
			hash(action);
		}
	});
};

dispatch.button = button;
dispatch.flux = form;

return dispatch;
});