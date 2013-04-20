define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/query",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/dom-class"
],function(declare,lang,array,query,domConstruct,domAttr,domClass) {
	return declare("dlagua.w.Transformable",[],{
		transformed:false,
		// TODO: will be Transformable.upgrade (vs Transformable.downgrade)
		transform:function(type,construct){
			if(this.transformed) return;
			require([type],lang.hitch(this,function(Widget){
				// TODO: init+update upgrade stack
				var props = construct(this.item);
				props = lang.mixin(this.params,props);
				this._started = false;
				var p = this.getParent();
				//this.domNode = domConstruct.create("div");
				var instance = new Widget(props);
				var dom = this.domNode;
				var newdom = instance.domNode;
				// TODO: apply rule-based transforms
				// for now, just update the DOM from template:
				// - update children: not needed! template is the same! popup is just added!
				// - update classes
				// - update attributes
				query(">*",dom).forEach(function(c){
					console.log(c)
					c.parentNode.removeChild(c);
				});
				query(">*",newdom).forEach(function(c){
					console.log(c)
					domConstruct.place(c,dom);
				});
				domClass.replace(dom,domAttr.get(newdom,"class"),domAttr.get(dom,"class"));
				array.forEach(newdom.attributes,function(attr){
					if(domAttr.has(dom,attr.name) && array.indexOf(["id","class","widgetid"],attr.name) == -1 && domAttr.get(dom,attr.name)!=attr.value) {
						console.log(attr)
						domAttr.set(dom,attr.name,attr.value);
					}
				});
				this._started = false;
				delete instance.id;
				instance.domNode = dom;
				lang.mixin(this,instance);
				this.startup();
				this.transformed = true;
			}));
		}
	});

});