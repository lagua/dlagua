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
],function(declare,lang,array,domGeom,request,Deferred,html,stamp,_Widget,_Templated,_Contained) {

return declare("dlagua.w.layout.TemplaMixin", [], {
	resolveProperties:null,
	schema:null,
	data:null,
	mixeddata:null,
	applyTemplate: function(tpl){
		this.set("content",this.mixeddata.render(tpl));
	},
	_load:function(){
		var d = new Deferred();
		if(!this.data) {
			d.resolve();
			return d;
		}
		this.resolveLinks().then(lang.hitch(this,function(){
			this.__resolved = true;
			this.mixeddata = this._mixinRecursive(lang.clone(this.data),new dlagua.c.templa.Mixin());
			d.resolve(true);
		}));
		return d;
	},
	_mixinRecursive: function(item,mu_mixin) {
		for(var k in item) {
			var val = item[k];
			if(val && lang.isArray(val)) {
				for(var i=0;i<val.length;i++){
					// break out of loop if any val is not object
					if(!lang.isObject(val[i])) break;
					val[i] = this._mixinRecursive(val[i],mu_mixin);
					val[i].parent = item;
				}
			} else if(k.substr(0,2)!="__" && val && lang.isObject(val)) {
				if(val instanceof Date) {
					item[k] = stamp.toISOString(val);
				} else {
					item[k] = this._mixinRecursive(lang.clone(val),mu_mixin);
					item[k].parent = item;
				}
			}
		}
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		item.ref = parent;
		item.node = this;
		return lang.mixin(item,mu_mixin);
	},
	resolveLinks: function(data,skipX){
		var d = new Deferred();
		if(data.__resolved) {
			d.resolve(data);
			return d;
		}
		var parent = (this.parent || (this.getParent && typeof this.getParent == "function" ? this.getParent() : null));
		if(!((parent && parent.schema) || this.schema)) {
			d.resolve(data);
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
		array.forEach(schema.links, function(link){
			if(rplen && array.indexOf(resolveProps,link.rel)===-1) return;
			if(link.resolution=="lazy" && data[link.rel]) {
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
					}).then(function(res){
						data[x] = res;
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
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		this._setContent(data || "");
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