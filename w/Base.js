define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/query",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/registry",
	"dijit/_WidgetBase",
	"dijit/_Container",
	"dijit/_Contained",
	"dijit/Destroyable",
	"dlagua/c/Subscribable"
], function(declare, lang, array, query, domAttr, domClass, domConstruct, registry, _WidgetBase, _Container, _Contained, Destroyable, Subscribable) {
	var Base = declare("dlagua.w.Base",[_WidgetBase, _Container, _Contained, Destroyable, Subscribable],{
		extend:function(mixins, params) {
			var self = this;
			var mixin = function(source, exclude){
				var op = Object.prototype, opts = op.toString, cname = "constructor";
				var name, t;
				// add props adding metadata for incoming functions skipping a constructor
				for(name in source){
					t = source[name];
					if((name && t !== op[name] || !(name in op)) && name != cname && array.indexOf(exclude,name)==-1){
						if(opts.call(t) == "[object Function]"){
							// non-trivial function method => attach its name
							t.nom = name;
						}
						self[name] = t;
					}
				}
			}
			params = lang.mixin(this.params || {}, params);
			var exclude = ["id","domNode","containerNode"];
			
			if(this._started) this._started = false;
			mixins.unshift(Base);
			registry.remove(this.id);
			var Widget = declare(mixins);
			var widget = new Widget(params);
			
			query(">*",self.domNode).forEach(function(c){
				if(c.parentNode) c.parentNode.removeChild(c);
			});
			query(">*",widget.domNode).forEach(function(c){
				domConstruct.place(c,self.domNode);
			});
			domClass.replace(self.domNode,domAttr.get(widget.domNode,"class"),domAttr.get(self.domNode,"class"));
			array.forEach(widget.domNode.attributes,function(attr){
				if(array.indexOf(["id","class","widgetid"],attr.name) == -1 && domAttr.get(self.domNode,attr.name)!=attr.value) {
					domAttr.set(self.domNode,attr.name,attr.value);
				}
			});
			mixin(widget,exclude);
			
			//lang.mixin(this,widget);
			this.postCreate();
			this.startup();
		}
	});
	return Base;
});