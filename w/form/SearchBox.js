define([
	"dojo/_base/declare",
	"dojo/topic",
	"dijit/form/Button",
	"dijit/form/TextBox"
],function(declare,topic,Button,TextBox){
return declare("dlagua.w.form.SearchBox",[TextBox],{
	buttonLabel:"",
	filterProperty:"",
	filterName:"",
	publishOnCreation:false,
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
		if(this.publishOnCreation) self.publishFilters();
		this.button = new Button({
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
		topic.publish("/components/"+this.id,filters);
	},
	onChange:function(evt){
		this.publishFilters();
	}
});

});