dojo.provide("dlagua.w.form.NumberSpinner");
dojo.require("dijit.form.NumberSpinner");
dojo.declare("dlagua.w.form.NumberSpinner", [dijit.form.NumberSpinner], {
	postCreate: function(){
		if(dojo.isIE){ // IE INPUT tag fontFamily has to be set directly using STYLE
			// the setTimeout gives IE a chance to render the TextBox and to deal with font inheritance
			setTimeout(dojo.hitch(this, function(){
			if(!this.domNode) return;
			var s = dojo.getComputedStyle(this.domNode);
			if(s){
				var ff = s.fontFamily;
				if(ff){
					var inputs = this.domNode.getElementsByTagName("INPUT");
					if(inputs){
						for(var i=0; i < inputs.length; i++){
							inputs[i].style.fontFamily = ff;
						}
					}
				}
			}
			}), 0);
		}

		// setting the value here is needed since value="" in the template causes "undefined"
		// and setting in the DOM (instead of the JS object) helps with form reset actions
		this.textbox.setAttribute("value", this.textbox.value); // DOM and JS values should be the same

		this.inherited(arguments);

		if(dojo.isMoz || dojo.isOpera){
			this.connect(this.textbox, "oninput", "_onInput");
		}else{
			this.connect(this.textbox, "onkeydown", "_onInput");
			this.connect(this.textbox, "onkeyup", "_onInput");
			this.connect(this.textbox, "onpaste", "_onInput");
			this.connect(this.textbox, "oncut", "_onInput");
		}
	},
	onKeypress:function(e) {
		if(e.charOrCode == dojo.keys.ENTER){
	    	this.focusNode.blur();
	    }
	}
});