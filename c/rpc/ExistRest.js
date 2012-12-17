dojo.provide("dlagua.c.rpc.ExistRest");
dojo.require("dlagua.c.Subscribable");
dojo.require("dlagua.c.store.XMLRest");
dojo.declare("dlagua.c.rpc.ExistRest",[dlagua.c.Subscribable],{
	target:"", // the target for the rest service
	// FIXME: current item should be corresponding item
	// TODO: but this is a dirty thing anyway...
	// this is a function to set some veeery specific properties
	// something like item mapping for semi-corresponding items
	// so the property of one can be the identifier of another
	currentItem:null, // the remote item...
	changeSet:null, // the remote changing items...
	store:null,
	mappedItem:null,
	ref:null, // the ref to the content pane or whatever needs to be set
	refId:"", // if the ref cannot be set by object, it can be set by widget(!) id
	refProperty:"href",  // the property of the ref the service needs to set
	postfix:"", // will be temp for editor, none for published version, xml for legacy
	// here follow all exist rest query params
	_query:null,
	_watchhandles:[],
	destroyRecursive:function(x){
		console.log("destroying existrest");
		console.log(this._subscribes)
		// faux destroyer
		var i=0;
		for(; i<this._subscribes.length; i++){
			this.unsubscribe(this._subscribes[i]);
		}
		for(i=0; i<this._watchhandles.length; i++){
			this._watchhandles[i].unwatch();
		}
	},
	itemMapper:function(item) {
		// TODO: add mappedIdProperty
		var mappedItem = {
			id: item.id,
			type: item.type,
			uri:"",
			target:this.target,
			__deleted: item.__deleted,
			__new:false,
			query:""
		};
		console.log("mappeditem",mappedItem)
		// remove deleted from original item
		delete item["__deleted"];
		if(!mappedItem.deleted && this._query) {
			mappedItem.query = "?"+dojo.objectToQuery({_query:this._query});
		}
		mappedItem.uri = item.locale+"/"+item.path;
		if(item["default"]) mappedItem.defaultInstance = item.locale+"/"+item["default"];
		return mappedItem;
	},
	loadItem: function(item,postfix,newItem) {
		// TODO: send item to the ref (if toItem=true)
		// handle item in ref (i.e. Editor)
		if(!postfix) postfix="";
		var d = new dojo.Deferred();
		this.store.get(item.uri+postfix).addBoth(dojo.hitch(this,function(res,io){
			if(res.status!=404) {
				if(item.__deleted) {
					this.deleteItem(item);
				} else if(newItem) {
					dojo.when(this.moveItem(item,newItem,postfix),dojo.hitch(this,function(){
						this.ref.set(this.refProperty,this.target+newItem.uri+postfix);
					}));
				} else {
					this.ref.set(this.refProperty,this.target+item.uri+postfix);
				}
				d.callback(true);
			} else {
				if(postfix=="" && !item.__deleted && !newItem) {
					item.__new = true;
					this.ref.set("hasNoPage",true);
					this.ref.set(this.refProperty,this.target+item.uri+postfix);
				}
				d.callback(false);
			}
		}));
		return d;
	},
	onChange: function(args,postfix){
		if(postfix!=="") postfix = this.postfix;
		var newItem = this.itemMapper(this.changeSet[0],postfix);
		var oldItem = this.itemMapper(this.changeSet[1],postfix);
		// move
		var moved = (oldItem.uri && oldItem.uri != newItem.uri);
		this.mappedItem = (moved ? newItem : oldItem);
		// if onLoad return error it means there was no published item
		// do the whole thing again for the published item
		var d = this.loadItem(oldItem, postfix, moved ? newItem : null);
		if(postfix==="") return;
		var self = this;
		d.then(function(sxs){
			console.log(sxs)
			if((sxs && (oldItem.__deleted || moved)) || !sxs && !oldItem.__deleted && !moved) self.onChange(null,"");
		});
	},
	postscript: function(mixin){
		if(mixin){
			dojo.mixin(this, mixin);
		}
		// TODO change service to dlagua.c.store.XMLRest
		this.store = new dlagua.c.store.XMLRest({target:this.target});
		console.log("existrest postscript")
		this._watchhandles.push(this.watch("currentItem", function(){
			console.log("existrest currentItem update")
			this.mappedItem = this.itemMapper(this.currentItem,this.postfix);
			this.loadItem(this.mappedItem);
		}));
		this._watchhandles.push(this.watch("changeSet", this.onChange));
	},
	newPage: function(data) {
		// start with a timestamp
		var item = this.mappedItem;
		var d = new dojo.Deferred();
		var dd = new dojo.Deferred();
		if(!item) {
			dd.errback({id:undefined,response:"No item in service"});
			return dd;
		}
		var self = this;
		// FIXME: what needs to get called back to where?
		// SO this returns a whole path including target now... NO GOOD
		// this will be for editor OR some pane with service holder
		// so make it an item finally
		if(item.defaultInstance) {
			dojo.xhrGet({
				url:self.target+item.defaultInstance,
				load:function(res,io) {
					d.callback(res);
				},
				error:function(){
					d.callback(false);
				}
			});
		} else {
			if(!data) data = "<body/>";
			d.callback(data);
		}
		d.then(function(data){
			if(!data) return alert("Default instance error!");
			dojo.when(self.store.put(item.uri,data),function(res){
				dd.callback({id:self.target+item.uri,response:res});
			},function(res){
				dd.errback({id:self.target+item.uri,response:res});
			});
		});
		return dd;
	},
	save: function(data,publish,options) {
		var _q = dojo.objectToQuery(options);
		var dd = new dojo.Deferred();
		//console.log(this)
		var item = this.mappedItem;
		if(!item) {
			dd.errback({id:undefined,response:"No item in service"});
			return dd;
		}
		var url = item.uri;
		// FIXME: what needs to get called back to where?
		if(!publish) url += this.postfix;
		if(_q) url += "?"+_q;
		console.log(url)
		return this.store.put(url,data);
	},
	deleteItem:function(item) {
		var dd = new dojo.Deferred();
		var item = this.mappedItem;
		if(!item) {
			dd.errback({id:undefined,response:"No item in service"});
			return dd;
		}
		return this.store.remove(item.uri);
	},
	moveItem:function(oldItem,newItem,postfix) {
		var dd = new dojo.Deferred();
		var item = this.mappedItem;
		if(!item) {
			dd.errback({id:undefined,response:"No item in service"});
			return dd;
		}
		var sur = oldItem.uri.split("/");
		var tur = newItem.uri.split("/");
		var sdoc = sur.pop();
		var tdoc = tur.pop();
		var origin = sur.join("/");
		var destination = tur.join("/");
		var xml = "<move>";
		xml += "<origin>"+origin+"</origin>";
		xml += "<destination>"+destination+"</destination>";
		xml += "<resource>"+sdoc+postfix+"</resource>";
		if(sdoc != tdoc) xml += "<name>"+tdoc+postfix+"</name>";
		xml += "</move>";
		return this.store.post("move",xml);
	}
});
