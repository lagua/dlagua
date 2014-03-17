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
	"dijit/tree/ObjectStoreModel"
],function(declare,lang,array,Deferred,aspect,when,ioQuery,Memory,Cache,Observable,ObjectStoreModel){
return declare("dlagua.w.tree.TreeStoreModel", [ObjectStoreModel], {
	root : null,
	store: null,
	loaded:false,
	rootId : "",
	rootType:"locale",
	locale:"",
	childrenAttr : "children",
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
		var childrenAttr = this.childrenAttr;
		var store = lang.mixin(this.store,{
			getChildren: function(item) {
				// TODO use item.children._ref;
				var res = this.query({parent:item.id});
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
					var parent = lang.mixin({},options.parent);
					delete parent.children;
					var childorder = [];
					array.forEach(parent.childorder,function(cid){
						if(cid!=id) childorder.push(cid);
					});
					if(childorder.length) {
						parent.childorder = childorder;
					} else {
						delete parent.childorder;
					}
					store.put.call(this,parent,{overwrite:true});
				}
				return remove.call(this,id,options);
			}
		});
		aspect.around(store,"put",function(put){
			return function(item,options){
				options = options || {};
				if(options.parent) item.parent = options.parent.id;
				delete item.children;
				var res = put.call(store,item,options);
				if(options.parent) {
					var parent = lang.mixin({},options.parent);
					delete parent.children;
					when(res,function(item){
						if(!parent.childorder) parent.childorder = [];
						parent.childorder.push(item.id);
						store.put.call(store,parent,{overwrite:true});
					});
				}
				return res;
			}
		});
		var master = new Observable(store);
		this.store = new Cache(master,new Memory({idProperty:"id"}));
	},
	getParent:function(item){
		var d = new Deferred();
		if(item.parent) {
			var res = this.store.get(item.parent);
			if(res.then) return res;
			d.resolve(res);
		} else {
			d.reject("No parent item found!");
		}
		return d;
	},
	mayHaveChildren : function(item) {
		return item ? item.hasOwnProperty("childorder") : false;
	},
	isItem: function(item){
		return (typeof item == 'object') && item && !(item instanceof Date);
	}
});
});