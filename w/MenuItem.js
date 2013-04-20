define([
	"dojo/_base/declare",
	"dijit/MenuItem",
	"dlagua/w/Transformable"
],function(declare,MenuItem,Transformable) {
	return declare("dlagua.w.MenuItem",[MenuItem,Transformable],{
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