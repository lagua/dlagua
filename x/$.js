define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dojo/ready",
	"dojo/query",
	"dojo/dom-geometry",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/NodeList-data",
	"dojo/NodeList-manipulate",
	"dojo/NodeList-traverse"
], function(lang,array,on,ready,query,domGeometry,domConstruct,domStyle,domAttr,domClass) {

	var magicGuard = function(a){
		return a.length == 1 && (typeof a[0] == "string");
	};
	function getSet(module){
		return function(node, name, value){
			if(arguments.length == 2){
				return module[typeof name == "string" ? "get" : "set"](node, name);
			}
			// setter
			return module.set(node, name, value);
		};
	}
	var attr = query.NodeList._adaptWithCondition(getSet(domAttr), magicGuard);
	lang.extend(query.NodeList,{
		ready:ready,
		find: function(){
			return this.query.apply(this,arguments);
		},
		each: function(){
			var args = Array.prototype.slice.call(arguments);
			var f = args.shift();
			this.forEach(function(_){
				f.apply(_,args);
			});
			return this;
		},
		is:function(selector){
			return !!this.filter(function(_){
				return !!$(selector,_).length;
			}).length;
		},
		attr:function(key,val){
			var x = attr.apply(this,arguments);
			if(val===undefined) return x.join("");
			return x;
		},
		css: function(prop){
			var x = this.map(function(_){
				return domStyle.get(_,prop);
			});
			if(typeof prop=="string") return x.join("");
			return x;
		},
		currentStyle:function(prop){
			return this.map(function(_){
				return domStyle.get(_,prop);
			}).join();
		},
		click:function(f){
			if(f===undefined) return this.trigger.apply(this,[]);
			return this.bind.apply(this,["click",f]);
		},
		bind:function(){
			var eventType = arguments[0],
			l = arguments.length;
			var eventData = l>2 ? arguments[1] : null,
				handler = arguments[l-1];
			this.forEach(function(_){
				var h = on(_,eventType,handler);
				if(_==document || _==window) {
					_["evt-"+eventType] = h;
				} else {
					$(_).data("evt-"+eventType,h);
				}
			});
			return this;
		},
		unbind:function(eventType){
			this.forEach(function(_){
				var h;
				var k = "evt-"+eventType;
				if(_==document || _==window) {
					h = _[k];
					delete _[k];
				} else {
					h = $(_).data(k);
					$(_).removeData(k);
				}
				if(h) h.remove();
			});
		},
		trigger:function(type){
			this.forEach(function(_){
				on.emit(_, type, {
					bubbles: true,
					cancelable: true
				});
			});
			return this;
		},
		width:function(v){
			if(v) {
				if(typeof v !="string") v+="px";
				this.forEach(function(_){
					return domStyle.set(_,"width",v);
				});
				return this;
			} else {
				return this.map(function(_){
					return domStyle.get(_,"width");
				}).join();
			}
		},
		outerWidth:function(){
			return domGeometry.getMarginBox(this[0]).w;
		},
		outerHeight:function(){
			return domGeometry.getMarginBox(this[0]).h;
		},
		height:function(v){
			if(v) {
				if(typeof v !="string") v+="px";
				this.forEach(function(_){
					return domStyle.set(_,"height",v);
				});
				return this;
			} else {
				return this.map(function(_){
					return domStyle.get(_,"height");
				}).join();
			}
		},
		offset:function(){
			var x = domGeometry.position(this[0]);
			return {
				left:x.x,
				top:x.y
			};
		},
		hide:function(){
			this.forEach(function(_){
				domClass.add(_,"dijitHidden");
			});
		},
		show:function(){
			this.forEach(function(_){
				domClass.remove(_,"dijitHidden");
			});
		},
		offsetParent:function(){
			return this.map(function() {
				return this.offsetParent || document.body;
			});
		}
	});
	$ = query;
	$ = lang.mixin(function(selector,context){
		if ( typeof selector === "string" ) {
			if ( selector[0] === "<" && selector[ selector.length - 1 ] === ">" && selector.length >= 3 ) {
				return query(domConstruct.place(selector,context || document.body));
			}
		}
		return lang.mixin(query.apply(this, arguments), $.fn);
	}, dojo, {fn: {}});
	$.each = function(collection, fn) {
		collection.forEach(function(_,i){
			fn(i,_);
		});
	};
	$.extend = function(){
		var args = Array.prototype.slice.call(arguments);
		var target = args[0];
		var deep = false;
		// Handle a deep copy situation
		if(typeof target === "boolean" ) {
			deep = args.shift();
		}
		var f = deep ? lang.clone : lang.mixin;
		return f.apply(this,args);
	}
	return $;
});