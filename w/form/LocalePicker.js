define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"dojo/aspect",
	"dojo/request",
	"dojo/when",
	"dojo/io-query",
	"dojo/store/JsonRest",
	"rql/parser",
	"dijit/form/FilteringSelect",
	"dlagua/w/Subscribable"
],function(declare,lang,topic,aspect,request,when,ioQuery,JsonRest,rqlParser,FilteringSelect,Subscribable){
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
		var locales = locstr.split(",");
		var store = args.store || new JsonRest({
			idProperty:"id",
			target:"model/Nls/"
		});
		var pageStore = new JsonRest({
			idProperty:"id",
			target:"model/Page/"
		});
		aspect.around(store,"query",function(oriQuery){
			return function(query, options){
				var qo = new rqlParser.parseQuery(ioQuery.objectToQuery(query));
				return when(pageStore.query("?type=locale"),function(res){
					res.forEach(function(item){
						if(locales.indexOf(item.locale)==-1) {
							locales.push(item.locale);
						}
					});
					qo = qo["in"]("id",locales);
					return oriQuery.call(store,"?"+qo.toString(),options);
				});
			}
		});
		args.store = store;
		args.value = args.locale;
		this.own(
			this.watch("currentId",function(){
				console.log(this.currentId)
			})
		);
		lang.mixin(this,args);
		this.inherited(arguments);
	}
});

return LocalePicker;

});