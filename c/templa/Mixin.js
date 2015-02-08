define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Stateful",
	"dojo/_base/json"
],function(declare,lang,win,Stateful,djson) {

var inferType = function(val){
	var nint = parseInt(val,10);
	if(nint == val) return nint;
	if(val == "true" || val == "false") return val==="true";
	return val;
};

return declare("dlagua.c.templa.Mixin",[Stateful],{
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
			var props = djson.fromJson("{"+render(pstr)+"}");
			props._ref = this;
			var val = ar.join("|");
			var fn;
			if(fstr.indexOf("::")) {
				ar = fstr.split("::");
				fn = lang.getObject(ar[0])[ar[1]];
			} else {
				fn = lang.getObject(fstr);
			}
			if(!lang.isArray(props)) props = [props];
			// let value be first arg
			props.unshift(inferType(render(val)));
			return fn.apply(this,props);
		};
	},
	_replace:function(){
		return function(text, render) {
			var ar = text.split("|");
			var patt = ar.shift();
			var repl = ar.shift();
			return render(ar.join("|")).replace(patt,repl);
		}
	},
	_switch:function(){
		return function(text, render) {
			text = render(text);
			var ar = text.split("|");
			var val = ar[0];
			var pstr = ar.length>1 ? ar[1] : "{}";
			if(pstr.charAt(0)!="{") pstr = "{"+pstr+"}";
			var props = djson.fromJson(pstr);
			for(var k in props) {
				if(k==val) return props[k];
			}
			return props["default"];
		};
	}
});

});