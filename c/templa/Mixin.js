dojo.provide("dlagua.c.templa.Mixin");
dojo.require("dojo.Stateful");

dojo.declare("dlagua.c.templa.Mixin",[dojo.Stateful],{
	set:function(key,value) {
		if(this.parent && key=="value" && this[key]!=value) this.parent.set("__dirty",true);
		this.inherited(arguments);
	},
	_mod:function(){
		return function(text, render) {
			var ar = text.split("|");
			var fstr = ar.shift();
			// TODO: there will be different options:
			// - value is first argument / apply to value
			// - argument may be object, so {} will have to be added when the template's templa-props are parsed
			// last may have to depend on the input from the Templa editor plugin
			// make argument list
			var pstr = ar.shift();
			var props = dojo.fromJson("{"+render(pstr)+"}");
			props._ref = this;
			var val = ar.join("|");
			var fn;
			if(fstr.indexOf("::")) {
				ar = fstr.split("::");
				fn = dojo.getObject(ar[0])[ar[1]];
			} else {
				fn = dojo.getObject(fstr);
			}
			if(!dojo.isArray(props)) props = [props];
			// let value be first arg
			props.unshift(render(val));
			return fn.apply(this,props);
		};
	},
	_switch:function(){
		return function(text, render) {
			text = render(text);
			var ar = text.split("|");
			var val = ar[0];
			var props = (ar.length>1 ? dojo.fromJson(ar[1]) : {});
			for(var k in props) {
				if(k==val) return props[k];
			}
			return props["default"];
		};
	}
});