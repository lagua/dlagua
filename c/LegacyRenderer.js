define([
	"require",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/window",
	"dojo/_base/fx",
	"dojo/Deferred",
	"dojo/Stateful",
	"dojo/aspect",
	"dojo/topic",
	"dojo/hash",
	"dojo/request",
	"dojo/request/script",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-style"
],function(require,declare,lang,array,win,fx,Deferred,Stateful,aspect,topic,dhash,request,script,dom,domConstruct,domStyle){
	
	var inferType = function(val){
		var nint = parseInt(val,10);
		if(nint == val) return nint;
		if(val == "true" || val == "false") return val==="true";
		return val;
	};
	
	var domainNode,appNode,views,view,curPath,defaultView = {data:{id:"default"}};
	
return declare("dlagua.c.LegacyRenderer",null,{
	_started:true, // escape initial startup
	url:null,
	nodes: {},
	rd:null,
	rels: {},
	fullpath: null,
	end: null,
	state: null,
	i18n:null,
	meta: {},
	created:false,
	replaced:{},
	stores: {},
	stateMap:null,
	useXDomain:false,
	pubBuffer:null,
	targetNode:"",
	xDomainResolver:null,
	getView:function(viewstr){
		if(!viewstr) return;
		return views.filter(function(_){
			return _.data.id==viewstr;
		}).pop();
	},
	checkView:function(path,force){
		if(force) {
			return view!=force ? force : null;
		}
		var routes = this.getRoutes(path);
		if(view!=routes[0]) {
			curPath = path;
			return routes[0];
		}
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
	getRoutes:function(path) {
		if(!path) {
			var hashItem = this.hashToItem(dhash());
			path = hashItem.path;
		}
		var routes = views.filter(function(_){
			return !_.data.route || path.match(new RegExp(_.data.route,"ig"));
		});
		if(routes.length>1) {
			routes = routes.filter(function(_){
				return !!_.data.route;
			});
			if(!routes.length) {
				if(views.length) {
					routes = views.filter(function(_){
						return _.data.id=="default";
					});
				}
			}
		} else {
			routes = [defaultView];
		}
		return routes;
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
	replaceMeta:function(node,type) {
		if(!type) type="";
		// replace variables in properties:
		var v, newv;
		var meta = this.getMeta(node);
		for(var i in node.data) {
			if(i=="id" || i=="type") continue;
			v = node.data[i];
			if(typeof v == "string" && v.indexOf("{"+type)>-1) {
				newv = lang.replace(v,meta).replace("undefined","");
				if(v!=newv) {
					if(v.indexOf("{i18n.")>-1) {
						// keep track of what is replaced
						if(!this.replaced["i18n"]) this.replaced["i18n"] = {};
						if(!this.replaced["i18n"][node.self]) this.replaced["i18n"][node.self] = {};
						this.replaced["i18n"][node.self][i] = v;
					}
					if(v.indexOf("{inferred.")>-1) {
						// keep track of what is replaced
						if(!this.replaced["inferred"]) this.replaced["inferred"] = {};
						if(!this.replaced["inferred"][node.self]) this.replaced["inferred"][node.self] = {};
						this.replaced["inferred"][node.self][i] = v;
					}
					var nint = parseInt(newv,10);
					if(nint == newv) newv = nint;
					node.data[i] = newv;
				}
			}
		}
		return node;
	},
	getIncomingNodes:function(node,type) {
		var incoming = node.incoming_relationships;
		var innodes = [];
		for(var i=0;i<incoming.length;i++) {
			var innode = this.nodes[incoming[i].start];
			if(!type || (type && innode.data.type==type)) {
				innode = this.replaceMeta(innode);
				innodes.push(innode.data.id);
			}
		}
		return innodes;
	},
	getIncomingStates:function(node) {
		var incoming = node.incoming_relationships;
		var instates = [];
		for(var i=0;i<incoming.length;i++) {
			if(incoming[i].data.id && incoming[i].type=="has_state") {
				instates.push(incoming[i].data.id);
			}
		}
		return instates;
	},
	getModelOrStore:function(node,outgoing) {
		var d;
		for(var i=0; i<outgoing.length;i++) {
			if(outgoing[i].type=="has_model") {
				d = new Deferred();
				var mnode = this.nodes[outgoing[i].end];
				mnode = this.replaceMeta(mnode);
				mid = this.toMid(mnode.data.modelType);
				var self = this;
				require([mid],function(Model){
					if(mnode.data.childrenAttrs) mnode.data.childrenAttrs = mnode.data.childrenAttrs.split(",");
					// TODO id omzetten naar gebruikte id
					if(mnode.data.search) mnode.data.query = "?id="+encodeURIComponent(mnode.data.search);
					var mout = mnode.outgoing_relationships;
					self.getModelOrStore(mnode,mout).then(function(store){
						node.data.model = mnode.model = new Model(mnode.data);
						d.resolve();
					});
				});
				break;
			}
			// this means we have a datastore to take in
			if(outgoing[i].type=="has_datastore"){
				d = new Deferred();
				var dsnode = this.nodes[outgoing[i].end];
				var dsinstates = this.getIncomingNodes(dsnode,"state");
				// if the current state is not among my incoming states, skip me
				if(dsinstates.length && array.indexOf(dsinstates,state)==-1) {
					continue;
				}
				dsnode = this.replaceMeta(dsnode);
				mid = this.toMid(dsnode.data.storeType);
				require([mid],function(Store){
					node.data.store = dsnode.store = new Store(dsnode.data);
					d.resolve();
				});
				break;
			}
		}
		if(!d) {
			d = new Deferred();
			d.resolve();
		}
		return d;
	},
	getSubscriptions:function(node,outgoing) {
		if(!node.dojoo) return;
		for(var i=0; i<outgoing.length;i++) {
			if(outgoing[i].type=="has_subscription") {
				var snode = this.nodes[outgoing[i].end];
				snode = this.replaceMeta(snode);
				if(snode.data.channel && node.dojoo.subscribe) {
					node.dojoo.subscribe(snode.data.channel, snode.data);
				}
			}
		}
	},
	toMid: function(type) {
		return type.replace(/\./g,"/");
	},
	_addRecursive:function(id,incomingid,state) {
		var d = new Deferred();
		var self = this;
		var node = this.nodes[id];
		var outgoing = node.outgoing_relationships;
		if(node.data.type=="app") {
			outgoing = array.filter(outgoing,function(x) {
				return x.type!="has_state";
			});
			views = outgoing.filter(function(_){
				return _.type=="has_state"; 
			});
			var routes = self.getRoutes(curPath);
			curPath = null;
			view = routes[0];
			console.warn("view is "+view.data.id,outgoing)
		}
		var incoming = node.incoming_relationships;
		var innode = this.nodes[incomingid];
		var mid,dojoo;
		if(!state) state = this.state;
		var next = lang.hitch(this,function(){
			if(outgoing.length>0) {
				node.innode = innode;
				node.childrenDone = 0;
				node.onChildDone = function(id){
					var outgoing = this.outgoing_relationships;
					if(this.data.type=="app") {
						outgoing = array.filter(outgoing,function(x) {
							return x.type!="has_state";
						});
					}
					for(var i=0;i<outgoing.length;i++) {
						if(outgoing[i].end==id) {
							this.childrenDone++;
							break;
						}
					}
					console.log(outgoing.length+" == "+this.childrenDone,this.data.id,self.nodes[id].data.id);
					if(outgoing.length==this.childrenDone) {
						console.log(this.data.id+" children done");
						if(this.innode) {
							//console.log("we have innode")
							this.innode.onChildDone(this.self);
						} else {
							console.log("create callback");
							self.rd.resolve(true);
						}
					}
				};
				outgoing.sort(function(a,b){
					var na = self.nodes[a.end];
					var nb = self.nodes[b.end];
					return na.data.order-nb.data.order;
				});
				var i=0,outgoingid;
				for(i=0;i<outgoing.length;i++) {
					if(outgoing[i].type=="has_restservice") {
						outgoingid = outgoing[i].end;
						this._addRecursive(outgoingid,id,state);
					}
				}
				for(i=0;i<outgoing.length;i++) {
					if(outgoing[i].type!="has_restservice") {
						outgoingid = outgoing[i].end;
						this._addRecursive(outgoingid,id,state);
					}
				}
			} else {
				innode.onChildDone(node.self);
			}
		});
		//console.log("traversing "+node.self);
		if(!node.created){
			if(!node.data || node.data.skip) {
				innode.onChildDone(node.self);
				return;
			}
			var instates = this.getIncomingStates(node);
			// inherit parent stateS
			if(innode && innode.instates instanceof Array) {
				instates = innode.instates.concat(instates);
			}
			// set the node's stateS for future reference
			node.instates = instates;
			// if the current state is not among my incoming states, skip me
			if(instates.length && instates.length>0 && array.indexOf(instates,state)==-1) {
				console.log("skipping "+node.data.id+", instates: ",instates," != "+state);
				innode.onChildDone(node.self);
				return;
			}
			node.created = true;
			console.log((self.created ? "re" : "")+"creating ",node.data.id, state, node.instates)
			if(node.data.type!="domain") node = this.replaceMeta(node);
			switch(node.data.type) {
				case "domain":
					if(!this.meta.domain) this.meta.domain = {};
					if(!this.meta.inferred) this.meta.inferred = {};
					this.meta.domain = lang.mixin(this.meta.domain,node.data);
					this.meta.inferred = lang.mixin(this.meta.inferred,node.data);
					// determine locale asap
					var rest;
					var hash = dhash();
					var hashar = hash.split(":");
					if(hashar.length>1 && !hashar[0].match(/\?|\//)) {
						rest = hashar[1];
					} else {
						rest = hash;
					}
					if(rest) {
						hashar = rest.split("/");
						var locale = hashar[0];
						if(locale) {
							this.meta.inferred.locale = locale;
						}
					}
					// pull in domain requires
					if(node.data.require) {
						var reqs = [];
						array.forEach(node.data.require.split(","),function(req){
							reqs.push(lang.trim(req.replace(/\./g,"/")));
						});
						require(reqs,next);
					} else {
						next();
					}
				break;
				case "app":
					// filter out states
					outgoing = array.filter(outgoing,function(x){
						return (x.type!="has_state");
					});
					mid = this.toMid(node.data.appType);
					var createApp = lang.hitch(this,function(App){
						if(!App) {
							require([mid],function(App){
								createApp(App);
							});
							return;
						}
						// these properties may not be overwritted in the app
						this._started = false;
						this.postscript = function(){};
						
						declare.safeMixin(node.data,this);
						
						var app = new App(node.data,this.targetNode);
						
						if(app) {
							lang.mixin(this,app);
							// treat app as widget
							this.onAddWidget(this);
							dijit.registry._hash[node.data.id] = this;
							node.dojoo = this;
							//this.getSubscriptions(node,outgoing);
							// moved from app because everything has to be replaced from here
							var hash = dhash() || this.defaultHash;
							if(hash) {
								var item = this.hashToItem(hash);
								this.infer(item.path);
							}
						}
						next();
					});
					if(outgoing.length) {
						for(var i=0;i<outgoing.length;i++) {
							if(outgoing[i].type=="has_auth"){
								if(!node.data.auth) {
									// authType is default until further notice
									var anode = this.nodes[outgoing[i].end];
									anode = this.replaceMeta(anode);
									var authtype = anode.data.authType;
									var target = anode.data.target;
									var url = target+"/"+(anode.data.sessionId ? anode.data.id : "");
									var sessionParam = anode.data.sessionParam;
									var req = ["dlagua/c/rpc/auth"];
									require(req,function(auth){
										auth(url,{
											sessionParam:sessionParam
										}).then(function(res){
											node.data.auth = self.meta.auth = lang.mixin(self.meta.auth,res);
											createApp();
										});
									});
									return;
								}
							}
						}
					}
					createApp();
				break;
				case "widget":
					mid = this.toMid(node.data.dojoType);
					this.getModelOrStore(node,outgoing).then(function(){
						require([mid],function(Widget){
							var widget = node.dojoo = new Widget(node.data);
							// connector for claro
							self.onAddWidget(widget);
							// it should have incoming
							if(innode && innode.dojoo) {
								var index = "last";
								if(node.data.order) {
									var order = node.data.order;
									var children = innode.dojoo.getChildren();
									var l = children.length;
									if(l>0 && children[l-1].order>=order) {
										index = 0;
										for(var i=0;i<l;i++){
											var c = children[i];
											if(c.order && c.order>node.data.order) break;
											index++;
										}
									}
								}
								if(widget.domNode) {
									innode.dojoo.addChild(widget,index);
								} else {
									aspect.after(dojoo,"ready",lang.hitch(widget,function(){
										innode.dojoo.addChild(widget);
									}));
								}
							}
							//self.getSubscriptions(node,outgoing);
							next();
						});
					});
				break;
				case "restservice":
					// TODO set other refProperty if not ContentPane
					mid = this.toMid(node.data.restType);
					if(innode && innode.dojoo) {
						node.data.ref = innode.dojoo;
					} else {
						node.data.ref = this;
					}
					require([mid],function(Service){
						var service = node.dojoo = new Service(node.data);
						if(innode && innode.dojoo) innode.dojoo.restservice = service;
						next();
					});
				break;
				case "subscription":
					// widget.subscribe should be dlagua/c/subscribe, via dlagua/c/Subscribable
					if(innode.dojoo && node.data.channel && innode.dojoo.subscribe) {
						innode.dojoo.subscribe(node.data.channel, node.data);
					}
					next();
				break;
				case "content":
					switch(node.data.contentType) {
						case "image/jpeg":
							var domElement = domConstruct.create("img",{
								id:node.data.id,
								src:node.data.uri,
								"class":node.data["class"]
							});
							// zijn hier alternatieven mogelijk?
							if(innode.dojoo) {
								innode.dojoo.set("content",domElement);
							}
							node.domElement = domElement;
						break;
						case "text/html":
							if(innode.dojoo) {
								innode.dojoo.set("href",node.data.uri);
							}
						break;
						case "text/xml":
							// zijn hier alternatieven mogelijk?
							if(innode.dojoo) {
								innode.dojoo.set("href",node.data.uri);
							}
						break;
					}
					next();
				break;
				default:
					next();
				break;
			}
		} else {
			next();
		}
	},
	_destroyRecursive:function(id,incomingid,full) {
		var self = this;
		var node = this.nodes[id];
		var incoming = node.incoming_relationships;
		var innode = this.nodes[incomingid];
		console.log("traversing "+node.data.id);
		if(node.created && ((node.instates && node.instates.length>0 && array.indexOf(node.instates,this.state)==-1) || full)) {
			console.log("destroying wrong node "+node.data.id);
			node.created = false;
			if(node.dojoo && node.dojoo["destroyRecursive"]) {
				node.dojoo.destroyRecursive();
				var splitter = node.dojoo._splitterWidget;
				if(splitter){
					splitter.destroy();
				}
				delete node.dojoo._splitterWidget;
			}
		}
		var outgoing = array.filter(node.outgoing_relationships,function(x) {
			return x.type!="has_state";
		});
		if(outgoing.length>0) {
			node.innode = innode;
			node.childrenDone = 0;
			node.onChildDone = function(id){
				var outgoing = array.filter(this.outgoing_relationships,function(x) {
					return x.type!="has_state";
				});
				for(var i=0;i<outgoing.length;i++) {
					if(outgoing[i].end==id) {
						this.childrenDone++;
						break;
					}
				}
				if(outgoing.length==this.childrenDone) {
					console.log(this.data.id+" children done");
					if(this.innode) {
						this.innode.onChildDone(this.self);
					} else {
						console.log("destroy callback")
						self.rd.resolve(true);
					}
				}
			};
			for(var i=0;i<outgoing.length;i++) {
				var outgoingid = outgoing[i].end;
				this._destroyRecursive(outgoingid,id,full);
			}
		} else {
			innode.onChildDone(node.self);
		}
	},
	load:function() {
		var max = this.fullpath.length-1;
		this.end = this.fullpath[max].end.self;
		for(var p=0;p<this.fullpath.length;p++){
			var path = this.fullpath[p];
			for(var n=0;n<path.nodes.length;n++){
				var node = path.nodes[n];
				var id = node.self;
				if(!this.nodes[id]) {
					node.outgoing_relationships = [];
					node.incoming_relationships = [];
					this.nodes[id] = node;
				}
			}
			for(var r=0;r<path.relationships.length;r++){
				var rel = path.relationships[r];
				var id = rel.self;
				if(!this.rels[id]) {
					this.nodes[rel.start].outgoing_relationships.push(rel);
					this.nodes[rel.end].incoming_relationships.push(rel);
					this.rels[id] = rel;
				}
			}
		}
		this.rd = new Deferred();
		this.rd.then(lang.hitch(this,function(sxs){
			//console.log("callback")
			//if(!this.app) return;
			this.ready();
			var loader = dom.byId("loader");
			if(loader) domStyle.set(loader,"display","none");
			//if(this.meta.domain) this.addBase("http://"+self.meta.domain.id+"/");
			// in case we have a parent
			var parent = this.getParent();
			if(parent) {
				parent._started = false;
				parent.startup();
			} else {
				this.startup();
			}
			fx.fadeIn({node:this.domNode,duration:500}).play();
			this.created = true;
		}));
		// try to read initial state
		var hash = dhash();
		var hashar = hash.split(":");
		var state,rest,locale,path;
		if(hashar.length>1 && !hashar[0].match(/\?|\//)) {
			state = hashar[0];
			rest = hashar[1];
		} else {
			state = "initial";
			rest = hash;
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
		this.state = state;
		this._addRecursive(this.fullpath[0].start.self,null,state);
	},
	rebuild:function(){
		var d = new Deferred();
		this.rd = new Deferred();
		this.rd.then(lang.hitch(this,function(sxs){
			console.log("destroy callback")
			this.rd = new Deferred();
			this.rd.then(lang.hitch(this,function(sxs){
				console.log("recreate callback")
				d.resolve(sxs);
			}));
			this._addRecursive(this.fullpath[0].start.self);
		}));
		this._destroyRecursive(this.fullpath[0].start.self);
		return d;
	},
	_init:function(){
		var self = this;
		if(!self.useXDomain) {
			request(this.url,{
				handleAs:"json"
			}).then(function(res){
				self.fullpath = res;
				self.load();
			});
		} else {
			if(self.xDomainResolver) {
				var resolver = self.xDomainResolver;
				var content = {};
				content[resolver.fileParamName] = self.url;
				script(resolver.path,{
					jsonp:resolver.callbackParamName,
					query:content
				}).then(function(res){
					self.fullpath = res;
					self.load();
				});
			}
		}
	},
	postscript: function(params,srcNodeRef){
		if(params) {
			lang.mixin(this,params);
		}
		
		if(!this.targetNode) this.targetNode = srcNodeRef;
		this._init();
	},
	onAddWidget:function(widget){
		this.inherited(arguments);
	},
	ready:function(){
		this.inherited(arguments);
	}
});

});