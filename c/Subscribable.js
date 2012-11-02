define("dlagua/c/Subscribable", ["dojo", "dojo/Stateful"], function(dojo) {

dojo.declare("dlagua.c.Subscribable", [dojo.Stateful], {
	_subscribes:null, // subscription to update the id
	_watchhandles:null,
	addWatch: function(/*String?*/name, /*Function*/callback){
		if(!this.watch) return;
		if(!this._watchhandles) this._watchhandles = [];
		this._watchhandles.push(this.watch(name,callback));
	},
	unwatchAll: function(){
		if(!this._watchhandles || !this._watchhandles.length) return;
		while(this._watchhandles.length>0){
			this._watchhandles[this._watchhandles.length-1].unwatch();
			this._watchhandles.pop();
		}
	},
	subscribe: function(
			/*String*/ topic,
			/*String|Function*/ method){
		var handle = dojo.subscribe(topic, this, method);
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
				dojo.unsubscribe(handle);
				this._subscribes.splice(i, 1);
				return;
			}
		}
	}
});

});