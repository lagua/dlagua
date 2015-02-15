define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/dom-attr",
	"dojo/query",
	"dojo/request",
	"dijit/_WidgetBase",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_TemplatedMixin",
	"dijit/form/_FormValueMixin",
	"dijit/form/Button",
	"dstore/Memory",
	"dstore/Trackable",
	"can/map", 
	"can/view", 
	"can/view/mustache",
	"dforma/util/i18n"
],function(declare,lang,array,domConstruct,domClass,domAttr,query,request,
		_WidgetBase,_Contained,_Container,_TemplatedMixin, _FormValueMixin, Button,
		Memory, Trackable,
		Map, can,mustache,
		i18n){
	
	var ListItem = declare("dlagua.w.form.ListItem",[_WidgetBase,_Contained],{
		data:null,
		postCreate:function(){
			this.render();
		},
		render:function(){
			var parent = this.getParent();
			var tpl = parent.getTemplate();
			//this.domNode.innerHTML = mustache.to_html(tpl, this.data);
			var data = new Map(this.data);
			var node = can.view(tpl, data);
			this.domNode.appendChild(node);
			// IE style workaround
			query("*[data-style]",this.domNode).forEach(function(_){
				domAttr.set(_,"style",domAttr.get(_,"data-style"));
			});
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
			this._itemMap = {};
	 	},
	 	startup:function(){
	 		this.inherited(arguments);
			var parent = this.getParent();
			var ancestor = parent ? parent.getParent() : null;
			var templatePath = ancestor.templatePath+ancestor.currentItem.path + "/" + this.name + ".html";
			request(templatePath).then(function(res){
				self.template = res;
				self.refresh();
			});
	 	},
	 	refresh:function(){
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
	 			data:item
	 		});
	 		this.addChild(child);
	 	},
		onAdd:function(id){
			// override to set initial data
		},
		select:function(id){
			// TODO update css
			this.selected = id;
		},
		_add:function(){
			this.store.add(lang.clone(this.defaultInstance)).then(lang.hitch(this,function(data){
				var id = data.id;
				this.onAdd(id);
				this.newdata = true;
				this.select(id);
				this.onEdit(id);
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