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
	"dforma/util/model",
	"dforma/util/i18n",
	"mustache/mustache"
],function(declare,lang,array,domConstruct,domClass,domAttr,query,request,aspect,Deferred,when,sniff,
		_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin, Button,registry,
		model,i18n,mustache){
	
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
		_setValueAttr:function(value){
			this.value = value;
			this._createContext();
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
	 		return this.store.fetchSync();
	 	},
	 	_handleOnChange:function(data){
	 		this.inherited(arguments);
	 		data = data || [];
	 		// TODO means we have a Memory type store?
	 		data.forEach(function(obj){
	 			this.store.putSync(obj);
	 		},this);
	 		if(this._started) this.refresh();
	 	},
	 	destroyRecursive:function(){
	 		this.inherited(arguments);
	 	},
	 	postCreate:function(){
			var self = this;
			var common = i18n.load("dforma","common");
			var tracked = this.store.track();
			this.own(
				aspect.before(this,"onEdit",lang.hitch(this,function(id){
					// selected by way of onEdit
					this.selected = id;
				}),true),
				tracked.on("add, update, delete", lang.hitch(this,function(event){
					if(event.type=="update"){
						var sel = this._itemMap ? this._itemMap[event.target.id] : null;
						if(sel) sel.set("value",event.target);
					}
				}))
			);
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
					this.store.put(newVal);
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
			// TODO move to domain-specific widget
			this.addButton.set("showLabel",false);
			this.addButton.set("iconClass","dlaguaListAddButtonIcon");
			this.addButton.iconNode.innerHTML = "+";
			request("/rest/resources/shirt.svg").then(lang.hitch(this,function(res){
				domConstruct.create("span",{
					innerHTML:res,
					style:"height:240px;margin-left:-28px;"
				},this.addButton.containerNode,"before");
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
	 		this.store.fetchSync().forEach(function(item){
	 			if(!(item.id in this._itemMap)) this._addChild(item);
		 	},this);
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