define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dijit/registry",
	"dijit/_WidgetBase",
	"dijit/_Container",
	"dijit/_Contained",
	"dijit/Destroyable",
	"dlagua/c/Subscribable"
], function(declare, lang, array, registry, _WidgetBase, _Container, _Contained, Destroyable, Subscribable) {
	return declare("dlagua.w.Base",[_WidgetBase, _Container, _Contained, Destroyable, Subscribable],{
		extend:function(source, exclude){
			var op = Object.prototype, opts = op.toString, cname = "constructor";
			var name, t;
			// add props adding metadata for incoming functions skipping a constructor
			for(name in source){
				t = source[name];
				if((t !== op[name] || !(name in op)) && name != cname && array.indexOf(exclude,name)==-1){
					if(opts.call(t) == "[object Function]"){
						// non-trivial function method => attach its name
						t.nom = name;
					}
					this[name] = t;
				}
			}
		},
		base:function(){
			if(!this.__oriproto) return;
			var params = this.params || {};
			var domNode = this.domNode;
			registry.remove(this.id);
			lang.mixin(this,this.__oriproto);
			this.create(params,domNode);
		}
	});
});
