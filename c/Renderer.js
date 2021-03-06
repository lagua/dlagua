define([
	"require",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/request",
	"dojo/Deferred",
	"dojo/when",
	"dojo/promise/all",
	"dojo/aspect",
	"dojo/hash",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dlagua/c/store/JsonRest",
	"./_MetaMixin",
	"rql/js-array",
	"dijit/registry"
],function(require,declare,lang,array,fx,request,Deferred,when,all,aspect,dhash,dom,domStyle,domConstruct,Memory,Cache,JsonRest,_MetaMixin,rqlArray,registry){
	
	function sortRels(rels) {
		var tmp = rels.slice(0);
		var sorted = [];
		// iterate through results and move correct item to sorted
		var beforeId = null, len = tmp.length;
		// if item wasn't found, escape
		while(tmp.length && len>0) {
			var rel = tmp.pop();
			if(!rel.data) rel.data = {before:null};
			if(rel.data.before==beforeId) {
				// update safety
				len = tmp.length;
				beforeId = rel.id;
				sorted.unshift(rel);
			} else {
				tmp.unshift(rel);
				len--;
			}
		}
		var tlen = tmp.length;
		if(tlen>0) {
			console.warn("Order will be reset!")
			// force order, also flag for save!
			// since before of the last of sorted is null, add it to the rels to update
			if(sorted.length>0) {
				tmp.unshift(sorted.pop());
				tlen++;
			}
			return sorted.concat(tmp);
		}
		return sorted;
	}
	
	
	var wrappedreq = function(req) {
		var d = new Deferred();
		require(req,function(){
			d.resolve.apply(null,arguments);
		});
		return d;
	};
	
	// set private app node and views
	var domainNode,appNode,views,view,curPath;
	
return declare("dlagua.c.Renderer",[_MetaMixin],{
	_started:true, // escape initial startup
	url:null,
	nodes: {},
	rd:null,
	rels: {},
	fullpath: null,
	end: null,
	i18n:null,
	meta: {},
	created:false,
	replaced:{},
	stores: {},
	pubBuffer:null,
	refProperty:"$ref",
	targetNode:"",
	domain:"",
	
	getIncomingNodes:function(node,type) {
		var incoming = node.incoming_relationships;
		var innodes = [];
		for(var i=0;i<incoming.length;i++) {
			var innode = this.nodeStore.get(incoming[i].start);
			if(!type || (type && innode.data.type==type)) {
				innode = this.replaceMeta(innode);
				innodes.push(innode.data.id);
			}
		}
		return innodes;
	},
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
				routes = views.filter(function(_){
					return _.data.id=="default";
				});
			}
		}
		return routes;
	},
	addCss:function(href) {
		var d = new Deferred();
		var h = document.getElementsByTagName("head")[0];
		domConstruct.create("link",{
			href:href,
			rel:"stylesheet",
			type:"text/css",
			onload:function(){
				d.resolve(this);
			}
		},h);
		return d;
	},
	addTheme:function(){
		return this.nodeStore.query({id:appNode.id}).then(lang.hitch(this,function(res){
			var appNode = res[0];
			this.nodeStore.getChildren(appNode,"type=has_theme").then(lang.hitch(this,function(outgoing) {
				var theme;
				if(!outgoing || !outgoing.length) {
					// try adding default theme
					theme = "default";
				} else {
					var themeNode = outgoing.pop();
					var theme = themeNode.data.id;
				}
				this.theme = theme;
				var app = domainNode.data.app;
				var path = app ? "/themes/"+theme : "/rest/themes/"+theme;
				var files = ["master","widget","flow"];
				var proms = [];
				var d = new Deferred();
				for(var i=0;i<3;i++) {
					proms.push(this.addCss(path+"/"+files[i]+".css?r="+Math.random()));
				}
				return all(proms);
			}));
		}));
	},
	getModelOrStore:function(node) {
		if(node.modelNode) {
			var mnode = node.modelNode;
			//delete node.modelNode;
			var Model = mnode.Model;
			//delete mnode.Model;
			mnode = this.replaceMeta(mnode);
			if(mnode.data.childrenAttrs) mnode.data.childrenAttrs = mnode.data.childrenAttrs.split(",");
			// TODO id omzetten naar gebruikte id
			if(mnode.data.search) mnode.data.query = "?id="+encodeURIComponent(mnode.data.search);
			this.getModelOrStore(mnode);
			node.data.model = mnode.model = new Model(mnode.data);
			return mnode;
		}
		if(node.storeNode) {
			var dsnode = node.storeNode;
			//delete node.storeNode;
			var Store = dsnode.Store;
			//delete dsnode.Store;
			dsnode = this.replaceMeta(dsnode);
			node.data.store = dsnode.store = new Store(dsnode.data);
			return dsnode;
		}
	},
	loadModelOrStore:function(node) {
		var self = this;
		return all([this.nodeStore.getChildren(node,"type=has_model").then(lang.hitch(this,function(outgoing) {
			return all(outgoing.map(lang.hitch(this,function(mnode){
				var mid = this.toMid(mnode.data.modelType);
				return wrappedreq([mid]).then(function(Model){
					mnode.Model = Model;
					node.modelNode = mnode;
					return self.loadModelOrStore(mnode).then(function(){
						return mnode;
					});
				});
			})));
		})),
		this.nodeStore.getChildren(node,"type=has_datastore").then(lang.hitch(this,function(outgoing) {
			return all(outgoing.map(lang.hitch(this,function(dsnode){
				var mid = this.toMid(dsnode.data.storeType);
				return wrappedreq([mid]).then(function(Store){
					node.storeNode = dsnode;
					dsnode.Store = Store;
					return dsnode;
				});
			})));
		}))]);
	},
	getModules:function(node) {
		return this.nodeStore.getChildren(node,"type=has_module").then(lang.hitch(this,function(outgoing) {
			return all(outgoing.map(lang.hitch(this,function(mnode){
				//this.nodes[mnode.id] = mnode;
				mnode = this.replaceMeta(mnode);
				return wrappedreq([mnode.data.url]);
			})));
		}));
	},
	getSubscriptions:function(node,outgoing) {
		if(!node.dojoo) return;
		for(var i=0; i<outgoing.length;i++) {
			if(outgoing[i].type=="has_subscription") {
				var snode = this.nodeStore.get(outgoing[i].end);
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
	_loadRecursive:function(node,innode) {
		var self = this;
		var mid;
		var dd = new Deferred();
		this.nodeStore.getChildren(node,node.data.type=="widget" ? "type!=has_model&type!=has_datastore" : "").then(lang.hitch(this,function(outgoing) {
			if(outgoing.length) {
				all(outgoing.map(lang.hitch(this,function(node,index){
					var mid;
					var d = new Deferred();
					switch(node.data.type) {
						case "widget":
							mid = this.toMid(node.data.dojoType);
							this.loadModelOrStore(node).then(function(){
								wrappedreq([mid]).then(function(Widget){
									node.Widget = Widget;
									d.resolve(node);
								});
							});
							break;
						case "restservice":
							mid = this.toMid(node.data.restType);
							wrappedreq([mid]).then(function(Service){
								node.Service = Service;
								d.resolve(node);
							});
							break;
						default:
							d.resolve(node);
							break;
					}
					return d;
				}))).then(function(outgoing){
					all(outgoing.map(function(_){
						return self._loadRecursive(_,node);
					})).then(function(nodes){
						dd.resolve(node);
					});
				});
			} else {
				dd.resolve(node);
			}
		}));
		return dd;
	},
	_addRecursive:function(node,innode) {
		var self = this;
		var mid;
		node = this.nodeStore.get(node.id) || node;
		var dd = new Deferred();
		this.nodeStore.getChildren(node,node.data.type=="widget" ? "type!=has_model&type!=has_datastore" : "").then(lang.hitch(this,function(outgoing) {
			var d = new Deferred();
			if(outgoing.length) {
				d.then(lang.hitch(this,function(node){
					if(node.data.type=="app") {
						views = outgoing.filter(function(_){
							return _.data.type=="view"; 
						});
						outgoing = self.getRoutes(curPath);
						curPath = null;
						view = outgoing[0];
						if(view) this.set("view",view.data.id);
						console.log("view is "+view.data.id,outgoing)
					}
					all(outgoing.map(function(_){
						console.log(_.data.id);
						return self._addRecursive(_,node);
					})).then(function(nodes){
						node.children = nodes;
						dd.resolve(node);
					});
				}));
			} else {
				d.then(function(node){
					dd.resolve(node);
				});
			}
			if(!node.created){
				if(!node.data || node.data.skip) {
					d.resolve(node);
					return d;
				}
				node.created = true;
				if(innode && innode.dojoo && innode.data.type=="widget") innode.dojoo = registry.byId(innode.data.id);
				//console.log((self.created ? "re" : "")+"creating ",node.data.type,node.data.id)
				if(node.data.type!="domain") node = this.replaceMeta(node);
				switch(node.data.type) {
					case "domain":
						if(!this.meta.domain) this.meta.domain = {};
						if(!this.meta.inferred) this.meta.inferred = {};
						this.meta.domain = lang.mixin(this.meta.domain,node.data);
						this.meta.inferred = lang.mixin(this.meta.inferred,node.data);
						domainNode = node;
						var domd = new Deferred();
						// resolve metadata if have
						if(node.data.metaservice) {
							domd = request(node.data.metaservice,{
								sync:true,
								handleAs:"json",
								headers:{
									accept:"application/json",
									"content-type":"application/json"
								}
							}).then(lang.hitch(this,function(res){
								lang.mixin(this.meta.domain,res[0].data);
							}));
						} else {
							domd.resolve();
						}
						// pull in domain requires
						if(node.data.require) {
							var reqs = [];
							array.forEach(node.data.require.split(","),function(req){
								reqs.push(lang.trim(req.replace(/\./g,"/")));
							});
							require(reqs,function(){
								domd.then(function(){
									d.resolve(node);
								});
							});
						} else {
							domd.then(function(){
								d.resolve(node);
							});
						}
					break;
					case "app":
						// insert css first
						appNode = node;
						mid = this.toMid(node.data.appType);
						// determine locale asap
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
								//this.onAddWidget(this);
								registry._hash[node.data.id] = this;
								node.dojoo = this;
								//this.getSubscriptions(node,outgoing);
								// moved from app because everything has to be replaced from here
								var hash = dhash() || this.defaultHash;
								if(hash) {
									var item = this.hashToItem(hash);
									this.meta.inferred.locale = item.locale;
									this.infer(item.path);
								}
							}
							d.resolve(node);
						});
						this.addTheme().then(function(){
							createApp();
						});
					break;
					case "view":
						// pass the app to the view
						node.dojoo = innode.dojoo;
						if(outgoing.length) {
							for(var i=0;i<outgoing.length;i++) {
								if(outgoing[i].data.type=="auth"){
									if(!node.data.auth) {
										// authType is default until further notice
										var anode = outgoing[i];
										anode = this.replaceMeta(anode);
										//var authtype = anode.data.authType;
										var req = ["dlagua/c/rpc/auth"];
										var url = anode.data.target;
										require(req,function(auth){
											auth(url,anode.data).then(function(res){
												node.data.auth = self.meta.auth = lang.mixin(self.meta.auth,res);
												d.resolve(node);
											});
										});
										return;
									}
								}
							}
						}
						d.resolve(node);
						break;
					case "widget":
						this.getModelOrStore(node);
						var Widget = node.Widget;
						//delete node.Widget;
						var widget = node.dojoo = new Widget(node.data);
						// connector for conecta
						self.onAddWidget(widget);
						// it should have incoming
						if(innode && innode.dojoo) {
							if(widget.domNode) {
								innode.dojoo.addChild(widget,"last");
							} else {
								aspect.after(widget,"ready",function(){
									innode.dojoo.addChild(widget);
								});
							}
						}
						//self.getSubscriptions(node,outgoing);
						d.resolve(node);
					break;
					case "restservice":
						var Service = node.Service;
						//delete node.Service;
						// TODO set other refProperty if not ContentPane
						if(innode && innode.dojoo) {
							node.data.ref = innode.dojoo;
						} else {
							node.data.ref = this;
						}
						var service = node.dojoo = new Service(node.data);
						if(innode && innode.dojoo) innode.dojoo.restservice = service;
						d.resolve(node);
					break;
					case "subscription":
						// widget.subscribe should be dlagua/c/subscribe, via dlagua/c/Subscribable
						if(innode.dojoo && node.data.channel && innode.dojoo.subscribe) {
							if(!node.handles) node.handles = [];
							node.handles.push(innode.dojoo.subscribe(node.data.channel, node.data));
						} else {
							// try modules
							this.getModules(node).then(function(modules){
								if(modules) {
									modules.forEach(function(module){
										if(!node.handles) node.handles = [];
										node.handles.push(topic.subscribe(node.data.channel, module));
									});
								}
								d.resolve(node);
							});
						}
						d.resolve(node);
					break;
					case "aspect":
						if(innode.dojoo && node.data.method) {
							this.getModules(node).then(function(modules){
								if(modules) {
									modules.forEach(function(module){
										if(!node.handles) node.handles = [];
										var handle = aspect[node.data.aspectType](innode.dojoo,node.data.method,lang.hitch(innode.dojoo,module),!!node.data.receiveArguments);
										innode.dojoo.own(handle);
										node.handles.push(handle);
									});
								}
								d.resolve(node);
							});
						} else {
							d.resolve(node);
						}
					break;
					case "watch":
						if(innode.dojoo && node.data.property) {
							this.getModules(node).then(function(modules){
								if(modules) {
									modules.forEach(function(module){
										if(!node.handles) node.handles = [];
										var handle = innode.dojoo.watch(node.data.property,lang.hitch(innode.dojoo,module));
										innode.dojoo.own(handle);
										node.handles.push(handle);
									});
								}
								d.resolve(node);
							});
						} else {
							d.resolve(node);
						}
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
								d.resolve(node);
							break;
							case "text/xml":
							case "text/html":
								// zijn hier alternatieven mogelijk?
								if(innode.dojoo) {
									request(node.data.uri).then(function(result){
										innode.dojoo.params.content = result;
										innode.dojoo.set("content",result);
										d.resolve(node);
									});
								}
							break;
							case "application/json":
								if(innode.dojoo) {
									wrappedreq(["dojo/text!"+node.data.uri]).then(function(resultstr){
										var result = JSON.parse(resultstr);
										innode.dojoo.params[node.data.refProperty] = result;
										innode.dojoo.set(node.data.refProperty,result);
										d.resolve(node);
									});
								}
							break;
						}
					break;
					default:
						d.resolve(node);
					break;
				}
			} else {
				d.resolve(node);
			}
		}));
		return dd;
	},
	_destroyRecursive:function(node){
		node.created = false;
		switch(node.data.type){
			case "widget":
				node.dojoo = registry.byId(node.data.id);
				if(node.dojoo && !node.dojoo._beingDestroyed) {
					var p = node.dojoo.getParent && node.dojoo.getParent();
					p && p.removeChild && p.removeChild(node.dojoo);
					node.dojoo.destroyRecursive && node.dojoo.destroyRecursive();
					registry.remove(node.data.id);
				}
				break;
			case "auth":
				delete node.data.auth;
				break;
			case "subscription":
			case "aspect":
			case "watch":
				if(node.handles) {
					node.handles.forEach(function(h){
						h.remove();
					});
				}
				break;
			case "restservice":
				if(node.dojoo && node.dojoo.destroy) node.dojoo.destroy();
				break;
		}
		if(node.children) {
			node.children.forEach(lang.hitch(this,function(node){
				this._destroyRecursive(node);
			}));
		}
	},
	_destroyView:function(oldView,outgoing) {
		var self = this;
		// get the rendered node
		oldView.created = false;
		oldView.children.forEach(function(node){
			if(outgoing.indexOf(node)==-1 && node.created) {
				console.warn("destroying wrong node",node.data.type,node.data.id);
				self._destroyRecursive(node);
			}
		},this);
	},
	rebuildNode:function(node){
		this._destroyRecursive(node);
		this.rebuild();
	},
	rebuild:function(newView){
		if(!newView) newView = view;
		var oldView = view;
		view = newView;
		this.set("view",view.data.id);
		return this.nodeStore.getChildren(newView).then(lang.hitch(this,function(outgoing) {
			this._destroyView(oldView,outgoing);
			return this._addRecursive(newView,appNode);
		}));
	},
	load:function(root) {
		this.root = root;
		if(root.data.refProperty) this.refProperty = root.data.refProperty;
		this._loadRecursive(root).then(lang.hitch(this,function(node){
			this._addRecursive(root).then(lang.hitch(this,function(node){
				var loader = dom.byId("loader");
				if(loader) domStyle.set(loader,"display","none");
				this.startup();
				fx.fadeIn({
					node:this.domNode,
					duration:500,
					onEnd:lang.hitch(this,"resize")
				}).play();
				this.ready(node);
			}));
		}));
	},
	_init:function(){
		var self = this;
		var master = new JsonRest({target:"model/Node/"});
		aspect.around(master,"get",function(oriGet){
			return function(id,options){
				options = options || {};
				if(self.domain) {
					if(!options.headers) options.headers = {};
					options.headers["content-domain"] = self.domain;
				}
				return oriGet.call(this,id,options);
			}
		});
		aspect.around(master,"query",function(oriQuery){
			return function(query,options){
				options = options || {};
				if(self.domain) {
					if(!options.headers) options.headers = {};
					options.headers["content-domain"] = self.domain;
				}
				return oriQuery.call(this,query,options);
			}
		});
		var memory = new Memory();
		this.nodeStore = new Cache(master,memory);
		this.relStore = new JsonRest({target:"model/Relationship/"});
		aspect.around(this.relStore,"get",function(oriGet){
			return function(id,options){
				options = options || {};
				if(self.domain) {
					if(!options.headers) options.headers = {};
					options.headers["content-domain"] = self.domain;
				}
				return oriGet.call(this,id,options);
			}
		});
		aspect.around(this.relStore,"query",function(oriQuery){
			return function(query,options){
				options = options || {};
				if(self.domain) {
					if(!options.headers) options.headers = {};
					options.headers["content-domain"] = self.domain;
				}
				return oriQuery.call(this,query,options);
			}
		});
		this.nodeStore = lang.mixin(this.nodeStore,{
			getParents:function(item,filter){
				return when(this.get(item.id),function(item) {
					var incoming = filter ? rqlArray.query(filter,{},item.incoming_relationships || []) : item.incoming_relationships;
					return all(incoming.map(function(rel){
						return self.nodeStore.get(rel.start[self.refProperty]);
					}));
				});
			},
			getChildren:function(item,filter) {
				return when(this.get(item.id),function(item) {
					var rels = sortRels(item.outgoing_relationships);
					var outgoing = filter ? rqlArray.query(filter,{},rels) : rels;
					return all(outgoing.map(function(rel,index){
						if(rel.end[self.refProperty]=="../") console.warn(rel)
						 return when(self.nodeStore.get(rel.end[self.refProperty].replace("../Node/","")),function(node){
							 return node;
						 });
					}));
				});
			}
		});
		// get domain node by looking for app relations
		this.relStore.query({type:"has_app"}).then(function(res) {
			if(res && res.length) {
				// this should be requested with an ancestor query
				self.nodeStore.query("?limit(500)").then(function(){
					var node = self.nodeStore.get(res[0].from.replace("Node/",""));
					self.load(node);
				});
			}
		});
	},
	constructor: function(params,srcNodeRef){
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
