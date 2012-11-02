dojo.provide("dlagua.w.form.UpdateCountButton");
dojo.require("dijit.form.Button");
dojo.declare("dlagua.w.form.UpdateCountButton",[dijit.form.Button],{
	// TODO: localize
	count:0,
	currentItem:null,
	buffer:null,
	baseClass:"dlaguaUpdateCountButton",
	postCreate:function() {
		this.buffer = [];
		console.log(arguments)
		this.watch("currentItem",function(){
			if(this.currentItem) {
				this.count++;
				this.buffer.push(dojo.clone(this.currentItem));
			} else {
				this.count = 0;
			}
			this.set("disabled",this.count==0);
			var lt = (this.count==1 ? "1 nieuw bericht" : this.count+" nieuwe berichten");
			this.set("label",lt);
		})
		this.inherited(arguments);
	},
	onClick:function(){
		this.set("currentItem",null);
		dojo.publish("/components/"+this.id,[this.buffer]);
		this.buffer = [];
	}
});