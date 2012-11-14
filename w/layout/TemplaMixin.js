dojo.provide("dlagua.w.layout.TemplaMixin");

dojo.require("dojo.Stateful");
dojo.require("dojo.html");

dojo.require("dlagua.c.templa.Mixin");
dojo.require("dlagua.x.Mustache");

dojo.declare("dlagua.w.layout.TemplaMixin", [], {
	resolveProperties:null,
	schema:null,
	data:null,
	mixeddata:null,
	applyTemplate: function(tpl,partials){
		this.set("content",dlagua.x.Mustache.to_html(tpl,this.mixeddata,partials));
	},
	_load:function(){
		var d = new dojo.Deferred();
		if(!this.data) {
			d.callback();
			return d;
		}
		var md = new dojo.Deferred();
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		var schema = (parent && parent.schema ? parent.schema : this.schema);
		if(!schema) {
			d.callback();
			return d;
		}
		var resolveProps = (parent && parent.resolveProperties ? parent.resolveProperties : this.resolveProperties ? this.resolveProperties : []);
		this._mixinRecursive(dojo.clone(this.data),schema,resolveProps,new dlagua.c.templa.Mixin(),md);
		md.then(dojo.hitch(this,function(data){
			this.mixeddata = data;
			d.callback(true);
		}));
		return d;
	},
	_mixinRecursive: function(item,schema,resolveProps,mu_mixin,d) {
		if(!d) d = new dojo.Deferred();
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		item.__onChildDone = function(){
			if(this.__childrenDone) this.__childrenDone--;
			if(!this.__childrenDone || this.__childrenDone == 0) {
				if(this.__parent) { 
					delete this.__onChildDone;
					delete this.__childrenDone;
					this.__parent.__onChildDone();
				}
				d.callback(this);
			}
		};
		this.resolveLinks(item,schema,resolveProps).then(dojo.hitch(this,function(resolved){
			resolved.__resolved = true;
			var children;
			for(var k in resolved) {
				var val = item[k];
				if(val && dojo.isArray(val)) {
					for(var i=0;i<val.length;i++){
						// check if val is object
						// note: these items MUST be resolved
						if(dojo.isObject(val[i])) {
							if(!children) children = {};
							if(!children[k]) children[k] = [];
							val[i].__parent = item;
							children[k].push(val[i]);
						}
					}
				} else if(k.substr(0,2)!="__" && val && dojo.isObject(val)) {
					if(val instanceof Date) {
						item[k] = dojo.date.stamp.toISOString(val);
					} else if(!val["$ref"]) {
						// simply mixin this object
						item[k].ref = parent;
						item[k].node = this;
						item[k] = dojo.mixin(val,mu_mixin);
					}
				}
			}
			item.ref = parent;
			item.node = this;
			item = dojo.mixin(item,mu_mixin);
			if(children) {
				// we need a new schema for the children to resolve their xuris..
				// it must be in schema.links, but we should be sure that we get the correct schema
				item.__childrenDone = 0;
				for(var c in children) {
					var cschemaUri;
					for(var i=0;i<schema.links.length;i++){
						var link = schema.links[i];
						if(link.rel==c) {
							cschemaUri = link.href.split("/")[1];
							break;
						}
					}
					if(cschemaUri) {
						item.__childrenDone += children[c].length;
						var self = this;
						var child = {items:children[c]};
						this.getSchema(cschemaUri).then(dojo.hitch(child,function(childSchema) {
							dojo.forEach(this.items,dojo.hitch(self,function(cidata,i){
								this._mixinRecursive(cidata,childSchema,[],mu_mixin).then(function(data){
									children[c][i] = data;
								});
							}));
						}));
					} else {
						delete children[c];
					}
				}
				// final check to see if there's any children left
				var cnt = 0;
				for(var c in children) {
					cnt++;
				}
				if(cnt===0) item.__onChildDone();
			} else {
				item.__onChildDone();
			}
		}));
		return d;
	},
	getSchema:function(schemaUri){
		var d = new dojo.Deferred();
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		if(parent.schemata && parent.schemata[schemaUri]) {
			var schema = parent.schemata[schemaUri];
			d.callback(schema);
		} else {
			dojo.xhrGet({
				url:"/persvr/Class/"+schemaUri,
				handleAs:"json",
				headers:{
					"Accept":"application/json"
				},
				load:function(res,io){
					parent.schemata[schemaUri] = res;
					d.callback(res);
				}
			});
		}
		return d;
	},
	resolveLinks: function(data,schema,resolveProps,skipX){
		var d = new dojo.Deferred();
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		if(data.__resolved) {
			d.callback(data);
			return d;
		}
		var self = this;
		var toResolve = [];
		var toResolveX = [];
		if(typeof resolveProps == "string") {
			resolveProps = resolveProps.split(",");
		}
		if(resolveProps.length) {
			dojo.forEach(schema.links, function(link){
				if(dojo.indexOf(resolveProps,link.rel)==-1) return;
				if(link.resolution=="lazy" && data[link.rel]) {
					toResolve.push(link.rel);
				}
			});
		}
		for(var k in schema.properties) {
			var p = schema.properties[k];
			if(p.format == "xuri") {
				toResolveX.push(k);
			}
		}
		var cnt = toResolve.length;
		var cntx = toResolveX.length;
		var total = cnt;
		if(!skipX) total += cntx;
		if(total>0) {
			dojo.forEach(toResolve, function(rel){
				var link = data[rel]["$ref"];
				// TODO make store xdomain capable
				parent.store.query(link).then(function(res){
					data[rel] = res;
					total--;
					if(total==0) {
						d.callback(data);
					}
				});
			});
			if(!skipX) {
				dojo.forEach(toResolveX, function(x){
					var link = data[x];
					dojo.xhrGet({
						url:"/xbrota/rest/"+parent.locale+"/"+link,
						failOk:true,
						load:function(res){
							data[x] = res;
							total--;
							if(total==0) {
								d.callback(data);
							}
						},
						error:function(){
							data[x] = "";
							total--;
							if(total==0) {
								d.callback(data);
							}
						}
					})
				});
			}
		} else {
			d.callback(data);
		}
		return d;
	},
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		this._setContent(data || "");
	},
	_setContent: function(/*String|DocumentFragment*/ cont, /*Boolean*/ isFakeContent){
		// summary:
		//		Insert the content into the container node

		// first get rid of child widgets
		this.destroyDescendants();

		// dojo.html.set will take care of the rest of the details
		// we provide an override for the error handling to ensure the widget gets the errors
		// configure the setter instance with only the relevant widget instance properties
		// NOTE: unless we hook into attr, or provide property setters for each property,
		// we need to re-configure the ContentSetter with each use
		var setter = this._contentSetter;
		if(! (setter && setter instanceof dojo.html._ContentSetter)){
			setter = this._contentSetter = new dojo.html._ContentSetter({
				node: this.containerNode,
				_onError: dojo.hitch(this, this._onError),
				onContentError: dojo.hitch(this, function(e){
					// fires if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV
					var errMess = this.onContentError(e);
					try{
						this.containerNode.innerHTML = errMess;
					}catch(e){
						console.error('Fatal '+this.id+' could not change content due to '+e.message, e);
					}
				})/*,
				_onError */
			});
		}

		var setterParams = dojo.mixin({
			cleanContent: this.cleanContent,
			extractContent: this.extractContent,
			parseContent: this.parseOnLoad,
			parserScope: this.parserScope,
			startup: false,
			dir: this.dir,
			lang: this.lang
		}, this._contentSetterParams || {});

		setter.set( (dojo.isObject(cont) && cont.domNode) ? cont.domNode : cont, setterParams );

		// setter params must be pulled afresh from the ContentPane each time
		delete this._contentSetterParams;
	},
	onLoad:function(){}
});