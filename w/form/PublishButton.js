define([
	"dojo/_base/declare",
	"dojo/_base/json",
	"dojo/topic",
	"dijit/form/Button"
],function(declare,djson,topic,Button){

return declare("dlagua.w.form.PublishButton",[Button],{
	data:null,
	onClick:function(){
		var data = (typeof this.data === "string") ? djson.fromJson(this.data) : this.data;
		topic.publish("/components/"+this.id,data);
	}
});

});