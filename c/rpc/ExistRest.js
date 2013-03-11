define([
	"dojo/_base/declare", // declare
	"dojo/_base/lang", 
	"dojo/request",
	"dojo/Deferred",
	"dojo/when",
	"dojo/io-query",
	"dojo/topic",
	"dlagua/c/Subscribable",
	"dlagua/c/store/PlainRest"
], function(declare, lang, request, Deferred, when, ioQuery, topic, Subscribable, PlainRest){
	// module:
	//   lagua/c/rpc/ExistRest
	var XMLOptions = {
		"headers":{
			"Accept":"application/xml",
			"Content-Type":"application/xml",
		}
	};
	var ExistRest = declare("dlagua.c.rpc.ExistRest",[Subscribable],{
		// FIXME: current item should be corresponding item
		// TODO: but this is a dirty thing anyway...
		// this is a function to set some veeery specific properties
		// something like item mapping for semi-corresponding items
		// so the property of one can be the identifier of another
		target:"", // the target for the rest service
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
				mappedItem.query = "?"+ioQuery.objectToQuery({_query:this._query});
			}
			mappedItem.uri = item.locale+"/"+item.path;
			if(item["default"]) mappedItem.defaultInstance = item.locale+"/"+item["default"];
			return mappedItem;
		},
		loadItem: function(item,postfix,newItem) {
			// TODO: send item to the ref (if toItem=true)
			// handle item in ref (i.e. Editor)
			if(!postfix) postfix="";
			return this.store.get(item.uri+postfix,XMLOptions).then(lang.hitch(this,function(res){
				if(item.__deleted) {
					this.deleteItem(item);
				} else if(newItem) {
					when(this.moveItem(item,newItem,postfix),lang.hitch(this,function(){
						this.ref.set(this.refProperty,this.target+newItem.uri+postfix);
					}));
				} else {
					this.ref.set(this.refProperty,this.target+item.uri+postfix);
				}
			}),(lang.hitch(this,function(err){
				if(postfix=="" && !item.__deleted && !newItem) {
					item.__new = true;
					this.ref.set("hasNoPage",true);
					this.ref.set(this.refProperty,this.target+item.uri+postfix);
				}
			})));
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
			d.then(function(){
				if(oldItem.__deleted || moved) self.onChange(null,"");
			},function(){
				if(!oldItem.__deleted && !moved) self.onChange(null,"");
			});
		},
		postscript: function(mixin){
			if(mixin){
				lang.mixin(this, mixin);
			}
			this.store = new PlainRest({target:this.target});
			// call this.own func /w parameterized array for destroy()
			this.own(
				this.watch("currentItem", function(){
					console.log("existrest currentItem update")
					this.mappedItem = this.itemMapper(this.currentItem,this.postfix);
					this.loadItem(this.mappedItem);
				}),
				this.watch("changeSet", this.onChange)
			);
		},
		newPage: function(data) {
			// start with a timestamp
			var item = this.mappedItem;
			var d = new Deferred();
			var dd = new Deferred();
			if(!item) {
				dd.reject({id:undefined,response:"No item in service"});
				return dd;
			}
			var self = this;
			// FIXME: what needs to get called back to where?
			// SO this returns a whole path including target now... NO GOOD
			// this will be for editor OR some pane with service holder
			// so make it an item finally
			if(item.defaultInstance) {
				d = request(this.target+item.defaultInstance);
			} else {
				if(!data) data = "<body/>";
				d.resolve(data);
			}
			d.then(function(data){
				if(!data) return alert("Default instance error!");
				when(self.store.put(item.uri,data,XMLOptions),function(res){
					dd.resolve({id:self.target+item.uri,response:res});
				},function(res){
					dd.reject({id:self.target+item.uri,response:res});
				});
			});
			return dd;
		},
		save: function(data,publish,options) {
			options = options || {};
			var url = options.uri || item.uri;
			if(options.uri) delete options.uri;
			var _q = ioQuery.objectToQuery(options);
			var dd = new Deferred();
			//console.log(this)
			var item = this.mappedItem;
			if(!item) {
				dd.reject({id:undefined,response:"No item in service"});
				return dd;
			}
			// FIXME: what needs to get called back to where?
			if(!publish) url += this.postfix;
			if(_q) url += "?"+_q;
			console.log(url)
			return this.store.put(url,data,XMLOptions);
		},
		deleteItem:function(item) {
			var dd = new Deferred();
			var item = this.mappedItem;
			if(!item) {
				dd.reject({id:undefined,response:"No item in service"});
				return dd;
			}
			return this.store.remove(item.uri);
		},
		moveItem:function(oldItem,newItem,postfix) {
			var dd = new Deferred();
			var item = this.mappedItem;
			if(!item) {
				dd.reject({id:undefined,response:"No item in service"});
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
	return ExistRest;
});