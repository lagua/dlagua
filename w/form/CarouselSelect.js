define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/when",
	"dojo/promise/all",
	"dojo/request",
	"dojo/dom-class",
	"dijit/_WidgetBase",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_TemplatedMixin",
	"dijit/form/_FormValueMixin",
	"dijit/form/Button",
	"dstore/Memory"
],function(declare,lang,Deferred,when,all,request,domClass,
		_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin, Button, Memory) {
	
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
		relProperty:"designs",
		query:"",
		postCreate:function(){
			// FIXME generalize
			if(this.store && this.store.labelProperty) this.labelAttr = this.store.labelProperty;
			this.inherited(arguments);
		},
		_handleOnChange: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
			this.inherited(arguments);
			if(!this._started || !this.items) return;
			this._select();
		},
		startup:function(){
			if(this._started) return;
			this.inherited(arguments);
			var parent = this.getParent();
			this.items = [];
			this.own(
				this.watch("query",function(prop,oldVal,newVal){
					this.items = [];
					this._init(newVal);
				})
			);
			var w = this.radius * 2.3;
			this.containerNode.style.width = w+"px";
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
			this._queue = [];
			request("/rest/resources/shirt.svg").then(lang.hitch(this,function(res){
				this.previewNode.innerHTML = res;
				this._init(this.query);
			}));
		},
		_select:function(){
			if(!this.value){
				this._page(0);
				return;
			}
			var i=0,l = this.items.length;
			var idProp = this.store.idProperty;
			for(;i<l;i++) {
				if(this.items[i].value[idProp] == this.value) {
					break;
				}
			}
			var s = this.selected;// ? l-this.selected : 0;
			var t = i ? l-i : 0;
			this._page(t-s);
		},
		_updateItems:function(){
			var shown = [];
			this.items.forEach(function(_){
				if(_.hidden){
					domClass.add(_.domNode,"dijitHidden");
				} else {
					domClass.remove(_.domNode,"dijitHidden");
					shown.push(_);
				}
			});
			var l = shown.length;
			var angle = 360 / l;
			var delta = angle*this.selected;
			for(var i = 0; i < l; i ++) {
				var item = shown[i];
				var a = (delta + i*angle);
				item.domNode.style.transform = item.domNode.style.webkitTransform = 'rotateY(' + a + 'deg) translate3d(26px,-44px,' + this.radius + 'px) scale(.25,.25)';
				item.domNode.style.zIndex = ((a >=0 && a < 90) || (a>270 && a<=360)) ? l+i : 0;
			}
		},
		_page:function(d) {
			var l = this.items.length;
			this.selected+=d;
			this.prevButton.set("disabled",this.selected==0);
			this.nextButton.set("disabled",this.selected==l-1);
			this._updateItems();
			var s = this.selected ? l-this.selected : 0;
			var idProp = this.store.idProperty;
			if(this.items[s]) {
				this._set("value",this.items[s].value[idProp]);
			}
			// TODO get stuff from the store
			/*if(d>0){
				this._init(this.query,{
					start:this.selected+(this.items.length-1),
					count:d,
					add:true
				});
			}*/
		},
		_setup:function(left,data,options){
			var add = !!options.add;
			var l = data.length;
			for (var i = 0; i < l; i ++) {
				var index = i ? l-i : 0;
				var obj = data[index];
				var item = new CSItem({
					width:this.itemWidth,
					left:left,
					value:obj,
					content:obj[this.labelAttr]
				});
				// add the item to the container
				this.addChild(item);
				this.items.push(item);
			}
		},
		_init:function(query,options) {
			if(this._loading) {
				//this._queue.push(query);
				return;
			}
			options = options || {
				start:0,
				count:this.itemCount
			};
			this._loading = true;
			var add = !!options.add;
			var labelAttr = this.labelAttr;
			var w = this.radius * 2.3;
			var left = (w-this.itemWidth)/2;
			var req = this.store.query(query,options);
			req.then(lang.hitch(this,function(data){
				req.total.then(lang.hitch(this,function(total){
					// FIXME apply some kind of schema to resolve
					this.total = total;
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
						this._loading = false;
						if(add){
							var shown = this.items.filter(function(_){
								return !_.hidden;
							});
							var l = data.length;
							for(var i=0;i<l;i++){
								//shown[i].hidden=true;
							}
						} else {
							this.getChildren().forEach(function(_){
								_.destroyRecursive();
							},this);
						}
						this._setup(left,data,options);
						if(!add) {
							this._select();
						} else {
							this._updateItems();
						}
						//if(this._queue.length){
						//	this._init(this._queue.shift());
						//}
					}));
				}));
			}),function(err){
				
			});
		}
	});
});