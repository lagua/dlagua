define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-construct",
	"dojo/request",
	"dforma/List"
],function(declare,lang,domConstruct,request,List){

	return declare("dlagua.w.form.List",[List],{
	 	startup:function(){
	 		if(this._started) return;
			// TODO move to domain-specific widget
			this.addButton.set("showLabel",false);
			this.addButton.set("iconClass","dlaguaListAddButtonIcon");
			this.addButton.iconNode.innerHTML = "+";
			request("/rest/resources/shirt.svg").then(lang.hitch(this,function(res){
				domConstruct.create("span",{
					innerHTML:res,
					style:"height:240px;margin-left:-130px;"
				},this.addButton.containerNode,"before");
			}));
			this.inherited(arguments);
	 	}
	});
	
});