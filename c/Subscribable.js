define(["dojo/_base/declare", "dojo/Stateful","dojo/topic", "dlagua/c/subscribe"], function(declare, Stateful, dtopic, dsubscribe) {

return declare("dlagua.c.Subscribable", [Stateful], {
	_subscribes:null, // subscription to update the id
	subscribe: function(
			/*String*/ topic,
			/*String*/ params){
		var handle = dsubscribe(topic, this, params);
		if(!this._subscribes) this._subscribes = [];
		// return handles for Any widget that may need them
		this._subscribes.push(handle);
		return handle;
	},
	unsubscribe: function(/*Object*/ handle){
		// summary:
		//		Unsubscribes handle created by this.subscribe.
		//		Also removes handle from this widget's list of subscriptions
		for(var i=0; i<this._subscribes.length; i++){
			if(this._subscribes[i] == handle){
				dtopic.unsubscribe(handle);
				this._subscribes.splice(i, 1);
				return;
			}
		}
	}
});

});