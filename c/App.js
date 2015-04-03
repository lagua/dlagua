define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/topic",
	"dojo/on",
	"dojo/when",
	"dojo/hash",
	"./_MetaMixin",
],function(declare,lang,array,Deferred,topic,on,when,dhash,_MetaMixin){

	window.onbeforeappunload = function() {};
	
return declare("dlagua.c.App", [_MetaMixin], {
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
	onItem: function(oldValue,newValue){
		// first check to see if we should navigate away...
		var item;
		if(oldValue) {
			var block = onbeforeappunload();
			if(block) {
				if(!confirm(block)) {
					item = lang.mixin({},oldValue);
					var hash = this.itemToHash(item);
					if(dhash()!=hash) {
						this.set("changeFromApp", true);
						dhash(hash);
					} else {
						// republish
					}
					return new Deferred().reject();
				}
			}
		}
		item = lang.mixin({},newValue);
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
				return this.onItem(oldValue,newValue);
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
			topic.publish("/components/"+this.id+"/page-change",item);
			if(pathchanged || localechanged) {
				var hash = this.itemToHash(item);
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
			}
			d.resolve(true);
			if(item.id) this.set("pageId",item.id);
			//delete this.d;
		}));
		//return d;
	},
	itemToHash:function(item){
		var path = item.__truncated ? item.__truncated : item.path;
		var locale = this.useLocale ? item.locale : this.locale;
		var par = path.split("/");
		var stripar = this.stripPath.split("/");
		par = array.filter(par,function(item,index){
			return par[index]!=stripar[index];
		});
		var hash = (this.indexable ? "!" : "")+(this.useLocale ? locale : "")+(par.length && this.useLocale ? "/" : "")+par.join("/");
		return hash;
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
			topic.publish("/dojo/hashchange",hash);
		}
	}
});

});