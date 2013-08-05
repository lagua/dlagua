define(["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dojo/aspect", "dojo/on", "dojo/has", "dojo/selector/lite", "dojo/dom-construct", "dojo/dom-attr", "dojo/dom-style", "dojo/dom-class", "dijit/registry", "dijit/_WidgetBase",  "dojox/lang/functional"],
	function(declare, lang, array, aspect, on, has, defaultEngine, domConstruct,domAttr,domStyle,domClass, registry, _WidgetBase, df){
	
	"use strict";

	has.add("array-extensible", function(){
		// test to see if we can extend an array (not supported in old IE)
		return lang.delegate([], {length: 1}).length == 1 && !has("bug-for-in-skips-shadowed");
	});
	
	var ap = Array.prototype, aps = ap.slice, apc = ap.concat, forEach = array.forEach;
	var op = Object.prototype, opts = op.toString, cname = "constructor";

	var tnl = function(/*Array*/ a, /*dojo/NodeList?*/ parent, /*Function?*/ NodeListCtor){
		// summary:
		//		decorate an array to make it look like a `dojo/NodeList`.
		// a:
		//		Array of nodes to decorate.
		// parent:
		//		An optional parent NodeList that generated the current
		//		list of nodes. Used to call _stash() so the parent NodeList
		//		can be accessed via end() later.
		// NodeListCtor:
		//		An optional constructor function to use for any
		//		new NodeList calls. This allows a certain chain of
		//		NodeList calls to use a different object than dojo/NodeList.
		var nodeList = new (NodeListCtor || this._NodeListCtor || nl)(a);
		return parent ? nodeList._stash(parent) : nodeList;
	};
	
	function transform(widget,newdom) {
		// TODO: apply rule-based transforms
		// for now, just update the DOM from template:
		// - update children: not needed! template is the same! popup is just added!
		// - update classes
		// - update attributes
		defaultEngine(">*",widget.domNode).forEach(function(c){
			if(c.parentNode) c.parentNode.removeChild(c);
		});
		defaultEngine(">*",newdom).forEach(function(c){
			domConstruct.place(c,widget.domNode);
		});
		domClass.replace(widget.domNode,domAttr.get(newdom,"class"),domAttr.get(widget.domNode,"class"));
		array.forEach(newdom.attributes,function(attr){
			if(array.indexOf(["id","class","widgetid"],attr.name) == -1 && domAttr.get(widget.domNode,attr.name)!=attr.value) {
				domAttr.set(widget.domNode,attr.name,attr.value);
			}
		});
	}
	
	function mixin(target, source, exclude){
		var name, t;
		// add props adding metadata for incoming functions skipping a constructor
		for(name in source){
			t = source[name];
			if((t !== op[name] || !(name in op)) && name != cname && array.indexOf(exclude,name)==-1){
				if(opts.call(t) == "[object Function]"){
					// non-trivial function method => attach its name
					t.nom = name;
				}
				target[name] = t;
			}
		}
	}
	
	var NodeList = function(array){
		var isNew = this instanceof nl && has("array-extensible");
		if(typeof array == "number"){
			array = Array(array);
		}
		var nodeArray = (array && "length" in array) ? array : arguments;
		if(isNew || !nodeArray.sort){
			// make sure it's a real array before we pass it on to be wrapped 
			var target = isNew ? this : [],
				l = target.length = nodeArray.length;
			for(var i = 0; i < l; i++){
				target[i] = nodeArray[i];
			}
			if(isNew){
				// called with new operator, this means we are going to use this instance and push
				// the nodes on to it. This is usually much faster since the NodeList properties
				//	don't need to be copied (unless the list of nodes is extremely large).
				return target;
			}
			nodeArray = target;
		}
		// called without new operator, use a real array and copy prototype properties,
		// this is slower and exists for back-compat. Should be removed in 2.0.
		lang._mixin(nodeArray, nlp);
		nodeArray._NodeListCtor = function(array){
			// call without new operator to preserve back-compat behavior
			return nl(array);
		};
		return nodeArray;
	};
	
	var nl = NodeList, nlp = nl.prototype = 
		has("array-extensible") ? [] : {};// extend an array if it is extensible

	// expose adapters and the wrapper as private functions

	nl._wrap = nlp._wrap = tnl;
	nl._handles;

	// mass assignment

	// add array redirectors
	forEach(["slice", "splice"], function(name){
		var f = ap[name];
		//Use a copy of the this array via this.slice() to allow .end() to work right in the splice case.
		// CANNOT apply ._stash()/end() to splice since it currently modifies
		// the existing this array -- it would break backward compatibility if we copy the array before
		// the splice so that we can use .end(). So only doing the stash option to this._wrap for slice.
		nlp[name] = function(){ return this._wrap(f.apply(this, arguments), name == "slice" ? this : null); };
	});
	// concat should be here but some browsers with native NodeList have problems with it

	// add array.js redirectors
	forEach(["indexOf", "lastIndexOf", "every", "some"], function(name){
		var f = array[name];
		nlp[name] = function(){ return f.apply(dojo, [this].concat(aps.call(arguments, 0))); };
	});

	lang.extend(NodeList, {
		// copy the constructors
		constructor: nl,
		_NodeListCtor: nl,
		toString: function(){
			// Array.prototype.toString can't be applied to objects, so we use join
			return this.join(",");
		},
		_stash: function(parent){
			this._parent = parent;
			return this;
		},
		// mixin decorators
		extend: function(mixins,params) {
			var nodes = array.map(this,function(node){
				var ref = node.domNode.nextElementSibling;
				var insertIndex = "before";
				if(!ref) {
					ref = node.domNode.parentNode;
					insertIndex = "last";
				}
				params = lang.mixin(node.params || {}, params);
				var domNode = node.domNode;
				registry.remove(node.id);
				node.destroyRecursive(true);
				var style = domNode.style;
				domNode.innerHTML = "";
				var Widget = declare(mixins);
				node = new Widget(params,domNode);
				node.placeAt(ref,insertIndex);
				node.set("style",style);
				node.startup();
				return node;
			},this);
			return this._wrap(nodes);
		},
		set:function(param,data){
			forEach(this,function(node){
				node.set(param,data);
			});
			return this;
		},
		setDomStyle:function(){
			var args = Array.prototype.slice.call(arguments);
			forEach(this,function(node){
				domStyle.set.apply(domStyle,[node.domNode].concat(args));
			});
			return this;
		},
		addDomClass:function(){
			var args = Array.prototype.slice.call(arguments);
			forEach(this,function(node){
				domClass.add.apply(domClass,[node.domNode].concat(args));
			});
			return this;
		},
		placeAt:function(refNode,insertIndex){
			forEach(this,function(node){
				domConstruct.place(node.domNode,refNode,insertIndex);
			});
			return this;
		},
		subscribe:function(channel,options){
			forEach(this,function(node){
				node.subscribe && node.subscribe(channel,options);
			});
			return this;
		},
		call:function(){
			var args = Array.prototype.slice.call(arguments);
			var f = args.shift();
			forEach(this,function(node){
				node[f].apply(node,args);
			});
			return this;
		},
		on: function(eventName, mylistener){
			// pass NodeList as first argument for chaining
			var self = this;
			var handles = this.map(function(node){
				var listener = function(){
					var args = Array.prototype.slice.call(arguments);
					args.push(self);
					mylistener.apply(node,args);
				}
				return node.on(eventName,lang.hitch(node,listener));
			});
			this._handles = handles;
			return this;
		},
		after: function(eventName, mylistener){
			// pass NodeList as first argument for chaining
			var self = this;
			var handles = this.map(function(node){
				var listener = function(){
					var args = Array.prototype.slice.call(arguments);
					args.push(self);
					mylistener.apply(node,args);
				}
				return aspect.after(node,eventName,lang.hitch(node,listener),true);
			});
			this._handles = handles;
			return this;
		},
		before: function(eventName, mylistener){
			// pass NodeList as first argument for chaining
			var self = this;
			var handles = this.map(function(node){
				var listener = function(){
					var args = Array.prototype.slice.call(arguments);
					args.push(self);
					mylistener.apply(node,args);
				}
				return aspect.before(node,eventName,lang.hitch(node,listener),true);
			});
			this._handles = handles;
			return this;
		},
		off:function(){
			if(this._handles) {
				for(var i=0;i<this._handles.length;i++) this._handles[i].remove();
				this._handles = null;
			}
		},
		
		lambda: function(s, callback) {
			var x = df.lambda(s);
			var res = x.apply(null,this);
			//if(typeof res != "Object" && !(res instanceof NodeList) && res) res = this;
			if(callback) {
				callback(res);
			} else {
				return res;
			}
		},

		end: function(){
			if(this._parent){
				return this._parent;
			}else{
				//Just return empty list.
				return new this._NodeListCtor(0);
			}
		},

		concat: function(item){

			var t = aps.call(this, 0),
				m = array.map(arguments, function(a){
					return aps.call(a, 0);
				});
			return this._wrap(apc.apply(t, m), this);	// dojo/NodeList
		},

		map: function(/*Function*/ func, /*Function?*/ obj){
			return this._wrap(df.map(this, func, obj), this); // dojo/NodeList
		},

		forEach: function(callback, thisObj){
			df.forEach(this, callback, thisObj);
			// non-standard return to allow easier chaining
			return this; // dojo/NodeList
		},
		filter: function(/*String|Function*/ filter){
			if(typeof filter == "string"){ // inline'd type check
				return this._wrap(df.filter(this, filter), this); // dojo/NodeList
			}
			return this._wrap(array.filter(this, filter), this);	// dojo/NodeList
		},
		at: function(/*===== index =====*/){
			var t = new this._NodeListCtor(0);
			forEach(arguments, function(i){
				if(i < 0){ i = this.length + i; }
				if(this[i]){ t.push(this[i]); }
			}, this);
			return t._stash(this); // dojo/NodeList
		}
	});
	
	var w = lang.getObject("dlagua.w", true);
	
	var findWidgetNode = function(node){
		if(!node.hasAttribute("id")) return node;
		var widget = registry._hash[node.getAttribute("id")];
		return widget ? widget.domNode : node;
	};
	
	var query = function(q,context) {
		var nodelist = defaultEngine(q,context);
		var widgetlist = [];
		array.forEach(nodelist,function(node){
			var widgetnode = node.hasAttribute("widgetid") ? node : findWidgetNode(node);
			var widget = registry.byNode(widgetnode);
			if(!widget) {
				widget = new _WidgetBase({
					id:node.id
				},node);
				widget.startup();
			}
			widgetlist.push(widget);
		});
		return new NodeList(widgetlist);
	};
	
	query.NodeList = NodeList;
	
	w.query = query;
	
	return query;
	
});