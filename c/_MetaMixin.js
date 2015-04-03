define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dijit/registry"
],function(declare,lang,registry){
	
function inferType(val){
	var nint = parseInt(val,10);
	if(nint == val) return nint;
	if(val == "true" || val == "false") return val==="true";
	return val;
}

return declare(null,{
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
				newv = lang.replace(v,meta).replace(/undefined|null/,"");
				if(v!=newv) {
					if(v.indexOf("{i18n.")>-1) {
						// keep track of what is replaced
						if(!this.replaced["i18n"]) this.replaced["i18n"] = {};
						if(!this.replaced["i18n"][node.id]) this.replaced["i18n"][node.id] = {};
						this.replaced["i18n"][node.id][i] = v;
					}
					if(v.indexOf("{inferred.")>-1) {
						// keep track of what is replaced
						if(!this.replaced["inferred"]) this.replaced["inferred"] = {};
						if(!this.replaced["inferred"][node.id]) this.replaced["inferred"][node.id] = {};
						this.replaced["inferred"][node.id][i] = v;
					}
					node.data[i] = inferType(newv);
				}
			}
		}
		return node;
	},
	_replaceMetaType:function(type){
		var k,v;
		var reset = [];
		for(var id in this.replaced[type]) {
			var node = this.nodeStore ? this.nodeStore.get(id) : this.nodes[id];
			var meta = node ? this.getMeta(node) : {};
			var dojoo = node && node.created && node.dojoo ? registry.byId(node.data.id) : null;
			if(dojoo && !dojoo._beingDestroyed) {
				for(k in this.replaced[type][id]) {
					v = this.replaced[type][id][k];
					if(typeof v == "string") {
						var newv = lang.replace(v,meta).replace(/undefined|false|null/,"");
						reset.push({dojoo:dojoo,key:k,value:newv});
					}
				}
			} else {
				for(k in this.replaced[type][id]) {
					v = this.replaced[type][id][k];
					if(typeof v == "string") node.data[k] = v;
				}
			}
		}
		return reset;
	},
	replaceInferred:function(){
		return this._replaceMetaType("inferred");
	},
	replaceI18n:function(){
		return this._replaceMetaType("i18n");
	}
});

});