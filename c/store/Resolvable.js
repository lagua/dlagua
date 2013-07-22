define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/store/JsonRest",
	"dojo/store/Observable"
], function(declare,lang,array,Deferred,JsonRest,Observable) {
	return declare("dlagua.c.store.Resolvable",[JsonRest,Observable],{
		childrenAttr:"children",
		getChildren:function(item){
			var d = new Deferred();
			var children = array.map(item[this.childrenAttr],function(_){
				_.__parent = item;
				if(_[this.childrenAttr]) {
					this.getChildren(_).then(function(c){
						_.children = c;
					});
				}
				return _;
			},this);
			d.resolve(children);
			return d;
		}
	});
});