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
	"dlagua/w/tree/RqlQueryEngine",
	"dijit/tree/ObjectStoreModel"
],function(declare,lang,array,Deferred,aspect,when,ioQuery,Memory,Cache,RqlQueryEngine,ObjectStoreModel){
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
	refAttr:"_ref",
	cancelLoading:false,
	deferItemLoadingUntilExpand:true,
	getRoot:function(){
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
		this.inherited(arguments);
	},
	constructor : function(args) {
		lang.mixin(this, args);
		var store = lang.mixin(this.store,{
			queryEngine:RqlQueryEngine,
			refAttr:this.refAttr,
			getChildren: function(item) {
				// TODO use item.children._ref;
				var res = this.query(item.children[this.refAttr],{parent:item});
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
		this.store = new Cache(store,new Memory({idProperty:"id"}));
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
		// if the item has a model, try children
		if(item && item.hasOwnProperty("childorder") && item.childorder.length>0) {
			console.log("has children",item)
			return true;
		}
	},
	isItem: function(item){
		return (typeof item == 'object') && item && !(item instanceof Date);
	}
});
});