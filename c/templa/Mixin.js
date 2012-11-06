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
	_uuid:function(){
		return dojox.uuid.generateRandomUuid();
	},
	set:function(key,value) {
		if(this.parent && key=="value" && this[key]!=value) this.parent.set("__dirty",true);
		this.inherited(arguments);
	},
	render:function(tpl) {
		tpl = tpl.replace(/[\n\t\u200B\u200C\u200D\uFEFF]+/g,"").replace(/\>\s+\</g,"><");
		var div = domConstruct.create("div",{
			innerHTML:tpl
		});
		query("span.templaField",div).forEach(function(node){
			var p = node.parentNode;
			var inner = node.firstChild;
			p.insertBefore(inner, node);
			p.removeChild(node);
		});
		var types = [];
		query("span[data-templa-type]",div).forEach(function(node){
			var type = domAttr.get(node,"data-templa-type");
			types.push(type);
			var props = domAttr.get(node,"data-templa-props");
			var pre = document.createTextNode("{{#_mod}}"+type+"|"+props+"|");
			var post = document.createTextNode("{{/_mod}}");
			domConstruct.place(pre,node,"first");
			domConstruct.place(post,node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
		});
		var dj = dojo;
		array.forEach(types,function(type){
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
	_fn_switch:function(){
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
	},
	_fn_facebooklike: function(){
		return function(text, render) {
			text = render(text);
			setTimeout(function(){
				FB.XFBML.parse();
			},10);
			return '<div class="fb-like" data-href="'+text+'" data-send="false" data-width="120" data-show-faces="false" data-layout="button_count"></div>';
		};
	},
	_fn_twitterlike: function(){
		return function(text, render) {
			var id = this._uuid();
			text = render(text);
			setTimeout(function(){
				twttr.widgets.load();
			},10);
			return '<a href="https://twitter.com/share" class="twitter-share-button" data-url="'+text+'">Tweet</a>';
		};
	},
	_fn_overlay:function(){
		return function(text, render) {
			var outerdiv = domConstruct.create("div",{
				"class":"laguaOverlay"
			},win.body());
			var p,pw;
			var w = domStyle.get(outerdiv, "width");
			domStyle.set(outerdiv,{
				width:0,
				left:w+"px",
				position:"relative"
			});
			var innerdiv = domConstruct.create("div",{
				innerHTML:render(text),
				style:"opacity:0;",
				"class":"laguaOverlayInner"
			},outerdiv);
			on(innerdiv, "onclick", function(event){
				event.stopPropagation();
			});
			var showevents = [], title;
			query("[data-mu-onshow]",innerdiv).forEach(function(se){
				showevents.push(domAttr.get(se,"data-mu-onshow"));
			});
			query("[data-mu-title]",innerdiv).forEach(function(te){
				title = domAttr.get(te,"data-mu-title");
			});
			var button = new ToggleButton({
				style:"float:right;",
				onChange:function(){
					var c = on(window,"onclick",lang.hitch(this,function(){
						this.set("checked", false);
						c.remove();
					}));
					if(this.checked) {
						var sel = window["selectedLaguaOverlayButton"];
						if(sel && sel!=this) {
							try {
								sel.set("checked",false);
							} catch(err) {
							}
						}
						domStyle.set(p,"width","auto");
						window["selectedLaguaOverlayButton"] = this;
						fx.animateProperty({
							node:outerdiv,
							duration:500,
							properties:{
								width:{
									start:0,
									end:w
								},
								left:{
									start:w,
									end:0
								}
							},
							onEnd:function(){
								fx.fadeIn({
									node:innerdiv,
									onEnd:function(){
										array.forEach(showevents,function(se){
											console.log(se);
											eval(se);
										});
									}
								}).play();
							}
						}).play();
					} else {
						fx.fadeOut({
							node:innerdiv,
							onEnd:function(){
								fx.animateProperty({
									node:outerdiv,
									duration:500,
									properties:{
										width:{
											start:w,
											end:0
										},
										left:{
											start:0,
											end:w
										}
									},
									onEnd:function(){
										domStyle.set(p,"width",pw+"px");
									}
								}).play();
							}
						}).play();
					}
				}
			});
			if(title) button.attr("title",title);
			on(button.domNode, "onclick", function(event){
				event.stopPropagation();
			});
			var id = this._uuid();
			setTimeout(function(){
				var s = dom.byId(id);
				if(!s) throw new Error("Overlay not rendered.");
				p = s.parentNode;
				pw = domStyle.get(p,"width");
				p.insertBefore(outerdiv, s);
				p.insertBefore(button.domNode, s);
				p.removeChild(s);
			},10);
			return '<span id="'+id+'"></span>';
		};
	},
	_fn_audio:function(){
		return function(val, render) {
			text = render(val);
			var ar = text.split("|");
			var audio = ar[0];
			var props = (ar.length>1 ? djson.fromJson(ar[1]) : {});
			var id = props.id || this._uuid();
			var mime = "audio/mp3";
			setTimeout(function(){
				// declare audio player with jQuery
				$("#audio_"+id).mediaelementplayer({
					audioWidth : (props.width || 280),
					success : function(me) {
						on(me,"play",function(){
							console.log("play "+id);
							topic.publish("/audio",{node:me,event:"play",id:id});
						});
						on(me,"pause",function(){
							console.log("pause "+id);
							topic.publish("/audio",{node:me,event:"pause",id:id});
						});
					}
				});
			},10);
			text = '<audio id="audio_'+id+'" controls="controls"><source type="'+mime+'" src="'+audio+'"/></audio>';
			if(sniff("ie") && sniff("ie")<9) text = '<span style="display:none;">&nbsp;</span><audio id="audio_'+id+'" controls type="'+mime+'" src="'+audio+'">&nbsp;</audio>';
			return text;
		};
	}
});

});