define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/Stateful",
	"dojo/topic",
	"dojo/on",
	"dojo/hash",
	"dijit/layout/BorderContainer",
	"dlagua/w/Subscribable"
],function(declare,lang,array,Deferred,Stateful,topic,on,dhash,BorderContainer,Subscribable){

return declare("dlagua.w.App", [BorderContainer,Subscribable], {
	gutters:false,
	currentItem:null,
	state:"initial",
	path:"",
	defaultHash:"",
	indexable:false,
	stripPath:"content",
	locale:"",
	servicetype:"",
	useLocale:true,
	depth:0,
	meta:{},
	stateMap:null,
	replaced:[],
	fromHash:false,
	infer:function(path,servicetype,depth,fromHash,truncated,oldValue){
		var d = new Deferred();
		var inferred = {};
		inferred.__view = false;
		if(!this.localechanged && ((this.servicetype=="persvr" && fromHash) || servicetype=="persvr")) {
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
		var hashar = hash.split(":");
		var state,rest,locale,path;
		if(hashar.length>1) {
			state = hashar[0];
			rest = hashar[1];
		} else {
			state = "initial";
			rest = hashar[0];
		}
		// try stateMap
		if(state=="initial" && this.stateMap) {
			for(var k in this.stateMap) {
				var patt = new RegExp(this.stateMap[k],"ig");
				if(patt.test(rest)) {
					state = k;
					break;
				}
			}
		}
		// concat stripPath:
		var restar = rest.split("/");
		if(this.useLocale) locale = restar.shift();
		if(this.stripPath) {
			restar = this.stripPath.split("/").concat(restar);
		}
		path = restar.join("/");
		var item = {
			state:state,
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
				if(this.i18n[i].component==node.data.id) {
					if(this.i18n[i].properties) i18n = lang.mixin(i18n,this.i18n[i].properties);
					break;
				}
			}
		}
		return lang.mixin(this.meta,{i18n:i18n});
	},
	replaceInferred:function(){
		var k,v;
		var reset = [];
		for(var id in this.replaced["inferred"]) {
			var node = this.nodes[id];
			var meta = this.getMeta(node);
			if(node.created) {
				if(node.dojoo) {
					for(k in this.replaced["inferred"][id]) {
						v = this.replaced["inferred"][id][k];
						if(typeof v == "string") {
							var newv = lang.replace(v,meta).replace(/undefined|false|null/,"");
							//console.log("reset",k,v,newv)
							reset.push({dojoo:node.dojoo,key:k,value:newv});
							//node.dojoo.set(k,newv);
						}
					}
				}
			} else {
				//console.log("reset inferred: ",id,k,v);
				for(k in this.replaced["inferred"][id]) {
					v = this.replaced["inferred"][id][k];
					if(typeof v == "string") node.data[k] = v;
				}
			}
		}
		return reset;
	},
	replaceI18n:function(){
		var k,v;
		var reset = [];
		for(var id in this.replaced["i18n"]) {
			var node = this.nodes[id];
			var meta = this.getMeta(node);
			if(node.created) {
				if(node.dojoo) {
					for(k in this.replaced["i18n"][id]) {
						v = this.replaced["i18n"][id][k];
						if(typeof v == "string") {
							var newv = lang.replace(v,meta).replace(/undefined|false|null/,"");
							//console.log("reset",k,v,newv)
							reset.push({dojoo:node.dojoo,key:k,value:newv});
							//node.dojoo.set(k,newv);
						}
					}
				}
			} else {
				//console.log("reset i18n: ",id,k,v);
				for(k in this.replaced["i18n"][id]) {
					v = this.replaced["i18n"][id][k];
					if(typeof v == "string") node.data[k] = v;
				}
				//delete this.replaced["i18n"][id];
			}
		}
		return reset;
	},
	onItem: function(oldValue,newValue){
		var item = lang.mixin({},this.currentItem);
		console.log("onItem",item)
		var state = item.state;
		var path = item.path;
		var locale = this.useLocale ? item.locale : this.locale;
		var model = item.model;
		var servicetype = item.type || (model ? "persvr" : "");
		//if(this.d && !this.d.isResolved()) {
		//	console.warn("CANCELING INFER")
		//	this.d.cancel();
			//delete this.d;
		//}
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
		if(state && this.state!=state) {
			console.log("changing state!")
			//var oldValue = lang.mixin({},this.currentItem);
			this.set("state", state);
			this.rebuild().then(lang.hitch(this,function(){
				this.resize();
				// reset item to trigger stuff below
				d = this.onItem(oldValue,this.currentItem);
			}));
			return d;
		}
		if(!state) state = "initial";
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
				topic.publish("/app/pagechange",item);
				var par = path.split("/");
				var stripar = this.stripPath.split("/");
				par = array.filter(par,function(item,index){
					return par[index]!=stripar[index];
				});
				var hash = (this.indexable ? "!" : "")+(state!="initial" && !this.stateMap ? state+":" : "")+(this.useLocale ? locale : "")+(par.length && this.useLocale ? "/" : "")+par.join("/");
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
				topic.publish("/app/pagechange",item);
				d.resolve(true);
			}
			if(item.id) this.set("pageid",item.id);
			//delete this.d;
		}));
		//return d;
	},
	startup: function(){
		console.log("app startup called");
		topic.subscribe("/dojo/hashchange", lang.hitch(this,function(hash){
			if(this.changeFromApp) {
				this.changeFromApp = false;
				return;
			}
			var item = this.hashToItem(hash);
			item.__fromHash = true;
			this.set("currentItem",item);
		}));
		this.own(
			this.watch("state",function(){
				topic.publish("/app/statechange",this.state);
			}),
			this.watch("locale",function(){
				if(!this.locale) return;
				dojo.locale = this.locale.replace("_","-");
				if(window.fluxProcessor) fluxProcessor.setLocale(dojo.locale.split("-")[0]);
				this.localechanged = true;
				topic.publish("/app/localechange",this.locale);
			}),
			// use this to force locale for locale-unaware navigation or no nav
			this.watch("newlocale",function(){
				var oldValue = lang.mixin({},this.currentItem);
				this.currentItem.locale = this.newlocale;
				this.onItem(oldValue,this.currentItem);
			}),
			this.watch("path",function(){
				topic.publish("/app/pathchange",this.path);
			}),
			this.watch("pageid",function(){
				topic.publish("/app/pageidchange",this.pageid);
			}),
			this.watch("servicetype",function(){
				topic.publish("/app/servicetypechange",this.servicetype);
			}),
			// all navigation components:
			this.watch("currentItem",function(prop,oldValue,newValue){
				this.onItem(oldValue,newValue);
			}),
			on(window,"onresize",lang.hitch(this,function(){
				this.resize();
			}))
		);
		this.inherited(arguments);
		this.resize();
		// set the hash AFTER all children were started
		//var hash = dhash() || this.defaultHash;
		//if(hash) {
		//	var item = this.hashToItem(hash);
		//	this.infer(item.path);
		//}
		var hash = dhash();
		if(!hash) {
			if(this.defaultHash) dhash(this.defaultHash);
		} else {
			setTimeout(function(){
				topic.publish("/dojo/hashchange",hash);
			},100);
		}
	}
});

});