define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/aspect",
	"dojo/when",
	"dojo/io-query",
	"dojo/store/Memory",
	"dojo/store/Cache",
	"dojo/store/Observable",
	"dlagua/w/tree/SimpleQueryEngine",
	"dijit/tree/ObjectStoreModel"
],function(declare,lang,array,Deferred,aspect,when,ioQuery,Memory,Cache,Observable,SimpleQueryEngine,ObjectStoreModel){
return declare("dlagua.w.tree.TreeStoreModel", [ObjectStoreModel], {
	root : null,
	store: null,
	loaded:false,
	rootId : "",
	rootType:"locale",
	locale:"",
	parentAttr: "__parent",
	showOnlyChildren : false,
	labelAttr: "name",
	idProperty:"id",
	_loading:false,
	cancelLoading:false,
	deferItemLoadingUntilExpand:true,
	constructor : function(args) {
		lang.mixin(this, args);
		if(this.rootId) {
			this.query = {
				id:this.rootId
			};
		} else if(this.rootType) {
			this.query = {
				type:this.rootType
			};
			if(this.locale) this.query.locale = this.locale;
		}
		var store = lang.mixin(this.store,{
			queryEngine:SimpleQueryEngine,
			getChildren: function(item) {
				// TODO use item.children._ref;
				var res = this.query({parent:item.id},{parent:item});
				if(item.childorder) {
					when(res,function(children){
						children.sort(function(a,b){
							return item.childorder.indexOf(a.id) - item.childorder.indexOf(b.id);
						});
					});
				}
				return res;
			}
		});
		var self = this;
		aspect.around(store,"remove",function(remove){
			return function(id,options){
				options = options || {};
				if(options.parent) {
					var parent = options.parent;
					var i = 0,l = parent.childorder.length;
					for(;i<l;i++) {
						if(id==parent.childorder[i]) break;
					}
					parent.childorder.splice(i,1);
					store.put.call(this,parent,{overwrite:true});
				}
				return remove.call(this,id,options);
			}
		});
		aspect.around(store,"put",function(put){
			return function(item,options){
				options = options || {};
				var parent = options.parent ? options.parent : null;
				if(parent) {
					item.parent = parent.id;
					if(parent.path && item.name) {
						item.path = parent.path+"/"+item.name;
					}
				}
				var res = put.call(store,item,options);
				var i = 0, l = 0;
				if(options.oldParent && item.id) {
					var oldParent = options.oldParent;
					i = 0, l = oldParent.childorder.length;
					for(;i<l;i++) {
						if(oldParent.childorder[i] == item.id) break;
					}
					oldParent.childorder.splice(i,1);
					if(oldParent!=parent) store.put.call(this,oldParent,{overwrite:true});
				}
				if(parent) {
					when(res,function(item){
						if(!parent.childorder) parent.childorder = [];
						if(options.before) {
							i = 0, l = parent.childorder.length;
							for(;i<l;i++) {
								if(parent.childorder[i] == options.before.id) break;
							}
							parent.childorder.splice(i,0,item.id);
						} else {
							parent.childorder.push(item.id);
						}
						store.put.call(store,parent,{overwrite:true});
					});
				}
				return res;
			}
		});
		var master = new Observable(store);
		this.store = new Cache(master,new Memory({idProperty:"id"}));
	},
	getParent:function(item,callback,errback){
		if(item.parent) {
			var res = this.store.get(item.parent);
			if(res.then) {
				res.then(callback);
			} else {
				callback(res);
			}
		} else {
			errback("No parent item found!");
		}
	},
	mayHaveChildren : function(item) {
		return item ? item.hasOwnProperty("childorder") : false;
	},
	isItem: function(item){
		return (typeof item == 'object') && item && !(item instanceof Date);
	}
});
});