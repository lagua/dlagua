define([
	"dojo/_base/declare",
	"dijit/MenuItem"
],function(declare,MenuItem) {
	return declare("dlagua.w.MenuItem",[MenuItem],{
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