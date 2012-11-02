dojo.provide("dlagua.w.form.SearchBox");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.TextBox");
dojo.declare("dlagua.w.form.SearchBox",[dijit.form.TextBox],{
	buttonLabel:"",
	filterProperty:"",
	filterName:"",
	intermediateChanges:true,
	wildcard:true,
	button:null,
	baseClass:"dlaguaSearchBox",
	destroy:function(){
		this.button.destroy();
		this.inherited(arguments);
	},
	postCreate: function(){
		var self = this;
		self.publishFilters();
		this.button = new dijit.form.Button({
			label:this.buttonLabel,
			onClick:function(){
				self.publishFilters();
			}
		});
		this.button.placeAt(this.domNode,"last");
		this.inherited(arguments);
	},
	publishFilters:function(){
		var filters = {};
		var val = this.get("value")+(this.wildcard ? "*" : "");
		filters[this.filterName] = {
			filter:this.filterProperty+"="+val,
			checked:(!!val)
		};
		dojo.publish("/components/"+this.id,[filters]);
	},
	onChange:function(evt){
		this.publishFilters();
	}
});