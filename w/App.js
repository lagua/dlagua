dojo.provide("dlagua.w.App");
dojo.require("dlagua.c.Subscribable");
dojo.require("dijit.layout.BorderContainer");
dojo.declare("dlagua.w.App", [dijit.layout.BorderContainer,dlagua.c.Subscribable], {
	gutters:false,
	currentItem:null,
	state:"initial",
	path:"",
	defaultHash:"",
	indexable:false,
	locale:"",
	servicetype:"",
	useLocale:true,
	depth:0,
	meta:{},
	stateMap:null,
	replaced:[],
	fromHash:false,
	infer:function(path,servicetype,depth,fromHash,truncated){
		var d = new dojo.Deferred();
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
		this.meta.inferred = dojo.mixin(this.meta.inferred,inferred);
		d.callback(true);
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
		var restar = rest.split("/");
		if(this.useLocale) locale = restar.shift();
		path = restar.join("/");
		var item = {
			state:state,
			locale:locale,
			path:path
		};
		return item;
	},
	getMeta:function(node){
		var i18n = {};
		if(this.i18n) {
			for(var i=0;i<this.i18n.length;i++) {
				i18n.locale = this.i18n[i].locale;
				if(this.i18n[i].component==node.data.id) {
					if(this.i18n[i].properties) i18n = dojo.mixin(i18n,this.i18n[i].properties);
					break;
				}
			}
		}
		return dojo.mixin(this.meta,{i18n:i18n});
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
						if(dojo.isString(v)) {
							var newv = dojo.replace(v,meta).replace(/undefined|false|null/,"");
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
					if(dojo.isString(v)) node.data[k] = v;
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
						if(dojo.isString(v)) {
							var newv = dojo.replace(v,meta).replace(/undefined|false|null/,"");
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
					if(dojo.isString(v)) node.data[k] = v;
				}
				//delete this.replaced["i18n"][id];
			}
		}
		return reset;
	},
	onItem: function(){
		var item = dojo.mixin({},this.currentItem);
		console.log("onItem",item)
		var state = item.state || this.state;
		var path = item.path;
		var locale = item.locale;
		var model = item.model;
		var servicetype = item.type || (model ? "persvr" : "");
		var d = new dojo.Deferred();
		if(!item.__fromHash) item.__fromHash = false;
		if(!item.__view) item.__view = false;
		if(item.__truncated) {
			this.path = path;
			path = item.__truncated;
		} else {
			item.__truncated = false;
		}
		var fromHash = item.__fromHash;
		if(this.state!=state) {
			console.log("changing state!")
			this.set("state", state);
			this.rebuild().then(dojo.hitch(this,function(){
				this.resize();
				// reset item to trigger stuff below
				d = this.onItem();
			}));
			return d;
		}
		var localechanged = this.localechanged || (locale != this.locale);
		this.localechanged = false;
		var typechanged = (!fromHash && servicetype!="" && this.servicetype!=servicetype);
		var depth = item.__depth = item.path.split("/").length;
		var depthchanged = (this.depth!=depth);
		var pathchanged = (this.path!=path);
		if(!fromHash && this.meta.inferred) {
			this.meta.inferred = item;
		}
		// only change from item, block the hash subscription
		// let slip the next call
		this.infer(path,servicetype,depth,fromHash,item.__truncated).then(dojo.hitch(this,function(){
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
			dojo.forEach(reset,function(r){
				r.dojoo.set(r.key,r.value);
			});
			if(pathchanged) {
				if(!fromHash && !item.__truncated) this.set("changeFromApp", true);
				dojo.publish("/app/pagechange",[item]);
				var hash = (this.indexable ? "!" : "")+(state!="initial" && !this.stateMap ? state+":" : "")+locale+"/"+path;
				dojo.hash(hash);
				this.set("path",path);
				d.callback(true);
			} else {
				dojo.publish("/app/pagechange",[item]);
				d.callback(true);
			}
		}));
		return d;
	},
	startup: function(){
		console.log("app startup called");
		var hash = dojo.hash() || this.defaultHash;
		if(hash) {
			var item = this.hashToItem(hash);
			this.infer(item.path);
		}
		dojo.subscribe("/dojo/hashchange", this, function(hash){
			if(this.changeFromApp) {
				this.changeFromApp = false;
				return;
			}
			var item = this.hashToItem(hash);
			item.__fromHash = true;
			this.set("currentItem",item);
		});
		this.watch("state",function(){
			dojo.publish("/app/statechange",[this.state]);
		});
		this.watch("locale",function(){
			this.localechanged = true;
			dojo.publish("/app/localechange",[this.locale]);
		});
		// use this to force locale for locale-unaware navigation or no nav
		this.watch("newlocale",function(){
			this.currentItem.locale = this.newlocale;
			this.onItem();
		});
		this.watch("path",function(){
			dojo.publish("/app/pathchange",[this.path]);
		});
		this.watch("servicetype",function(){
			dojo.publish("/app/servicetypechange",[this.servicetype]);
		});
		this.connect(window,"onresize",function(){
			this.resize();
		});
		// all navigation components:
		this.watch("currentItem",dojo.hitch(this,function(){
			this.onItem()
		}));
		
		this.inherited(arguments);
		// set the has AFTER all children were started
		var hash = dojo.hash();
		if(!hash) {
			if(this.defaultHash) dojo.hash(this.defaultHash);
		} else {
			setTimeout(function(){
				dojo.publish("/dojo/hashchange",[hash]);
			},100);
		}
	}
});