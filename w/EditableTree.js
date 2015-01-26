define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/event",
	"dojo/Deferred",
	"dojo/on",
	"dojo/aspect",
	"dojo/topic",
	"dojo/when",
	"dojo/keys",
	"dojo/query",
	"dojo/dom-style",
	"dojo/dom-class",
	"dijit/Dialog",
	"dijit/Menu",
	"dijit/MenuItem",
	"dijit/registry",
	"rql/query",
	"dforma/Builder",
	"dojox/widget/Toaster",
	"dlagua/w/SearchableTree",
	"./tree/dndSource"
],function(declare,lang,array,event,Deferred,on,aspect,topic,when,keys,query,domStyle,domClass,Dialog,Menu,MenuItem,registry,rqlQuery,Builder,Toaster,SearchableTree,dndSource){

var TreeNode = declare("dlagua.w._EditableTreeNode",[SearchableTree._TreeNode],{
	addChild:function(child){
		if(this.tree.checkEditAcceptance()) {
			child.own(
				on(child.domNode,"mousedown",lang.hitch(child,function(evt){
					if(evt.button!=2) return true;
					this.tree.set('selectedNode',this);
					this.tree.onContextClick(this.item,this);
					event.stop(evt);
				}))
			);
		}
		this.inherited(arguments);
	},
	_getMessage:function(type) {
		var message = "";
		if(type=="add") message = this.tree.newLabel+" a new item under "+this.item.name;
		if(type=="edit") message = this.tree.editLabel+" "+this.item.name;
		if(type=="delete_alert") message = "You cannot delete a container. Please delete all items in this container first and try again.";
		if(type=="delete_confirm") message = "Are you sure you want to delete "+this.item.path+"?"
		return message;
	},
	_onAddClick:function(){
		var tree = this.tree;
		tree.dialog.set("title",this._getMessage("add"));
		tree.createForm();
		tree.dialog.show();
	},
	_mayEdit:function(){
		return true;
	},
	_onEditClick:function(){
		var tree = this.tree;
		if(this._mayEdit()){
			tree.dialog.set("title",this._getMessage("edit"));
			tree.createForm(this.item);
			tree.dialog.show();
		}
	},
	_onDeleteClick:function(){
		var node = this;
		var t = this.tree;
		var m = t.model;
		// remove deferred from node
		if(node && node._expandNodeDeferred){
			delete node._expandNodeDeferred;
		}
		if(m.mayHaveChildren(this.item)) {
			alert(this._getMessage("delete_alert"));
			return;
		}
		var path = this.item.path;
		if(!confirm(this._getMessage("delete_confirm"))) return;
		var id = this.item.id;
		this.item.__deleted = true;
		t.onActivate(this.item);
		// use tree parent item instead of store parent
		// because that is the one that must be altered in some cases
		var parent = node.getParent().item;
		console.log("editabletree removing",id)
		m.store.remove(id,{parent:parent});
	}
});

var Tree = declare("dlagua.w.EditableTree",[SearchableTree], {
	model:null,
	showRoot:false,
	tree:null,
	center:null,
	locale:"",
	state:"initial",
	formProperties:null,
	foldersArePages:false,
	role:"",
	newLabel:"Create",
	editLabel:"Edit",
	dialog:null,
	form:null,
	style:"overflow:visible;",
	currentId:"",
	_lh:null,
	menu:null,
	selectedMenuNode:null,
	dndController:dndSource,
	betweenThreshold:5,
	checkItemAcceptance:function(target,source,position) {
		var node = dijit.getEnclosingWidget(target);
		var item = node.item;
		if(node && item) {
			if(position=="over" && this.tree.model.mayHaveChildren(item)){
				return true;
			} else if(position=="before" || position=="after") {
				return true;
			} else {
				return false;
			}
		}
		return false;
    },
    checkEditAcceptance:function(){
    	return true;
    },
	onClick:function(item,node){
		this.onActivate(item);
	},
	onContextClick:function(item,node){
		// trigger for item onContextClick
	},
	_onExpandoClick:function(msg){
		var node = msg.node;
		//this.onActivate(node.item);
		this.inherited(arguments);
	},
	onActivate:function(item){
		// trigger for item activation
	},
	_checkTruncate:function(path){
		this.selectNodeByField(path,"path",true).then(lang.hitch(this,function(result){
			if(result) {
				if(!this.selectedItem) return;
				var node = this.getNodesByItem(this.selectedItem)[0];
				this.onClick(node.item,node);
				this.collapseAll(node).then(lang.hitch(this,function(){
					this._expandNode(node);
				}));
			} else {
				this._truncated = this.currentId;
				var pathar = path.split("/");
				pathar.pop();
				// is there something else to select?
				if(pathar.length>0) {
					this._checkTruncate(pathar.join("/"));
				} else {
					this.set("path",[]);
				}
			}
		}));
	},
	_setSelection:function(){
		query(".dijitTreeRowSelected",this.domNode).forEach(function(elm){
			var node = registry.getEnclosingWidget(elm);
			console.warn(node);
			node.setSelected(false);
		});
		var nodes = this._itemNodesMap[this.selectedItem.id];
		nodes.forEach(function(node){
			node.setSelected(true);
		});
	},
	loadFromId:function(){
		if(!this.model.root) {
			console.log("model was not loaded",this.model.locale)
			this._lh = aspect.after(this,"onLoad",lang.hitch(this,this.loadFromId));
			return;
		}
		if(this._lh) {
			this._lh.remove();
			this._lh = null;
		}
		console.log("EditableTree currentId ", this.currentId)
		if(this.selectedItem && this.selectedItem.path==this.currentId) {
			this._setSelection();
			return;
		}
		var d = new Deferred();
		d.then(lang.hitch(this,function(){
			this._checkTruncate(this.currentId);
			this._setSelection();
		}));
		if(!this._loaded) {
			var h = aspect.after(this,"onLoad",function(){
				h.remove();
				d.resolve();
			})
		} else {
			d.resolve();
		}
	},
	onLoad:function(){
		this._loaded = true;
	},
	postCreate:function(){
		if(!this.formProperties) this.formProperties = {};
		this.toaster = new Toaster();
		this.addEditableInterface();
		this.own(
			this.watch("locale",function(){
				console.log("EditableTree locale ",this.model.locale,this.locale,this.model.loaded)
				if(this._lh) {
					this._lh.remove();
					this._lh = null;
				}
				this.model.locale = this.locale;
				this.rebuild();
				this.loadFromId();
			}),
			this.watch("currentId",this.loadFromId),
			this.watch("newData",function(){
				// TODO: how to see where new child needs to enter parent?
				// path will work but parentid maybe better
				var data = this.newData;
				this.newData = null;
				this.search(data.id, [], this.model.root, "id", "id").then(lang.hitch(this,function(result){
					if(result) {
						var found = this._found;
						if(found) {
							data.__parent = found.__parent;
							this.model.onChange(data);
							if(data.children || found.children) {
								this.model.onSet(data);
							}
						}
					} else {
						// it will be new
						// get parent:
						var par = data.path.split("/");
						par.pop();
						var ppath = par.join("/");
						this.search(ppath, [], this.model.root, "path", "id").then(lang.hitch(this,function(result){
							if(result) {
								var found = this._found;
								if(found) {
									console.log("found",found)
								}
							}
						}));
					}
				}));
			}),
			this.watch("updated",function(prop,oldValue,newValue){
				this.updated = null;
				var update = lang.mixin({},newValue);
				var model = update.model;
				delete update.model;
				// FIXME hack for model filter
				if(model !== "Page") return;
				var res = this.model.store.get(update.id);
				var save = lang.hitch(this,function(item) {
					this.model.store.put(item);
				});
				if(res.then) {
					res.then(function(item){
						save(lang.mixin(item,update));
					});
				} else {
					save(lang.mixin(res,update));
				}
			})
		);
		this.inherited(arguments);
	},
	_onSubmit:function(data){
		var self = this;
		var type = data.type;
		var name = data.name;
		var m = this.model;
		var k;
		// get the real item!
		var res = m.store.get(this.selectedItem.id);
		var create = lang.hitch(this,function(item){
			if(!item || !m.isItem(item)) return;
			for(k in data) {
				// it may be a group
				// make all booleans explicit
				if(lang.isArray(data[k])) {
					if(data[k].length==0) {
						data[k] = false;
					} else if(data[k].length<2) {
						data[k] = data[k][0];
					}
				}
				if(!data[k]) delete data[k];
			}
			var node = this.getNodesByItem(item)[0];
			if(data.id) {
				// just update
				// only copy children + path + __parent:
				// if __loaded is not present the children will be reloaded
				data.path = item.path;
				if(item.parent) data.parent = item.parent;
				if(item.children) data.children = item.children;
				node.item = item = data;
				node.set("label",item.name);
				m.store.put(item).then(function(item){
					self.toaster.setContent("Item saved successfully");
					self.toaster.show();
					self.onClick(node.item,node);
				});
			} else {
				var duplicate = false;
				var clen = item.children ? item.children.length : 0;
				for(var i=0;i<clen;i++) {
					if(item.children[i].name==name) {
						duplicate=true;
						break;
					}
				}
				if(duplicate) {
					alert("Page '"+name+"' already exists on this level. Please choose another name");
					return;
				}
				data.path = (item.path ? item.path+"/" : "")+name;
				// generated id from persevere is used
				m.store.put(data,{parent:item});
			}
		});
		if(res.then) {
			res.then(create);
		} else {
			create(res);
		}
	},
	submit:function(data){
		this._onSubmit(data);
	},
	addEditableInterface:function(){
		if(!this.checkEditAcceptance()) return;
		var self = this;
		this.dialog = new Dialog({
			title: this.newLabel,
			style: "width:500px; height:auto;text-align:left;"
		});
		this.form = new Builder(lang.mixin({
			cancel:function(){
				self.dialog.hide();
			},
			submit: function(){
				if(!this.validate()) return;
				var form = this;
				self.dialog.hide();
				var data = this.get("value");
				self.submit(data);
			}
		},this.formProperties)).placeAt(this.dialog.containerNode);
		this.form.startup();
		this.own(
			aspect.after(this.model,"onNew",lang.hitch(this,function(item){
				this.onActivate(item);
			}),true),
			aspect.after(this.model, "onChange",lang.hitch(this,function(item){
				this.onActivate(item);
			}),true),
			on(this.domNode,"mousedown",lang.hitch(this,function(evt){
				if(evt.button!=2 || evt.target==this.rootNode) return true;
				this.set('selectedNode',this.rootNode);
				this.onContextClick(this.rootNode.item,this.rootNode);
				event.stop(evt);
			}))
		);
	},
	_createTreeNode: function(args) {
		var node = new TreeNode(args);
		return node;
	},
	_addRootNode:function(){
		this.form.rebuild({
			controls:[{
	  			type:"select",
	  			name: "type",
	  			description:"Note: there may be only one content container and its name must be 'content'.",
	  			style: "width:100px"
	  		}, {
	  			type:"input",
	  			name:"name",
	  			required:true
	  		}, {
	  			type:"hidden",
	  			name:"locale",
	  			value:this.locale
	  		}],
		  	submit:{
		  		label:"Create"
		  	}
		});
		this.dialog.set("title",this.newLabel+" a new container for locale "+this.locale);
		this.dialog.show();
	},
	createForm: function(item) {
		item = item || {};
		this.form.rebuild({
			controls:[{
	  			type:"select",
	  			controller:true,
	  			value: (item ? item.type : "page"),
	  			name: "type",
	  			style: "width:100px",
	  			options:[{
  					id:"page",
  					controls: [{
						type:"checkbox",
						name:"hidden",
						value:item.hidden || false
  					}]
  				}]
	  		},{
	  			type:"input",
	  			name:"name",
	  			value:(item ? item.name : null),
	  			required:true
	  		},{
	  			type:"hidden",
	  			name:"id",
	  			value:item ? item.id : null
	  		},{
	  			type:"hidden",
	  			name:"locale",
	  			value:this.locale
	  		}],
		  	submit:{
		  		label:(item ? "Save" : "Create")
		  	}
		});
	}
});

Tree._TreeNode = TreeNode;

return Tree;

});