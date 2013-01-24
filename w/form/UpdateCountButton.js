define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"dijit/form/Button"
],function(declare,lang,topic,Button){
return declare("dlagua.w.form.UpdateCountButton",[Button],{
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
				this.buffer.push(lang.clone(this.currentItem));
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
		topic.publish("/components/"+this.id,this.buffer);
		this.buffer = [];
	}
});

});