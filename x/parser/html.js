dojo.provide("dlagua.x.parser.html");

dojo.require("dijit.form.Button");
dojo.require("dojox.uuid.generateRandomUuid");

dojo.getObject("c.x.parser.html", true, dlagua);

var dlaguaSelectedOverlayButton;

dlagua.x.parser.html.overlay = function(val,options) {
	var outerdiv = dojo.create("div",{
		"class":"dlaguaOverlay"
	},dojo.body());
	var p,pw;
	var w = dojo.style(outerdiv, "width");
	dojo.style(outerdiv,{
		width:0,
		left:w+"px",
		position:"relative"
	});
	var innerdiv = dojo.create("div",{
		innerHTML:render(val),
		style:"opacity:0;",
		"class":"dlaguaOverlayInner"
	},outerdiv);
	dojo.connect(innerdiv, "onclick", function(event){
		event.stopPropagation();
	});
	var showevents = [], title;
	dojo.query("[data-mu-onshow]",innerdiv).forEach(function(se){
		showevents.push(dojo.attr(se,"data-mu-onshow"));
	});
	dojo.query("[data-mu-title]",innerdiv).forEach(function(te){
		title = dojo.attr(te,"data-mu-title");
	});
	var button = new dijit.form.ToggleButton({
		style:"float:right;",
		onChange:function(){
			var c = dojo.connect(window,"onclick",this,function(){
				this.set("checked", false);
				dojo.disconnect(c);
			});
			if(this.checked) {
				var sel = dlaguaSelectedOverlayButton;
				if(sel && sel!=this) {
					try {
						sel.set("checked",false);
					} catch(err) {
					}
				}
				dojo.style(p,"width","auto");
				dlaguaSelectedOverlayButton = this;
				dojo.animateProperty({
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
						dojo.fadeIn({
							node:innerdiv,
							onEnd:function(){
								dojo.forEach(showevents,function(se){
									console.log(se);
									eval(se);
								});
							}
						}).play();
					}
				}).play();
			} else {
				dojo.fadeOut({
					node:innerdiv,
					onEnd:function(){
						dojo.animateProperty({
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
								dojo.style(p,"width",pw+"px");
							}
						}).play();
					}
				}).play();
			}
		}
	});
	if(title) button.attr("title",title);
	dojo.connect(button.domNode, "onclick", function(event){
		event.stopPropagation();
	});
    var id = dojox.uuid.generateRandomUuid();
	setTimeout(function(){
		var s = dojo.byId(id);
		if(!s) throw new Error("Overlay not rendered.");
		p = s.parentNode;
		pw = dojo.style(p,"width");
		p.insertBefore(outerdiv, s);
		p.insertBefore(button.domNode, s);
		p.removeChild(s);
	},10);
	return '<span id="'+id+'"></span>';
};