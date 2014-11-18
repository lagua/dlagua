define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/Stateful",
	"dojo/topic",
	"dojo/on",
	"dojo/when",
	"dojo/hash"
],function(declare,lang,array,Deferred,Stateful,topic,on,when,dhash){

	window.onbeforeappunload = function() {};
	
return declare("dlagua.c.App", [Stateful], {
	currentItem:null,
	path:"",
	defaultHash:"",
	indexable:false,
	stripPath:"content",
	locale:"",
	servicetype:"",
	useLocale:true,
	useGlobalLocale:true,
	depth:0,
	meta:{},
	replaced:[],
	fromHash:false,
	infer:function(path,servicetype,depth,fromHash,truncated,oldValue){
		var d = new Deferred();
		var inferred = {};
		inferred.__view = false;
		if(!this.localechanged && ((this.servicetype=="model" && fromHash) || servicetype=="model")) {
			if(depth==this.depth+1 || truncated) {
				var par = path.split("/");
				var maybeId = par.pop();
				if(par.join("/")==this.path) {
					inferred.__view = maybeId;
				}
			} else if(this.meta.inferred.__view && depth==this.depth) {
				var par = path.split("/");
				var maybeId = par.pop();
				var opar = this.path.split("/");
				var oid = opar.pop();
				if(par.join("/")==opar.join("/")) {
					inferred.__view = maybeId;
				}
			}
		}
		this.meta.inferred = lang.mixin(this.meta.inferred,inferred);
		d.resolve(true);
		return d;
	},
	hashToItem: function(hash) {
		hash = hash.charAt(0)=="!" ? hash.substr(1) : hash;
		// concat stripPath:
		var restar = hash.split("/");
		var locale = this.useLocale ? restar.shift() : this.meta.inferred.locale;
		if(this.stripPath) {
			restar = this.stripPath.split("/").concat(restar);
		}
		var path = restar.join("/");
		var item = {
			locale:locale,
			path:path,
			__fromHash:true
		};
		return item;
	},
	getMeta:function(node){
		var i18n = {};
		if(this.i18n) {
			for(var i=0;i<this.i18n.length;i++) {
				i18n.locale = this.i18n[i].locale;
				if(this.i18n[i].component==node.id) {
					if(this.i18n[i].properties) i18n = lang.mixin(i18n,this.i18n[i].properties);
					break;
				}
			}
		}
		return lang.mixin(this.meta,{i18n:i18n});
	},
	replaceMeta:function(node,type) {
		if(!type) type="";
		// replace variables in properties:
		var v, newv;
		var meta = this.getMeta(node);
		for(var i in node.params) {
			if(i=="id" || i=="type") continue;
			v = node.params[i];
			if(typeof v == "string" && v.indexOf("{"+type)>-1) {
				newv = lang.replace(v,meta).replace("undefined","");
				if(v!=newv) {
					if(v.indexOf("{i18n.")>-1) {
						// keep track of what is replaced
						if(!this.replaced["i18n"]) this.replaced["i18n"] = {};
						if(!this.replaced["i18n"][node.id]) this.replaced["i18n"][node.id] = {};
						this.replaced["i18n"][node.id][i] = v;
					}
					if(v.indexOf("{inferred.")>-1) {
						// keep track of what is replaced
						if(!this.replaced["inferred"]) this.replaced["inferred"] = {};
						if(!this.replaced["inferred"][node.id]) this.replaced["inferred"][node.id] = {};
						this.replaced["inferred"][node.id][i] = v;
					}
					var nint = parseInt(newv,10);
					if(nint == newv) newv = nint;
					node[i] = newv;
				}
			}
		}
		return node;
	},
	replaceInferred:function(){
		var k,v;
		var reset = [];
		for(var id in this.replaced["inferred"]) {
			var node = dijit.registry.byId(id);
			var meta = this.getMeta(node);
			if(!node._beingDestroyed) {
				for(k in this.replaced["inferred"][id]) {
					v = this.replaced["inferred"][id][k];
					if(typeof v == "string") {
						var newv = lang.replace(v,meta).replace(/undefined|false|null/,"");
						//console.log("reset",k,v,newv)
						reset.push({dojoo:node,key:k,value:newv});
						//node.dojoo.set(k,newv);
					}
				}
			} else {
				//console.log("reset inferred: ",id,k,v);
				for(k in this.replaced["inferred"][id]) {
					v = this.replaced["inferred"][id][k];
					if(typeof v == "string") node[k] = v;
				}
			}
		}
		return reset;
	},
	replaceI18n:function(){
		var k,v;
		var reset = [];
		for(var id in this.replaced["i18n"]) {
			var node = dijit.registry.byId(id);
			var meta = this.getMeta(node);
			if(!node._beingDestroyed) {
				for(k in this.replaced["i18n"][id]) {
					v = this.replaced["i18n"][id][k];
					if(typeof v == "string") {
						var newv = lang.replace(v,meta).replace(/undefined|false|null/,"");
						//console.log("reset",k,v,newv)
						reset.push({dojoo:node,key:k,value:newv});
					}
				}
			} else {
				//console.log("reset i18n: ",id,k,v);
				for(k in this.replaced["i18n"][id]) {
					v = this.replaced["i18n"][id][k];
					if(typeof v == "string") node[k] = v;
				}
				//delete this.replaced["i18n"][id];
			}
		}
		return reset;
	},
	onItem: function(oldValue,newValue){
		// first check to see if we should navigate away...
		if(oldValue) {
			var block = onbeforeappunload();
			if(block) {
				if(!confirm(block)) {
					var par = oldValue.path.split("/");
					var locale = this.useLocale ? oldValue.locale : this.locale;
					var stripar = this.stripPath.split("/");
					par = array.filter(par,function(item,index){
						return par[index]!=stripar[index];
					});
					var hash = (this.indexable ? "!" : "")+(this.useLocale ? locale : "")+(par.length && this.useLocale ? "/" : "")+par.join("/");
					this.set("changeFromApp", true);
					dhash(hash);
					return;
				}
			}
		}
		var item = lang.mixin({},this.currentItem);
		console.log("onItem",item)
		var path = item.path;
		var newView = this.getView(item.view || item.state);
		var view;
		// check truncated first!
		if(item.__truncated) {
			view = this.checkView(item.__truncated,newView);
		} else {
			view = this.checkView(path,newView);
		}
		if(view) {
			return when(this.rebuild(view).then(lang.hitch(this,function(){
				this.startup();
				this.resize();
				// reset item to trigger stuff below
				return this.onItem(oldValue,this.currentItem);
			})));
		}
		// this will cause entire rebuild
		var locale = this.useLocale ? item.locale : this.locale;
		var model = item.model;
		var servicetype = item.type || (model ? "model" : "");
		//if(this.d && !this.d.isResolved()) {
		//	console.warn("CANCELING INFER")
		//	this.d.cancel();
			//delete this.d;
		//}
		if(item.type=="link") {
			location.href = item.url;
			return;
		}
		var d = new Deferred();
		//if(!this.d) this.d = d;
		if(!item.__fromHash) item.__fromHash = false;
		if(!item.__view) item.__view = false;
		var resethash = item.__reset;
		delete item.__reset;
		if(item.__truncated) {
			this.path = path;
			path = item.__truncated;
		} else {
			item.__truncated = false;
		}
		var fromHash = item.__fromHash;
		var fromRoot = item.__fromRoot;
		var localechanged = this.localechanged || (locale != this.locale);
		this.localechanged = false;
		var typechanged = (!fromHash && servicetype!="" && this.servicetype!=servicetype);
		var depth = item.__depth = item.path.split("/").length;
		var depthchanged = (this.depth!=depth);
		var pathchanged = (this.path!=path);
		if(this.meta.inferred) {
			this.meta.inferred = item;
		}
		// only change from item, block the hash subscription
		// let slip the next call
		return this.infer(path,servicetype,depth,fromHash,item.__truncated,oldValue).then(lang.hitch(this,function(){
			if(d.isCanceled()) {
				console.warn("INFER CANCELED!")
				return;
			}
			var reset = [];
			if(localechanged) {
				this.set("locale",locale);
				if(this.meta.inferred) this.meta.inferred.locale = locale;
				reset = this.replaceI18n();
			}
			this.fromHash = fromHash;
			if(typechanged) {
				this.set("servicetype", servicetype);
			}
			if(depthchanged) {
				this.set("depth", depth);
			}
			reset = reset.concat(this.replaceInferred());
			array.forEach(reset,function(r){
				r.dojoo.set(r.key,r.value);
			});
			if(pathchanged || localechanged) {
				topic.publish("/components/"+this.id+"/page-change",item);
				var par = path.split("/");
				var stripar = this.stripPath.split("/");
				par = array.filter(par,function(item,index){
					return par[index]!=stripar[index];
				});
				var hash = (this.indexable ? "!" : "")+(this.useLocale ? locale : "")+(par.length && this.useLocale ? "/" : "")+par.join("/");
				var chash = dhash();
				if(!fromHash && !fromRoot && !item.__truncated && chash!=hash) this.set("changeFromApp", true);
				if(!fromRoot) {
					if(!resethash) {
						dhash(hash);
					} else {
						window.location.replace("#"+hash);
					}
					this.set("path",path);
				} else {
					this.path = path;
				}
				d.resolve(true);
			} else {
				topic.publish("/components/"+this.id+"/page-change",item);
				d.resolve(true);
			}
			if(item.id) this.set("pageId",item.id);
			//delete this.d;
		}));
		//return d;
	},
	startup: function(){
		if(this._started) return;
		console.log("app startup called");
		this.own(
			topic.subscribe("/dojo/hashchange", lang.hitch(this,function(hash){
				if(this.changeFromApp) {
					this.changeFromApp = false;
					return;
				}
				var item = this.hashToItem(hash);
				this.set("currentItem",item);
			})),
			this.watch("locale",function(){
				if(!this.locale) return;
				if(this.useGlobalLocale) dojo.locale = this.locale.replace("_","-");
				this.localechanged = true;
				topic.publish("/components/"+this.id+"/locale-change",this.locale);
			}),
			// use this to force locale for locale-unaware navigation or no nav
			this.watch("newlocale",function(){
				var oldValue = lang.mixin({},this.currentItem);
				this.currentItem.locale = this.newlocale;
				this.onItem(oldValue,this.currentItem);
			}),
			this.watch("path",function(){
				topic.publish("/components/"+this.id+"/path-change",this.path);
			}),
			this.watch("pageId",function(){
				topic.publish("/components/"+this.id+"/page-id-change",this.pageId);
			}),
			this.watch("servicetype",function(){
				topic.publish("/components/"+this.id+"/service-type-change",this.servicetype);
			}),
			// all navigation components:
			this.watch("currentItem",function(prop,oldValue,newValue){
				this.onItem(oldValue,newValue);
			})
		);
		this.inherited(arguments);
		// set the hash AFTER all children were started
		var hash = dhash();
		if(!hash) {
			if(this.defaultHash) dhash(this.defaultHash);
		} else {
			//setTimeout(function(){
				topic.publish("/dojo/hashchange",hash);
			//},100);
		}
	}
});

});