define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/request",
	"dojo/Deferred",
	"dojo/promise/all"
], function(declare,lang,request,Deferred,all) {
	
	// from https://github.com/kriszyp/json-schema/blob/master/lib/links.js#L41
	function substitute(linkTemplate, instance, exclude){
		exclude = exclude || [];
		return linkTemplate.replace(/\{([^\}]*)\}/g, function(t, property){
			var value = exclude.indexOf(property)>-1 ? "*" : instance[decodeURIComponent(property)];
			if(value instanceof Array){
				// the value is an array, it should produce a URI like /Table/(4,5,8) and store.get() should handle that as an array of values
				return '(' + value.join(',') + ')';
			}
			return value;
		});
	};
	
	return declare("dlagua.c.store.Model",null,{
		coerce:false,
		resolve:false,
		schema:null,
		data:null,
		store:null,
		target:"",
		resolveProps:null,
		refAttribute:"$ref",
		constructor:function(params){
			lang.mixin(this,params);
			if(!this.resolveProps) this.resolveProps = [];
			if(this.coerce) this._coerce();
			if(this.resolve) {
				if(!this.coerce) this._prepareLinks();
				this._resolve();
			}
		},
		_coerce:function() {
			// summary:
			// Given an input value, this method is responsible
			// for converting it to the appropriate type for storing on the object.
			var schema = this.schema;
			if(!schema) return;
			if(!this.data) this.data = {};
			var data = this.data;
			for(var k in schema.properties) {
				var type = schema.properties[k].type;
				var value = data[k];
				if(type) {
					if (type === 'string') {
						data[k] = '' + value;
					} else if (type === 'number') {
						value = +value;
					} else if (type === 'boolean') {
						value = !!value;
					} else if (type === 'array') {
						if(!(value instanceof Array)) value = new Array();
					} else if (type === 'object') {
						if(!(value instanceof Object)) value = new Object();
					} else if (typeof type === 'function' && !(value instanceof type)) {
						value = new type(value);
					}
					data[k] = value;
				}
			}
			this._prepareLinks();
		},
		_prepareLinks:function(){
			var schema = this.schema;
			var refattr = this.refAttribute;
			var data = this.data;
			if(schema.links instanceof Array) {
				schema.links.forEach(function(link){
					if(!data[link.rel]) return;
					if(link.resolution=="lazy"){
						data[link.rel] = {};
						data[link.rel][refattr] = substitute(link.href,data,this.exclude);
					}
				},this);
			}
		},
		_resolve:function(){
			var schema = this.schema;
			if(!schema) return;
			var data = this.data;
			var target = this.target;
			// FIXME move to new instance from schema for local store
			var refattr = this.refAttribute;
			if(this.resolved) {
				return;
			}
			var resolveProps = this.resolveProps;
			var toResolve = {};
			if(typeof resolveProps == "string") {
				resolveProps = resolveProps.split(",");
			}
			for(var k in schema.properties) {
				var p = schema.properties[k];
				if((p.type=="string" && p.format=="xhtml") || p.type=="array"){
					resolveProps.push(k);
				}
			}
			resolveProps.forEach(function(key){
				var href = data[key][refattr];
				if(href) {
					var req = {
						handleAs:"json",
						headers:{
							accept:"application/json"
						}
					};
					var p = schema.properties[key];
					if(p.type=="string" && p.format=="xhtml") {
						// shouldn't we try to resolve XML?
						req = {
							handleAs:"text",
							failOk:true
						};
					}
					console.log("Link "+key+" will be resolved.");
					// absolute URI
					href = href.charAt(0) == "/" ? href : target + href;
					toResolve[key] = request(href,req);
				} else {
					console.warn("Link "+key+" won't be resolved.");
				}
			});
			all(toResolve).then(lang.hitch(this,function(resolved){
				lang.mixin(data,resolved);
				this.ready();
			}));
		},
		ready:function(){
			// override
		}
	});
});
