define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/promise/all",
	"dojo/request",
	"dijit/_WidgetBase",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_TemplatedMixin",
	"dijit/form/_FormValueMixin",
	"dijit/form/Button",
	"dstore/Memory"
],function(declare,lang,Deferred,all,request,_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin, Button, Memory) {
	
	var CSItem = declare("dlagua.w.form.CarouselSelectItem", [_WidgetBase,_Contained,_TemplatedMixin], {
		width:100,
		left:0,
		transform:"",
		baseClass:"dlaguaCarouselSelect-child",
		templateString: '<div style="width:${width}px;left:${left}px;" data-dojo-attach-point="containerNode"></div>',
		_setContentAttr: function(/*String|DomNode|Nodelist*/data){
			this.domNode.innerHTML = data;
		}
	});

	return declare("dlagua.w.form.CarouselSelect",[_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin],{
		templateString:"<div class=\"dijit dijitReset\" data-dojo-attach-point=\"focusNode\"><div class=\"dlaguaCarouselSelectContainer\" data-dojo-attach-point=\"containerNode\"><div class=\"dlaguaCarouselSelectPreview\" data-dojo-attach-point=\"previewNode\"></div></div></div>",
		baseClass:"dlaguaCarouselSelect",
		itemCount:12,
		radius:360,
		itemWidth:130,
		selected:0,
		labelAttr:"content",
		postCreate:function(){
			if(this.store && this.store.labelProperty) this.labelAttr = this.store.labelProperty;
			request("/rest/resources/shirt.svg").then(lang.hitch(this,function(res){
				this.previewNode.innerHTML = res;
				this._init();
				this.prevButton = new Button({
					label:"prev",
					showLabel:false,
					iconClass:"dlaguaCarouselSelectPrevButtonIcon",
					"class":"dlaguaCarouselSelectPrevButton",
					onClick:lang.hitch(this,function(){
						this._page(-1);
					})
				}).placeAt(this.domNode);
				this.nextButton = new Button({
					label:"next",
					showLabel:false,
					iconClass:"dlaguaCarouselSelectNextButtonIcon",
					"class":"dlaguaCarouselSelectNextButton",
					onClick:lang.hitch(this,function(){
						this._page(1);
					})
				}).placeAt(this.domNode);
			}));
			this.inherited(arguments);
		},
		_updateColors:function(prop,oldVal,newVal){
			var parent = this.getParent();
			var value = parent.get("value");
			var colors = value.colors ? value.colors : [];
			var color = colors.filter(function(_){
				return _.name==newVal.color;
			}).pop();
			if(color) this.previewNode.style.color = color.code;
		},
		startup:function(){
			if(this._started) return;
			this.inherited(arguments);
			var parent = this.getParent();
			this.own(
				parent.watch("value",lang.hitch(this,"_updateColors"))
			);
		},
		_page:function(d) {
			var l = this.itemCount;
			var angle = 360 / l;
			this.selected+=d;
			this.prevButton.set("disabled",this.selected==0);
			this.nextButton.set("disabled",this.selected==this.itemCount-1);
			var delta = angle*this.selected;
			for(var i = 0; i < l; i ++) {
				var a = (delta + i*angle);
				this.items[i].domNode.style.transform = this.items[i].domNode.style.webkitTransform = 'rotateY(' + a + 'deg) translateZ(' + this.radius + 'px)';
				this.items[i].domNode.style.zIndex = ((a >=0 && a < 90) || (a>270 && a<=360)) ? i+999 : 0;
			}
		},
		_setup:function(angle, left,data){
			var items = [];
			for (var i = 0; i < this.itemCount; i ++) {
				var item = new CSItem({
					width:this.itemWidth,
					left:left,
					content:data[i][this.labelAttr]
				});
				// add the item to the container
				this.addChild(item)
				items.push(item);
			}
			return items;
		},
		_init:function() {
			var d = 0;
			var angle = 360 / this.itemCount;
			var w = this.radius * 2.3;
			this.containerNode.style.width = w+"px";
			var left = (w-this.itemWidth)/2;
			this.store.query({},{
				start:0,
				count:this.itemCount
			}).then(lang.hitch(this,function(data){
				var labelAttr = this.labelAttr;
				all(data.map(function(_){
					var d = new Deferred();
					if(_[labelAttr]["_ref"]){
						request(_[labelAttr]["_ref"]).then(function(res){
							_[labelAttr] = res;
							d.resolve(_);
						})
					} else {
						d.resolve(_);
					}
					return d;
				})).then(lang.hitch(this,function(data){
					this.items = this._setup(angle,left,data);
					this._page(0);
				}));
			}));
		}
	});
});