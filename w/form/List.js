define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/dom-attr",
	"dojo/query",
	"dojo/request",
	"dojo/aspect",
	"dojo/Deferred",
	"dojo/when",
	"dojo/sniff",
	"dijit/_WidgetBase",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_TemplatedMixin",
	"dijit/form/_FormValueMixin",
	"dijit/form/Button",
	"dijit/registry",
	"dstore/Memory",
	"dstore/Trackable",
	"mustache/mustache",
	"dlagua/c/store/Model",
	"dforma/util/i18n"
],function(declare,lang,array,domConstruct,domClass,domAttr,query,request,aspect,Deferred,when,sniff,
		_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin, Button,registry,
		Memory, Trackable,
		mustache,
		Model, i18n){
	
	var isIE = !!sniff("ie");
	
	var ListItem = declare("dlagua.w.form.ListItem",[_WidgetBase,_Contained],{
		template:"",
		tokens:null,
		value:null,
		writer:null,
		startup:function(){
			if(this._started) return;
			this._createContext();
			this.render();
		},
		_setValueAttr:function(prop,value){
			if(typeof prop=="string"){
				// update individual property
				if(this.context) delete this.context.cache[prop];
				this.value[prop] = value;
			} else {
				this.value = prop;
				this._createContext();
			}
			this.render();
		},
		_createContext:function(){
			this.context = new mustache.Context(this.value);
		},
		render:function(){
			if(!this.writer) return;
			// update view:
			// add watch to parent subform(!) value for the selected id
			// delete (or update) this.context.cache.color;
			// w.context.view.color="paars";
			// w.render();
			this.domNode.innerHTML = this.writer.renderTokens(this.tokens,this.context,{},this.template);
			// IE style workaround
			if(isIE) {
				query("*[data-style]",this.domNode).forEach(function(_){
					domAttr.set(_,"style",domAttr.get(_,"data-style"));
				});
			}
		}
	});
	
	var TrackableMemory = declare([Memory, Trackable]);
	
	return declare("dlagua.w.form.List",[_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin],{
		templateString: "<div class=\"dijit dijitReset\" data-dojo-attach-point=\"focusNode\" aria-labelledby=\"${id}_label\"><div class=\"dijitReset dijitHidden dformaGridLabel\" data-dojo-attach-point=\"labelNode\" id=\"${id}_label\"></div><div class=\"dijitReset dijitHidden dformaGridHint\" data-dojo-attach-point=\"hintNode\"></div><div class=\"dformaGridContainer\" data-dojo-attach-point=\"containerNode\"></div><div class=\"dijitReset dijitHidden dformaGridMessage\" data-dojo-attach-point=\"messageNode\"></div></div>",
		store:null,
		newdata:false,
		defaultInstance:{},
		add:true,
		edit:true,
		remove:true,
		readOnly:false,
		baseClass:"dformaGrid",
		multiple:true, // needed for setValueAttr array value
		_setHintAttr: function(/*String*/ content){
			// summary:
			//		Hook for set('label', ...) to work.
			// description:
			//		Set the label (text) of the button; takes an HTML string.
			this._set("hint", content);
			this.hintNode.innerHTML = content;
			domClass.toggle(this.hintNode,"dijitHidden",!this.hint);
	 	},
		_setLabelAttr: function(/*String*/ content){
			// summary:
			//		Hook for set('label', ...) to work.
			// description:
			//		Set the label (text) of the button; takes an HTML string.
			this._set("label", content);
			this["labelNode"].innerHTML = content;
			domClass.toggle(this.labelNode,"dijitHidden",!this.label);
	 	},
	 	_getValueAttr:function(){
	 		return this.store.fetchSync();
	 	},
	 	_setValueAttr:function(data){
	 		data = data || [];
	 		// TODO means we have a Memory type store?
	 		this.store.setData(data);
	 		this.refresh();
	 	},
	 	destroyRecursive:function(){
	 		this.inherited(arguments);
	 	},
	 	postCreate:function(){
			var self = this;
			var common = i18n.load("dforma","common");
			if(!this.store) this.store = new TrackableMemory();
			var putFunc = function(put) {
				return function(object,options) {
					var d = new Deferred();
					var target = this.target;
					when(put.call(this,object,options),function(object){
						var model = new Model({
							data:object,
							refAttribute:"_ref",
							target:target,
							schema:schema,
							coerce:true,
							resolve:true,
							ready:function(){
								d.resolve(this.data);
							}
						});
					});
					return d;
				}
			}
			aspect.around(this.store,"put",function(put){
				return putFunc(put);
			});
			aspect.around(this.store,"add",function(add){
				return putFunc(add);
			});
			if(typeof this.store.on == "function") {
				// on update requery links
				var schema = this.schema.items ? this.schema.items[0] : this.schema;
				this.own(
					this.store.on("add,update,delete",lang.hitch(this,function(event){
						console.log(event)
					}))
				);
			}
			this.inherited(arguments);
			if(this.add){
				this.addButton = new Button({
					label:common.buttonAdd,
					disabled:this.readOnly,
					"class": "dlaguaListAddButton",
					onClick:function(){
						self._add();
					}
				}).placeAt(this.containerNode);
			}
	 	},
	 	startup:function(){
	 		if(this._started) return;
			this.own(
				this.subform.watch("value",lang.hitch(this,function(prop,oldVal,newVal){
					var sel = this._itemMap[this.selected];
					if(sel) sel.set("value",newVal);
				}))
			);
			request(this.templatePath).then(lang.hitch(this,function(tpl){
				if(!tpl) return;
				this.template = tpl;
				if(!this.writer) {
					this.writer = new mustache.Writer();
					this.tokens = this.writer.parse(tpl);
				}
				this.refresh();
			}));
			this.inherited(arguments);
	 	},
	 	refresh:function(){
	 		// prevent hiding
	 		domClass.remove(this.domNode,"dijitHidden");
	 		if(!this._itemMap) this._itemMap = {};
	 		for(var id in this._itemMap) {
	 			var child = this._itemMap[id];
	 			if(!this.store.getSync(id)) {
	 				this.removeChild(child);
	 				delete this._itemMap[id];
	 			}
	 		}
	 		this.store.fetchSync().forEach(function(item){
	 			if(!(item.id in this._itemMap)) this._addChild(item);
	 		},this);
	 	},
	 	_addChild:function(item){
	 		var child = new ListItem({
	 			value:item,
	 			writer:this.writer,
	 			tokens:this.tokens,
	 			template:this.template
	 		});
	 		var self = this;
	 		child.own(
	 			child.on("click",function(){
	 				var w = registry.getEnclosingWidget(this);
		 			self.select(w.value.id);
		 		})
	 		);
	 		this.addChild(child);
	 		this._itemMap[item.id] = child;
	 	},
		onAdd:function(id){
			// override to set initial data
		},
		select:function(id){
			if(this.selected && this.selected===id) return;
			domClass.remove(this.domNode,"dijitHidden");
			// TODO update css
			if(this.selected)this.subform.cancel();
			this.selected = id;
			this.onEdit(id);
		},
		_add:function(){
			var data = lang.mixin({},this.defaultInstance);
			//var parent = this.getParent();
			// TODO do something with parent controller if have
			this.store.add(data).then(lang.hitch(this,function(data){
				var id = data.id;
				this.onAdd(id);
				this.newdata = true;
				this.select(id);
				this.refresh();
			}));
		},
		onEdit:function(id,options){
			// override to edit
		},
		save:function(id,options){
			this.newdata = false;
			this.store.put(id,options);
			this.refresh();
		}
	});
	
});