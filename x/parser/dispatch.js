define([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/hash",
	"dojo/topic",
	"dijit/form/Button",
	"dojox/uuid/generateRandomUuid",
	"dforma/store/FormData",
	"rql/js-array",
	"dlagua/c/string/toProperCase"
], function(lang,on,hash,topic,Button,generateRandomUuid,FormData,rql) {

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
	var service = options.service || "model/";
	var target = service+options.model+"/";
	var path = options.path;
	var _parsable = options._parsable;
	var bindStore = options.bindStore;
	var triggers = options.triggers;
	var rm = ["values","action","_ref","_parsable","bindStore","triggers"];
	for(var k in rm) delete options[k];
	if(!ref.stores[target]){
		var store = new FormData(options);
		if(bindStore) {
			store.bound = true;
			var p = store.schema.properties[bindStore];
			if(p && p.items) store.schema = p.items; 
		}
		ref.stores[target] = store;
	}
	return button(val,{
		_parsable:_parsable,
		onClick:function(){
			var store = ref.stores[target];
			store.processModel(data).then(function(obj){
				delete obj.id;
				store.put(obj).then(function(){
					if(triggers){
						store.fetch().then(function(data){
							triggers.forEach(function(trigger){
								if(trigger.total){
									// expect array
									var total = rql.executeQuery("sum("+trigger.total+")",{},data);
									val = {total:total};
								}
								if(trigger.publish){
									topic.publish("/triggers/"+trigger.publish,val);
								}
							});
						});
					}
					//store.selectedId = obj.id;
					//store.newdata = true;
					if(action) hash(action);
				});
			});
		}
	});
};

dispatch.button = button;
dispatch.form = form;
// TODO remove
dispatch.flux = form;

return dispatch;
});