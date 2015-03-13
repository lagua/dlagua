define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/when",
	"dojo/Deferred",
	"dforma/store/FormData",
	"dforma/util/model"
], function(declare,lang,when,Deferred,FormData,modelUtil) {
	
	lang.mixin(modelUtil,{
		resolve:function(data,schema,options){
			options = options || {};
			var resolveProps = options.resolveProperties ? [].concat(options.resolveProperties) : [];
			var skipX = options.skipX;
			var refattr = options.refProperty || "$ref";
			var exclude = options.exclude;
			var xroot = options.xroot;
			// XURI's don't come from links, so fake them
			// clone to prevent modifying schema
			// FIXME clone may be too inefficient
			var schema2 = lang.clone(schema);
			if(!skipX && xroot){
				if(!schema2.links) schema2.links = [];
				for(var k in schema.properties){
					var p = schema.properties[k];
					if(data[k] && p.type=="string" && (p.format=="xuri" || p.format=="newsletter")){
						schema2.properties[k].format = "xhtml";
						schema2.links.push({
							rel:k,
							resolution:"lazy",
							href:xroot+data[k]
						});
					}
				}
			}
			if(schema2.links instanceof Array) {
				schema2.links.forEach(function(link){
					if(!(data[link.rel] || resolveProps.indexOf(link.rel)>-1)) return;
					if(link.resolution=="lazy"){
						data[link.rel] = {};
						data[link.rel][refattr] = modelUtil.substitute(link.href,data,exclude);
					}
				});
			}
			if(options.fetch){
				return modelUtil.fetch(data,schema2,options);
			} else {
				return new Deferred().resolve(data);
			}
		}
	});
	
	return declare("dlagua.c.store.FormData",[FormData],{
		processModel: function(object,options,req) {
			options = options || {};
			if(options.noop) return req;
			return when(req,lang.hitch(this,function(object){
				return modelUtil.coerce(object,this.schema,{
					resolve:true,
					fetch:true,
					refProperty:this.refProperty,
					target:this.target,
					mixin:this.mixin,
					clearCache:options.clearCache,
					skipX:options.skipX,
					resolveProperties:this.resolveProperties,
					xroot:this.xroot
				});
			}));
		}
	});
});