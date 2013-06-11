define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-geometry",
	"dojo/request",
	"dojo/Deferred",
	"dojo/html",
	"dojo/date/stamp",
	"dijit/_Widget",
	"dijit/_Templated",
	"dijit/_Contained",
	"mustache/mustache",
	"dlagua/c/templa/Mixin"
],function(declare,lang,array,domGeometry,request,Deferred,html,stamp,_Widget,_Templated,_Contained,Mustache,Mixin) {

return declare("dlagua.w.layout.TemplaMixin", [], {
	resolveProperties:null,
	schema:null,
	data:null,
	mixeddata:null,
	applyTemplate: function(tpl,partials){
		this.set("content",Mustache.to_html(tpl,this.mixeddata,partials));
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
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		var schema = (parent && parent.schema ? parent.schema : this.schema);
		if(!schema) {
			d.resolve();
			return d;
		}
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
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		item.__onChildDone = function(){
			if(this.__childrenDone) this.__childrenDone--;
			if(!this.__childrenDone || this.__childrenDone == 0) {
				if(this.__parent) { 
					delete this.__onChildDone;
					delete this.__childrenDone;
					this.__parent.__onChildDone();
				}
				d.resolve(this);
			}
		};
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
					} else if(!val["$ref"]) {
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
				var schemalinks = schema.links || [];
				item.__childrenDone = 0;
				for(var c in children) {
					var cschemaUri;
					for(var i=0;i<schemalinks.length;i++){
						var link = schemalinks[i];
						if(link.rel==c) {
							cschemaUri = link.href.split("/")[1];
							break;
						}
					}
					if(cschemaUri) {
						item.__childrenDone += children[c].length;
						var self = this;
						var child = {items:children[c]};
						this.getSchema(cschemaUri).then(lang.hitch(child,function(childSchema) {
							array.forEach(this.items,lang.hitch(self,function(cidata,i){
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
		var d = new Deferred();
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		if(parent.schemata && parent.schemata[schemaUri]) {
			var schema = parent.schemata[schemaUri];
			d.resolve(schema);
		} else {
			request("/persvr/Class/"+schemaUri,{
				handleAs:"json",
				headers:{
					"Accept":"application/json"
				}
			}).then(function(res){
				parent.schemata[schemaUri] = res;
				d.resolve(res);
			});
		}
		return d;
	},
	resolveLinks: function(data,schema,resolveProps,skipX){
		var d = new Deferred();
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		if(data.__resolved) {
			d.resolve(data);
			return d;
		}
		var self = this;
		var toResolve = [];
		var toResolveX = [];
		if(typeof resolveProps == "string") {
			resolveProps = resolveProps.split(",");
		}
		if(resolveProps.length) {
			array.forEach(schema.links, function(link){
				if(array.indexOf(resolveProps,link.rel)==-1) return;
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
			array.forEach(toResolve, function(rel){
				var link = data[rel]["$ref"];
				// TODO make store xdomain capable
				parent.store.query(link).then(function(res){
					data[rel] = res;
					total--;
					if(total==0) {
						d.resolve(data);
					}
				});
			});
			if(!skipX) {
				array.forEach(toResolveX, function(x){
					var link = data[x];
					request("/xbrota/rest/"+parent.locale+"/"+link,{
						failOk:true
					}).then(function(res){
						data[x] = res;
						total--;
						if(total==0) {
							d.resolve(data);
						}
					},
					function(){
						data[x] = "";
						total--;
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
			this.marginBox = domGeometry.getMarginBox(this.containerNode);
		}),1);
	},
	updateLayout:function() {
		if(!this || !this.containerNode) return;
		this.marginBox = domGeometry.getMarginBox(this.containerNode);
		this.inherited(arguments);
	},
	_setContent: function(/*String|DocumentFragment*/ cont, /*Boolean*/ isFakeContent){
		// summary:
		//		Insert the content into the container node

		// first get rid of child widgets
		this.destroyDescendants();

		// html.set will take care of the rest of the details
		// we provide an override for the error handling to ensure the widget gets the errors
		// configure the setter instance with only the relevant widget instance properties
		// NOTE: unless we hook into attr, or provide property setters for each property,
		// we need to re-configure the ContentSetter with each use
		var setter = this._contentSetter;
		if(! (setter && setter instanceof html._ContentSetter)){
			setter = this._contentSetter = new html._ContentSetter({
				node: this.containerNode,
				_onError: lang.hitch(this, this._onError),
				onContentError: lang.hitch(this, function(e){
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

		var setterParams = lang.mixin({
			cleanContent: this.cleanContent,
			extractContent: this.extractContent,
			parseContent: this.parseOnLoad,
			parserScope: this.parserScope,
			startup: false,
			dir: this.dir,
			lang: this.lang
		}, this._contentSetterParams || {});

		setter.set( (lang.isObject(cont) && cont.domNode) ? cont.domNode : cont, setterParams );

		// setter params must be pulled afresh from the ContentPane each time
		delete this._contentSetterParams;
	},
	onLoad:function(){}
});

});