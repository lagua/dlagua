define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-geometry",
	"dojo/request",
	"dojo/Deferred",
	"dojo/promise/all",
	"dojo/date/stamp",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Contained",
	"mustache/mustache",
	"dlagua/c/templa/Mixin",
	"dojo/dom-attr",
	"dojo/query"
],function(declare,lang,array,domGeometry,request,Deferred,all,stamp,_Widget,_Templated,_Contained,mustache,Mixin,domAttr,query) {

	return declare("dlagua.w.layout.TemplaMixin", [], {
		resolveProperties:null,
		schema:null,
		data:null,
		mixeddata:null,
		applyTemplate: function(tpl,partials){
			this.set("content",mustache.to_html(tpl,this.mixeddata,partials));
			// IE style workaround
			query("*[data-style]",this.domNode).forEach(function(_){
				domAttr.set(_,"style",domAttr.get(_,"data-style"));
			});
		},
		_load:function(resolved, d){
			d = d || new Deferred();
			if(resolved) {
				this.data = resolved;
			}
			if(this.data._loadObject) {
				this.data._loadObject(lang.hitch(this,this._load), d);
				return d;
			}
			if(!this.data) {
				d.resolve();
				return d;
			}
			var md = new Deferred();
			var parent = this.getParent();
			var schema = (parent && parent.schema ? parent.schema : this.schema);
			var resolveProps = (parent && parent.resolveProperties ? parent.resolveProperties : this.resolveProperties ? this.resolveProperties : []);
			this._mixinRecursive(lang.clone(this.data),schema,resolveProps,new Mixin(),md);
			md.then(lang.hitch(this,function(data){
				this.mixeddata = data;
				d.resolve(true);
			}));
			return d;
		},
		_mixinRecursive: function(item,schema,resolveProps,mu_mixin,d,skipX) {
			if(!d) d = new Deferred();
			var parent = this.getParent();
			var refattr = parent.refAttribute || "$ref";
			this.resolveLinks(item,schema,resolveProps,skipX).then(lang.hitch(this,function(resolved){
				resolved.__resolved = true;
				var children;
				for(var k in resolved) {
					var val = item[k];
					if(val && lang.isArray(val)) {
						for(var i=0;i<val.length;i++){
							// check if val is object
							// note: these items MUST be resolved
							if(lang.isObject(val[i])) {
								if(!children) children = {};
								if(!children[k]) children[k] = [];
								val[i].__parent = item;
								children[k].push(val[i]);
							}
						}
					} else if(k.substr(0,2)!="__" && val && lang.isObject(val)) {
						if(val instanceof Date) {
							item[k] = stamp.toISOString(val);
						} else if(!val[refattr]) {
							// simply mixin this object
							item[k].ref = parent;
							item[k].node = this;
							item[k] = lang.mixin(val,mu_mixin);
						}
					}
				}
				item.ref = parent;
				item.node = this;
				item = lang.mixin(item,mu_mixin);
				if(children) {
					// we need a new schema for the children to resolve their xuris..
					// it must be in schema.links, but we should be sure that we get the correct schema
					var schemalinks = schema && schema.links || [];
					var proms = {};
					var self = this;
					for(var c in children) {
						proms[c] = new Deferred();
						var cschemaUri = "";
						for(var i=0;i<schemalinks.length;i++){
							var link = schemalinks[i];
							if(link.rel==c) {
								var href = link.href.split("?")[0];
								var par = href.split("/");
								while(par.length && (!cschemaUri || cschemaUri.match(/{|}|\.}/g))) cschemaUri = par.pop();
								break;
							}
						}
						var child = {name:c,items:children[c]};
						var cd = new Deferred();
						if(cschemaUri) {
							cd = this.getSchema(cschemaUri);
						} else {
							cd.resolve();
						}
						cd.then(lang.hitch(child,function(childSchema) {
							// this == child
							all(array.map(this.items,function(cidata,i){
								return self._mixinRecursive(cidata,childSchema,[],mu_mixin);
							})).then(lang.hitch(this,function(data){
								proms[this.name].resolve(data);
							}));
						}));
					}
					all(proms).then(function(ret){
						d.resolve(item);
					});
				} else {
					d.resolve(item);
				}
			}));
			return d;
		},
		getSchema:function(model){
			var parent = this.getParent();
			var schemaUri = parent.base+"model/Class/"+model;
			var d = new Deferred();
			if(parent.schemata && parent.schemata[schemaUri]) {
				var schema = parent.schemata[schemaUri];
				if(schema.__request) {
					schema.__request.then(function(res){
						parent.schemata[schemaUri] = res;
						d.resolve(res);
					});
				} else {
					d.resolve(schema);
				}
			} else {
				var req = request(schemaUri,{
					handleAs:"json",
					headers:{
						"Accept":"application/json"
					}
				}).then(function(res){
					parent.schemata[schemaUri] = res;
					d.resolve(res);
				});
				parent.schemata[schemaUri] = {__request:req};
			}
			return d;
		},
		resolveLinks: function(data,schema,resolveProps,skipX){
			var d = new Deferred();
			var parent = this.getParent();
			var refattr = parent.refAttribute || "$ref";
			if(!schema || data.__resolved) {
				d.resolve(data);
				return d;
			}
			var self = this;
			var toResolve = [];
			var toResolveX = [];
			if(typeof resolveProps == "string") {
				resolveProps = resolveProps.split(",");
			}
			for(var k in schema.properties) {
				var p = schema.properties[k];
				if(p.type=="string" && p.format == "xuri") {
					toResolveX.push(k);
				} else if((p.type=="string" && p.format=="xhtml") || p.type=="array"){
					resolveProps.push(k);
				}
			}
			var schemalinks = {}
			if(resolveProps.length) {
				array.forEach(schema.links, function(link){
					var rel = link.rel;
					if(array.indexOf(resolveProps,rel)==-1) return;
					if(link.resolution=="lazy" && data[rel]) {
						if(!link.href.match(/{|}/g)) schemalinks[rel] = link.href;
						toResolve.push(rel);
					}
				});
			}
			var cnt = toResolve.length;
			var cntx = toResolveX.length;
			var total = cnt;
			if(!skipX) total += cntx;
			if(total>0) {
				console.log("total",total)
				array.forEach(toResolve, function(rel){
					var link = data[rel][refattr] || schemalinks[rel];
					var isXML = false;
					if(link) {
						if(schema.properties[rel]) {
							var p = schema.properties[rel];
							isXML = p.type=="string" && p.format=="xhtml";
						}
						if(isXML) {
							var t = parent.store.target;
							request(t+link,{
								failOk:true
							}).then(function(res){
								data[rel] = res;
								total--;
								console.log("total1s",total)
								if(total==0) {
									d.resolve(data);
								}
							},function(err){
								total--;
								console.log("total1f",total)
								if(total==0) {
									d.resolve(data);
								}
							});
						} else {
							parent.store.get(link).then(function(res){
								data[rel] = res;
								total--;
								console.log("total2s",total)
								if(total==0) {
									d.resolve(data);
								}
							},function(err){
								total--;
								console.log("total2f",total)
								if(total==0) {
									d.resolve(data);
								}
							});
						}
					} else {
						console.error("Link "+link+" for "+parent.id+" could not be resolved.");
						total--;
						console.log("total3f",total)
						if(total==0) {
							d.resolve(data);
						}
					}
				});
				if(!skipX) {
					var service = parent.xuriService ? parent.xuriService : parent.base+"rest/"+parent.locale;
					array.forEach(toResolveX, function(x){
						var link = data[x];
						request(service+"/"+link,{
							failOk:true
						}).then(function(res){
							data[x] = res;
							total--;
							console.log("total4s",total)
							if(total==0) {
								d.resolve(data);
							}
						},
						function(){
							data[x] = "";
							total--;
							console.log("total4f",total)
							if(total==0) {
								d.resolve(data);
							}
						});
					});
				}
			} else {
				d.resolve(data);
			}
			return d;
		},
		startup:function(){
			if(this._started) return;
			this._started = true;
			if(!this.data) {
				this.onLoad();
				return;
			}
			this._load().then(lang.hitch(this,this.onLoad));
		},
		_setContentAttr: function(/*String|DomNode|Nodelist*/data){
			this._setContent(data || "");
			setTimeout(lang.hitch(this,function(){
				if(!this.containerNode) return;
				this.marginBox = this.data.hidden ? {l:0,t:0,w:0,h:0} : domGeometry.getMarginBox(this.containerNode);
			}),1);
		},
		resize:function() {
			this.inherited(arguments);
			if(!this.containerNode) return;
			this.marginBox = this.data.hidden ? {l:0,t:0,w:0,h:0} : domGeometry.getMarginBox(this.containerNode);
		},
		onLoad:function(){}
	});

});