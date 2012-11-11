dojo.provide("dlagua.c.templa.Mixin");
dojo.require("dojo.Stateful");
dojo.require("dlagua.x.Mustache");
dojo.require("dojox.uuid.generateRandomUuid");

dojo.declare("dlagua.c.templa.Mixin",[dojo.Stateful],{
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
		// look for nesting
		var partials = {};
		var partialcount = 0;
		var getNode = function(node){
			var type = dojo.attr(node,"data-templa-type");
			types.push(type);
			var props = dojo.attr(node,"data-templa-props");
			var pre = document.createTextNode("{{#_mod}}"+type+"|"+(props || "")+"|");
			var post = document.createTextNode("{{/_mod}}");
			dojo.place(pre,node,"first");
			dojo.place(post,node);
			return node;
		}
		dojo.query("span[data-templa-type] span[data-templa-type]",div).forEach(function(node){
			node = getNode(node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
			var partname = "_mod"+partialcount;
			partials[partname] = p.innerHTML;
			p.innerHTML = "{{>"+partname+"}}";
			partialcount++;
		});
		dojo.query("span[data-templa-type]",div).forEach(function(node){
			node = getNode(node);
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
		tpl = tpl.replace(/{{&gt;/g,"{{>");
		return dlagua.x.Mustache.to_html(tpl,this,partials);
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