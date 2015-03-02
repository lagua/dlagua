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
				this.render();
			} else {
				this.value = prop;
				this._createContext();
				this.render();
			}
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
		templateString: "<div class=\"dijit dijitReset\" data-dojo-attach-point=\"focusNode\" aria-labelledby=\"${id}_label\"><div class=\"dijitReset dijitHidden dformaListLabel\" data-dojo-attach-point=\"labelNode\" id=\"${id}_label\"></div><div class=\"dijitReset dijitHidden dformaListHint\" data-dojo-attach-point=\"hintNode\"></div><div class=\"dformaListContainer\" data-dojo-attach-point=\"containerNode\"></div><div class=\"dijitReset dijitHidden dformaListMessage\" data-dojo-attach-point=\"messageNode\"></div></div>",
		store:null,
		newdata:false,
		defaultInstance:{},
		add:true,
		edit:true,
		remove:true,
		readOnly:false,
		autosave:true,
		baseClass:"dformaList",
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
	 		var widgets = this.getChildren().filter(function(_){
	 			return _ != this.addButton;
	 		},this);
	 		var arr = widgets.map(function(_){
	 			return _.get("value");
	 		});
	 		if(this.autosave) this.store.setData(arr);
	 		return arr;//this.store.fetchSync();
	 	},
	 	_setValueAttr:function(data){
	 		if(!this._started) return;
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
			var schema = this.schema.items ? this.schema.items[0] : this.schema;
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
			aspect.before(this,"onEdit",lang.hitch(this,function(id){
				// selected by way of onEdit
				this.selected = id;
			}),true);
			/*if(typeof this.store.on == "function") {
				// on update requery links
				this.own(
					this.store.on("add,update,delete",lang.hitch(this,function(event){
						this.refresh();
					}))
				);
			}*/
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
	 		var _resolving = false;
			this.own(
				aspect.after(this.subform,"cancel",lang.hitch(this,function(){
					this.selected = null;
					this.refresh();
				})),
				this.subform.watch("value",lang.hitch(this,function(prop,oldVal,newVal){
					if(this.autosave && this.newdata) {
						this.newdata = false;
					}
					var sel = this._itemMap ? this._itemMap[this.selected] : null;
					console.warn("newVal",newVal)
					if(sel) sel.set("value",newVal);
				}))
			);
			request(this.templatePath+this.templateExtension).then(lang.hitch(this,function(tpl){
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
	 		if(!this._itemMap) this._itemMap = {};
	 		for(var id in this._itemMap) {
	 			var child = this._itemMap[id];
	 			var obj = this.store.getSync(id);
	 			if(child && !obj) {
	 				this.removeChild(child);
	 				delete this._itemMap[id];
	 			}
	 		}
	 		console.log(this.store.data)
	 		this.store.fetch().then(lang.hitch(this,function(items){
	 			items.forEach(function(item){
		 			console.log(item)
		 			if(!(item.id in this._itemMap)) this._addChild(item);
		 		},this);
	 		}))
	 	},
	 	_addChild:function(item){
	 		var schema = this.schema.items ? this.schema.items[0] : this.schema;
	 		var child = new ListItem({
	 			value:item,
	 			writer:this.writer,
	 			tokens:this.tokens,
	 			template:this.template,
	 			schema:schema,
	 			target:this.store.target
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
			// TODO update css
			if(this.selected) {
				if(!this.subform.submit()) return;
			}
			this.selected = id;
			this.onEdit(id);
		},
		_add:function(){
			if(this.selected) {
				if(!this.subform.submit()) return;
				this.selected = null;
			}
			var data = lang.mixin({},this.defaultInstance);
			// TODO do something with parent controller if have
			this.store.add(data).then(lang.hitch(this,function(data){
				var id = data.id;
				this.onAdd(id);
				this.select(id);
				this.refresh();
			}));
		},
		onEdit:function(id,options){
			// override to edit
		},
		save:function(obj,options){
			// since we're saving from subform, reset selection
			this.selected = null;
			var id = obj.id || options.id;
			this.store.put(obj,options);
			this.refresh();
		}
	});
	
});