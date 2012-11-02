dojo.provide("dlagua.w.layout.TabContainer");
dojo.require("dijit.layout.TabContainer");

// dijit tabcontainer disabled extension:
// note: requires an extra check on disabled in
// dojo/dijit/layout/StackController.js => onButtonClick event
dojo.declare("dlagua.w.layout.TabContainer",[dijit.layout.TabContainer], {
	isContainer:true,
	_setupChild:function(child){
		dojo.addClass(child.domNode,"dijitTabPane");
		this.inherited(arguments);
		dojo.mixin(child, {
			disable:function(bool){
				if(bool==undefined) bool = false;
				this.disabled = bool;
				this.controlButton.set("disabled", bool);
				if(bool) {
					this.controlClick = this.controlButton.onClick;
					this.controlButton.onClick = function(){};
				} else {
					this.controlButton.onClick = this.controlClick;
				}
				dojo[(this.disabled ? "addClass" : "removeClass")](this.controlButton.domNode, "dijitDisabled");
				dojo.style(this.domNode, "display", (this.disabled ? "none" : "block"));
			}
		});
	}
});