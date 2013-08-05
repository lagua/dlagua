define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"dijit/form/FilteringSelect",
	"dlagua/w/Subscribable"
],function(declare,lang,topic,FilteringSelect,Subscribable){

	return declare("dlagua.w.form.PublishSelect",[FilteringSelect,Subscribable],{
		startup:function(){
			this.own(
				this.watch("currentId",function(){
					var id = this.currentId.split("/").pop();
					this.set("value",id);
				})
			);
			this.inherited(arguments);
		},
		onMouseUp:function(){
			if(this.toSelect) {
				dijit.selectInputText(this.focusNode);
				this.toSelect = false;
			}
		},
		onChange:function(){
			if(this.value && this.displayedValue.length>1) {
				topic.publish("/components/"+this.id,this.item);
			}
		}
	});

});
