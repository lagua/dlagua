define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"dijit/form/FilteringSelect",
	"dlagua/w/Subscribable"
],function(declare,lang,topic,FilteringSelect,Subscribable){

	return declare("dlagua.w.form.PublishSelect",[FilteringSelect,Subscribable],{
		onMouseUp:function(){
			this.inherited(arguments);
			if(this.toSelect) {
				dijit.selectInputText(this.focusNode);
				this.toSelect = false;
			}
		},
		onChange:function(){
			this.inherited(arguments);
			if(this.value && this.displayedValue.length>1) {
				topic.publish("/components/"+self.id,this.selected);
			}
		}
	});

});
