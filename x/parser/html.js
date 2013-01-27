define([
"dojo/_base/lang",
"dojo/_base/array",
"dojo/_base/window",
"dojo/_base/fx",
"dojo/dom",
"dojo/dom-construct",
"dojo/dom-style",
"dojo/dom-attr",
"dojo/query",
"dojo/on",
"dijit/form/ToggleButton",
"dojox/uuid/generateRandomUuid"],function(lang,array,win,fx,dom,domConstruct,domStyle,domAttr,query,on,ToggleButton,generateRandomUuid){

lang.getObject("dlagua.x.parser.html", true);
	
var dlaguaSelectedOverlayButton;

dlagua.x.parser.html.overlay = function(val,options) {
	var outerdiv = domConstruct.create("div",{
		"class":"dlaguaOverlay"
	},win.body());
	var p,pw;
	var w = domStyle.get(outerdiv, "width");
	domStyle.set(outerdiv,{
		width:0,
		left:w+"px",
		position:"relative"
	});
	var innerdiv = domConstruct.create("div",{
		innerHTML:val,
		style:"opacity:0;",
		"class":"dlaguaOverlayInner"
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
			var c = this.own(on(window,"onclick",lang.hitch(this,function(){
				this.set("checked", false);
				c.remove();
			})))[0];
			if(this.checked) {
				var sel = dlaguaSelectedOverlayButton;
				if(sel && sel!=this) {
					try {
						sel.set("checked",false);
					} catch(err) {
					}
				}
				domStyle.set(p,"width","auto");
				dlaguaSelectedOverlayButton = this;
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
	button.own(
		on(button.domNode, "onclick", function(event){
			event.stopPropagation();
		})
	);
    var id = options.id || generateRandomUuid();
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

return dlagua.x.parser.html.overlay;

});