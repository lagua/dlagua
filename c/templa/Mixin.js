define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/window",
	"dojo/_base/fx",
	"dojo/Stateful",
	"dojo/on",
	"dojo/sniff",
	"dojo/topic",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-attr",
	"dojo/query",
	"dojo/_base/json",
	"dijit/form/ToggleButton",
	"dojox/uuid/generateRandomUuid",
	"mustache/mustache"
],function(declare,lang,array,win,fx,Stateful,on,sniff,topic,dom,domConstruct,domStyle,domAttr,query,djson,ToggleButton,generateRandomUuid,mustache) {

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
			pstr = "{"+render(pstr)+"}";
			var props = djson.fromJson(pstr);
			props._ref = this;
			var val = ar.join("|");
			var fn;
			if(fstr.indexOf("::")) {
				ar = fstr.split("::");
				var o = lang.getObject(ar[0]);
				fn = o[ar[1]];
			} else {
				fn = lang.getObject(fstr);
			}
			if(!lang.isArray(props)) props = [props];
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
			var props = (ar.length>1 ? djson.fromJson(ar[1]) : {});
			for(var k in props) {
				if(k==val) return props[k];
			}
			return props["default"];
		};
	}
});

});