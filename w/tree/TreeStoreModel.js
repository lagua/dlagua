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
	"dlagua/w/tree/SimpleQueryEngine",
	"dijit/tree/ObjectStoreModel"
],function(declare,lang,array,Deferred,aspect,when,ioQuery,Memory,Cache,SimpleQueryEngine,ObjectStoreModel){
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
		return item ? item.hasOwnProperty("childorder") : false;
	},
	isItem: function(item){
		return (typeof item == 'object') && item && !(item instanceof Date);
	}
});
});