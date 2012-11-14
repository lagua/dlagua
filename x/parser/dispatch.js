dojo.provide("dlagua.x.parser.dispatch");

dojo.require("dijit.form.Button");
dojo.require("dojox.uuid.generateRandomUuid");

dojo.getObject("c.x.parser.dispatch", true, dlagua);

dlagua.x.parser.dispatch.button = function(val,options) {
	var id = options.id || dojox.uuid.generateRandomUuid();
	options.label = val || options.label;
	setTimeout(function(){
		var bt = new dijit.form.Button(options,id);
		if(options.on) {
			var on = options.on;
			var event = options.event;
			var args = options.args;
			dojo.connect(bt,"on"+on.toProperCase(),this,function(){
				try {
					var evt = dojo.getObject(event);
					evt(args);
				} catch(err) {
					console.error(err);
				}
			});
		}
	},10);
	return '<span id="'+id+'"></span>';
}

dlagua.x.parser.dispatch.flux = function(val,options) {
	var text;
	var targetId = options.targetId;
	var contextInfo = options.contextInfo;
	var values = options.values;
	return dlagua.x.parser.dispatch.button(val,{
		onClick:function(){
			console.log(values)
			if(!fluxProcessor) return;
			if(values) {
				for(var k in options.values) {
					fluxProcessor.setControlValue(k,values[k]);
				}
				fluxProcessor.dispatchEventType(targetId,contextInfo)
			}
		}
	});
}