dojo.provide("dlagua.w.layout.TemplaMixin");

dojo.require("dojo.Stateful");
dojo.require("dlagua.c.templa.Mixin");
dojo.require("dojo.html");

dojo.declare("dlagua.w.layout.TemplaMixin", [], {
	resolveProperties:null,
	schema:null,
	data:null,
	mixeddata:null,
	applyTemplate: function(tpl){
		// we're sure we are started
		this._started = true;
		var d = new dojo.Deferred();
		this._contentDeferred = new dojo.Deferred();
		this._contentDeferred.then(dojo.hitch(this,function(sxs){
			delete this._contentDeferred;
			d.callback(sxs);
		}));
		this.set("content",this.mixeddata.render(tpl));
		return d;
	},
	_load:function(){
		var d = new dojo.Deferred();
		if(!this.data) {
			d.callback();
			return d;
		}
		this.resolveLinks().then(dojo.hitch(this,function(){
			this._resolved = true;
			this.mixeddata = this._mixinRecursive(dojo.clone(this.data),new dlagua.c.templa.Mixin());
			d.callback(true);
		}));
		return d;
	},
	_mixinRecursive: function(item,mu_mixin) {
		for(var k in item) {
			var val = item[k];
			if(val && dojo.isArray(val)) {
				for(var i=0;i<val.length;i++){
					// break out of loop if any val is not object
					if(!dojo.isObject(val[i])) break;
					val[i] = this._mixinRecursive(val[i],mu_mixin);
					val[i].parent = item;
				}
			} else if(k.substr(0,2)!="__" && val && dojo.isObject(val)) {
				if(val instanceof Date) {
					item[k] = dojo.date.stamp.toISOString(val);
				} else {
					item[k] = this._mixinRecursive(dojo.clone(val),mu_mixin);
					item[k].parent = item;
				}
			}
		}
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		item.ref = parent;
		item.node = this;
		return dojo.mixin(item,mu_mixin);
	},
	resolveLinks: function(){
		var d = new dojo.Deferred();
		if(this._resolved) {
			d.callback();
			return d;
		}
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		if(!((parent && parent.schema) || this.schema)) {
			d.callback();
			return d;
		}
		var self = this;
		var schema = (parent && parent.schema ? parent.schema : this.schema);
		var toResolve = [];
		var toResolveX = [];
		var resolveProps = (parent && parent.resolveProperties ? parent.resolveProperties : this.resolveProperties ? this.resolveProperties : []);
		if(typeof resolveProps == "string") {
			resolveProps = resolveProps.split(",");
		}
		var rplen = resolveProps.length;
		dojo.forEach(schema.links, function(link){
			if(rplen && dojo.indexOf(resolveProps,link.rel)===-1) return;
			if(link.resolution=="lazy" && self.data[link.rel]) {
				toResolve.push(link.rel);
			}
		});
		for(var k in schema.properties) {
			var p = schema.properties[k];
			if(p.format == "xuri") {
				toResolveX.push(k);
			}
		}
		var cnt = toResolve.length;
		var cntx = toResolveX.length;
		var total = cnt+cntx;
		if(total>0) {
			dojo.forEach(toResolve, function(rel){
				var link = self.data[rel]["$ref"];
				// TODO make store xdomain capable
				parent.store.query(link).then(function(res){
					self.data[rel] = res;
					total--;
					if(total==0) {
						d.callback();
					}
				});
			});
			dojo.forEach(toResolveX, function(x){
				var link = self.data[x];
				dojo.xhrGet({
					url:"/xbrota/rest/"+parent.locale+"/"+link,
					load:function(res){
						self.data[x] = res;
						total--;
						if(total==0) {
							d.callback();
						}
					}
				})
			});
		} else {
			d.callback();
		}
		return d;
	},
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		this._setContent(data || "");
		setTimeout(dojo.hitch(this,function(){
			if(!this.containerNode) {
				if(this._contentDeferred) this._contentDeferred.callback(false);
				return;
			}
			if(this._contentDeferred) {
				var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
				// otherwise, let the parent widget resolve _contentDeferred
				if(!(parent && parent.hasDeferredContent)) this._contentDeferred.callback(true);
			}
		}),1);
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
					if(this._contentDeferred) this._contentDeferred.callback(false);
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