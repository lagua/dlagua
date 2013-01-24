define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"persvr/rql/parser",
	"persvr/rql/query",
	"dijit/form/FilteringSelect",
	"dlagua/c/store/JsonRest",
	"dlagua/c/Subscribable"
],function(declare,lang,topic,rqlParser,rqlQuery,FilteringSelect,JsonRest,Subscribable){

return declare("dlagua.w.form.LocalePicker", [FilteringSelect,Subscribable], {
	locale:"",
	locale_extra:"",
	store:null,
	searchAttr:"local",
	labelAttr:"local",
	style:"width:80px",
	currentId:"",
	autoComplete:true,
	ignoreCase:true,
	required:true,
	onChange:function(val){
		if(!val) return;
		topic.publish("/components/"+this.id,val);
	},
	startup:function(){
		this.inherited(arguments);
	},
	constructor: function(args) {
		var locstr = args.locale;
		if(args.locale_extra) {
			locstr+=","+args.locale_extra;
		}
		var locales = locstr.split(",");
		this.store = new JsonRest({
			idProperty:"id",
			target:"/persvr/Nls/"
		});
		var qo = new rqlQuery.Query();
		qo = qo["in"]("id",locales);
		args.query = "?"+qo.toString();
		args.value = args.locale;
		this.own(
			this.watch("currentId",function(){
				console.log(this.currentId)
			});
		);
	}
});

});