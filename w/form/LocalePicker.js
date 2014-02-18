define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"dojo/io-query",
	"dojo/store/JsonRest",
	"rql/parser",
	"rql/query",
	"dijit/form/FilteringSelect",
	"dlagua/w/Subscribable"
],function(declare,lang,topic,ioQuery,JsonRest,rqlParser,rqlQuery,FilteringSelect,Subscribable){
var LocaleRest = declare("dlagua.c.store.LocaleRest",[JsonRest],{
	locales:null,
	idProperty:"id",
	target:"/model/Nls/",
	query: function(query, options){
		var qo = new rqlParser.parseQuery(ioQuery.objectToQuery(query));
		qo = qo["in"]("id",this.locales);
		query = "?"+qo.toString();
		arguments[0] = query;
		return this.inherited(arguments);
	}
});
var LocalePicker = declare("dlagua.w.form.LocalePicker", [FilteringSelect,Subscribable], {
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
	constructor: function(args) {
		var locstr = args.locale;
		if(args.locale_extra) {
			locstr+=","+args.locale_extra;
		}
		this.store = new LocaleRest({
			locales: locstr.split(",")
		});
		args.value = args.locale;
		this.own(
			this.watch("currentId",function(){
				console.log(this.currentId)
			})
		);
	}
});

return LocalePicker;

});