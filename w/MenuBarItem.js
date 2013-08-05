define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"dijit/MenuBarItem"
],function(declare,domClass,MenuBarItem) {
	return declare("dlagua.w.MenuBarItem",[MenuBarItem],{
		selected:false,
		item:null,
		postCreate:function(){
			if(this.item && this.item.hidden) domClass.add(this.domNode,"dijitHidden");
			this.inherited(arguments);
		},
		_setSelected: function(selected){
			// override to prevent selecting hovered+focused nodes
		}
	});
});