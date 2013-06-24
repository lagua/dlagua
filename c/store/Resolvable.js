define(["dojo/_base/declare","dojo/_base/lang","dojo/Deferred","dojo/store/JsonRest", "dojo/store/Observable"], function(declare,lang,Deferred,JsonRest,Observable) {
	return declare("dlagua.c.store.Resolvable",[JsonRest,Observable],{
		childrenAttr:"children",
		getChildren:function(item){
			var d = new Deferred();
			d.resolve(item[this.childrenAttr]);
			return d;
		}
	});
});