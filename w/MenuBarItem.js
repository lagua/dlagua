dojo.provide("dlagua.w.MenuBarItem");
dojo.require("dijit.MenuBarItem");
dojo.declare("dlagua.w.MenuBarItem",[dijit.MenuBarItem],{
	selected:false,
	item:null,
	postCreate:function(){
		if(this.item.hidden) this.domNode.style.display = "none";
		this.inherited(arguments);
	},
	select: function(selected){
		this.selected = selected;
		// summary:
		//		Indicate that this node is the currently selected one
		dojo.toggleClass(this.domNode, "dijitMenuItemSelected", selected);
	},
	_setSelected: function(selected){
		// this overwrites selected in dijit
		// summary:
		//		Indicate that this node is the currently selected one
		// tags:
		//		private

		/***
		 * TODO: remove this method and calls to it, when _onBlur() is working for MenuItem.
		 * Currently _onBlur() gets called when focus is moved from the MenuItem to a child menu.
		 * That's not supposed to happen, but the problem is:
		 * In order to allow dijit.popup's getTopPopup() to work,a sub menu's popupParent
		 * points to the parent Menu, bypassing the parent MenuItem... thus the
		 * MenuItem is not in the chain of active widgets and gets a premature call to
		 * _onBlur()
		 */

		dojo.toggleClass(this.domNode, "dijitMenuItemFocus", selected);
	}
});