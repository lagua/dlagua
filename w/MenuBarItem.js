define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/query",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dijit/MenuBarItem",
	"dlagua/w/Transformable"
],function(declare,lang,array,query,domConstruct,domAttr,domClass,MenuBarItem,Transformable) {
	return declare("dlagua.w.MenuBarItem",[MenuBarItem,Transformable],{
		selected:false,
		item:null,
		postCreate:function(){
			if(this.item && this.item.hidden) this.domNode.style.display = "none";
			this.inherited(arguments);
		},
		_setSelected: function(selected){
			// override to prevent selecting hovered+focused nodes
		}
	});
});