define(["dojo","dojo/Stateful","mustache/mustache"],function(dojo,Stateful,mustache) {

return dojo.declare("dlagua.c.templa.Mixin",[Stateful],{
	set:function(key,value) {
		if(this.parent && key=="value" && this[key]!=value) this.parent.set("__dirty",true);
		this.inherited(arguments);
	},
	render:function(tpl) {
		tpl = tpl.replace(/[\n\t\u200B\u200C\u200D\uFEFF]+/g,"").replace(/\>\s+\</g,"><");
		var div = dojo.create("div",{
			innerHTML:tpl
		});
		dojo.query("span.templaField",div).forEach(function(node){
			var p = node.parentNode;
			var inner = node.firstChild;
			p.insertBefore(inner, node);
			p.removeChild(node);
		});
		var types = [];
		dojo.query("span[data-templa-type]",div).forEach(function(node){
			var type = dojo.attr(node,"data-templa-type");
			types.push(type);
			var props = dojo.attr(node,"data-templa-props");
			var pre = document.createTextNode("{{#_mod}}"+type+"|"+props+"|");
			var post = document.createTextNode("{{/_mod}}");
			dojo.place(pre,node,"first");
			dojo.place(post,node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
		});
		var dj = dojo;
		dojo.forEach(types,function(type){
			if(type.indexOf("::")) {
				var ar = type.split("::");
				type = ar[0];
			}
			dj.require(type);
		});
		tpl = div.innerHTML.toString();
		return mustache.render(tpl,this);
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
	}
});

});