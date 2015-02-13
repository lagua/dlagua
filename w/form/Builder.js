define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dforma/Builder"
],function(declare,lang,Builder) {
	
	return declare("dlagua.w.form.Builder",[Builder],{
		controlModuleMapper:function(c){
			var req = this.inherited(arguments);
			switch(c.type){
				case "carousel":
					req = "dlagua/w/form/CarouselSelect";
				break;
				case "lookup":
					req = "dijit/form/FilteringSelect";
				break;
			}
			return req;
		}
	});
});