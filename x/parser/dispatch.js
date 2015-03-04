define([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/hash",
	"dijit/form/Button",
	"dojox/uuid/generateRandomUuid",
	"dforma/store/FormData",
	"dlagua/c/string/toProperCase"
], function(lang,on,hash,Button,generateRandomUuid,FormData) {

var dispatch = lang.getObject("dlagua.x.parser.dispatch", true);

var button = function(val,options) {
	var _parsable = options._parsable;
	delete options._ref;
	var id = options.id || dojox.uuid.generateRandomUuid();
	options.label = val || options.label;
	setTimeout(function(){
		var bt = new Button(options,id);
		// if from Parsable
		if(_parsable) bt.placeAt(_parsable);
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

var form = function(val,options) {
	var text;
	var ref = this.ref || options.ref;
	if(!ref.stores) ref = ref.getParent();
	var data = options.values;
	var action = options.action;
	var service = options.service || "/model/";
	var target = service+options.model+"/";
	var path = options.path;
	var _parsable = options._parsable;
	delete options.values;
	delete options.action;
	delete options._ref;
	delete options._parsable;
	if(!ref.stores[target]){
		ref.stores[target] = new FormData(options);
	}
	return button(val,{
		_parsable:_parsable,
		onClick:function(){
			var store = ref.stores[target];
			var obj = store.put(data);
			store.selectedId = obj.id;
			store.newdata = true;
			if(action) hash(action);
		}
	});
};

dispatch.button = button;
dispatch.form = form;
// TODO remove
dispatch.flux = form;

return dispatch;
});