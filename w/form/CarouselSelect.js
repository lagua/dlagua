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
	
	// from https://github.com/kriszyp/json-schema/blob/master/lib/links.js#L41
	function substitute(linkTemplate, instance, exclude){
		return linkTemplate.replace(/\{([^\}]*)\}/g, function(t, property){
			var value = exclude.indexOf(property)>-1 ? "*" : instance[decodeURIComponent(property)];
			if(value instanceof Array){
				// the value is an array, it should produce a URI like /Table/(4,5,8) and store.get() should handle that as an array of values
				return '(' + value.join(',') + ')';
			}
			return value;
		});
	};

	return declare("dlagua.w.form.CarouselSelect",[_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin],{
		templateString:"<div class=\"dijit dijitReset\" data-dojo-attach-point=\"focusNode\"><div class=\"dlaguaCarouselSelectContainer\" data-dojo-attach-point=\"containerNode\"><div class=\"dlaguaCarouselSelectPreview\" data-dojo-attach-point=\"previewNode\"></div></div></div>",
		baseClass:"dlaguaCarouselSelect",
		itemCount:12,
		radius:360,
		itemWidth:130,
		selected:0,
		labelAttr:"content",
		relProperty:"designs",
		query:null,
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
		_updateFromParent:function(prop,oldVal,newVal){
			// FIXME generalize
			// each component with a store with queryString
			// should be updated when parent changes
			if(this.store.queryString){
				this.set("query", substitute(this.store.queryString,newVal,[this.name]));
			}
			// each component with trigger should be updated
			// when the target property changes
			var triggers = [{
			   property:"color",
			   target:"previewNode.style.color",
			   rel:"colors",
			   foreignKey:"code"
			}];
			triggers.forEach(function(trigger){
				var val = newVal[trigger.property];
				if(val){
					trigger.value = val;
					if(trigger.rel){
						var rel = trigger.rel;
						var relProp = trigger.foreignKey || "id";
						var relValue = newVal[rel];
						// rql: Color/?id={color}&values(code)
						// if trigger has rel, use it
						// and assume that it's resolved
						if(relValue && relValue instanceof Array) {
							var obj = relValue.filter(function(_){
								return _.id==trigger.value;
							}).pop();
							val = obj[relProp];
						} else {
							// don't update
							val = null;
						}
					}
					if(val){
						// default to value
						var triggerTarget = trigger.target || "value";
						if(triggerTarget.indexOf(".")>-1){
							lang.setObject(triggerTarget,val,this);
						} else {
							this.set(triggerTarget,val);
						}
					}
				}
			},this);
		},
		startup:function(){
			if(this._started) return;
			this.inherited(arguments);
			var parent = this.getParent();
			this.own(
				parent.watch("value",lang.hitch(this,"_updateFromParent")),
				this.watch("query",function(){
					this.getChildren().forEach(function(_){
						if(_!=this.previewNode) _.destroyRecursive();
					},this);
					this._init();
				})
			);
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
		_page:function(d) {
			var l = this.items.length;
			var angle = 360 / l;
			this.selected+=d;
			this.prevButton.set("disabled",this.selected==0);
			this.nextButton.set("disabled",this.selected==l-1);
			var delta = angle*this.selected;
			for(var i = 0; i < l; i ++) {
				var a = (delta + i*angle);
				this.items[i].domNode.style.transform = this.items[i].domNode.style.webkitTransform = 'rotateY(' + a + 'deg) translate3d(26px,-44px,' + this.radius + 'px) scale(.25,.25)';
				this.items[i].domNode.style.zIndex = ((a >=0 && a < 90) || (a>270 && a<=360)) ? l+i : 0;
			}
			var s = this.selected ? l-this.selected : 0;
			var idProp = this.store.idProperty;
			if(this.items[s]) {
				this._set("value",this.items[s].value[idProp]);
			}
		},
		_setup:function(left,data){
			var items = [];
			var l = data.length;
			var angle = 360 / l;
			for (var i = 0; i < l; i ++) {
				var obj = data[i ? l-i : 0]
				var item = new CSItem({
					width:this.itemWidth,
					left:left,
					value:obj,
					content:obj[this.labelAttr]
				});
				// add the item to the container
				this.addChild(item)
				items.push(item);
			}
			return items;
		},
		_init:function() {
			//this.items = [];
			var d = 0;
			var w = this.radius * 2.3;
			this.containerNode.style.width = w+"px";
			var left = (w-this.itemWidth)/2;
			this.store.query(this.query,{
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
					this.items = this._setup(left,data);
					this._select();
				}));
			}));
		}
	});
});