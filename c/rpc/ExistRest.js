define([
	"dojo/_base/declare", // declare
	"dojo/_base/lang", 
	"dojo/request",
	"dojo/Deferred",
	"dojo/when",
	"dojo/io-query",
	"dojo/topic",
	"dlagua/w/Subscribable",
	"dlagua/c/store/PlainRest"
], function(declare, lang, request, Deferred, when, ioQuery, topic, Subscribable, PlainRest){
	// module:
	//   lagua/c/rpc/ExistRest
	var XMLOptions = {
		"headers":{
			"Accept":"application/xml",
			"Content-Type":"application/xml"
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
				model: item.model || "Page", // for ModelEditor 
				key: item.key, // for ModelEditor
				uri:"",
				target:this.target,
				published:item.published,
				modified:item.modified,
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
			var doc = item.path.split("/").pop();
			var ext = doc.match(/\.(xml|htm|html|xhtml)$/);
			if(ext) mappedItem.extension = ext.pop();
			if(item["default"]) mappedItem.defaultInstance = item.locale+"/"+item["default"];
			return mappedItem;
		},
		getItem:function(){
			return this.mappedItem;
		},
		loadItem: function(item,postfix,newItem) {
			// TODO: send item to the ref (if toItem=true)
			// handle item in ref (i.e. Editor)
			if(!postfix) postfix="";
			var d = new Deferred();
			this.store.get(item.uri+postfix,XMLOptions).then(lang.hitch(this,function(res){
				if(item.__deleted) {
					this.deleteItem(item);
				} else if(newItem) {
					when(this.moveItem(item,newItem,postfix),lang.hitch(this,function(){
						this.ref.set(this.refProperty,this.target+newItem.uri+postfix);
					}));
				} else {
					this.ref.set(this.refProperty,this.target+item.uri+postfix);
				}
				d.resolve();
			}),(lang.hitch(this,function(err){
				if(postfix=="" && !item.__deleted && !newItem) {
					item.__new = true;
					this.ref.set("hasNoPage",true);
					this.ref.set(this.refProperty,this.target+item.uri+postfix);
				}
				d.reject();
			})));
			return d;
		},
		onChange: function(property,changeSet,postfix){
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
				if(oldItem.__deleted || moved) self.onChange(property,changeSet,"");
			},function(){
				if(!oldItem.__deleted && !moved) self.onChange(property,changeSet,"");
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
					this.mappedItem = this.itemMapper(this.currentItem);
					// published means there's a temp item
					this.loadItem(this.mappedItem,this.mappedItem.published ? this.postfix : "");
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
		save: function(data,options) {
			options = options || {};
			var dd = new Deferred();
			var item = this.mappedItem;
			if(!item) {
				dd.reject({id:undefined,response:"No item in service"});
				return dd;
			}
			var published = options.published;
			delete options.published;
			var postfix = item.published && !published ? ".temp" : "";
			var uri = item.uri + postfix;
			var modified = options["last-modified"];
			var _q = ioQuery.objectToQuery(options);
			//console.log(this)
			/*if(!publish && !this.mappedItem.extension) {
				url += this.postfix;
			} else if(publish && this.mappedItem.extension){
				return new Deferred().resolve();
			}*/
			var url = _q ? uri+"?"+_q : uri;
			var res = this.store.put(url,data,XMLOptions);
			if(modified || published) {
				return when(res.response,lang.hitch(this,function(resp){
					var date = new Date(resp.getHeader("Date"));
					var now = date.toISOString();
					var update = {id:item.id,model:this.mappedItem.model};
					var key = item.key;
					if(modified) update[key ? key+"_modified" : "modified"] = now;
					if(published) update[key ? key+"_published" : "published"] = now;
					topic.publish("/components/"+this.id+"/update",update);
					this.mappedItem = lang.mixin(item,update);
					return res;
				}));
			}
			return res;
		},
		publish:function(){
			var dd = new Deferred();
			var item = this.mappedItem;
			if(!item) {
				dd.reject({id:undefined,response:"No item in service"});
				return dd;
			}
			var uri = item.uri;
			var postfix = item.published ? this.postfix : "";
			return when(this.store.get(uri+postfix),lang.hitch(this,function(temp){
				return this.save(temp,{published:true});
			}));
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