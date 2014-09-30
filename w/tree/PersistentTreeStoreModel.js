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
	"dlagua/w/tree/RqlQueryEngine",
	"dlagua/w/tree/TreeStoreModel"
],function(declare,lang,array,Deferred,aspect,when,ioQuery,Memory,Cache,Observable,RqlQueryEngine,TreeStoreModel){
return declare("dlagua.w.tree.TreeStoreModel", [TreeStoreModel], {
	constructor : function(args) {
		lang.mixin(this, args);
		var store = lang.mixin(this.store,{
			queryEngine:RqlQueryEngine,
			getChildren: function(item) {
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
	}
});
});