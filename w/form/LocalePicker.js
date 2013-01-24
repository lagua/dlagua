dojo.provide("dlagua.w.form.LocalePicker");

dojo.require("dijit.form.FilteringSelect");
dojo.require("dforma.Label");
dojo.require("dojo.data.ObjectStore");
dojo.require("dlagua.c.store.JsonRest");
dojo.require("dlagua.c.Subscribable");

define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/topic",
	"dojo/io-query",
	"persvr/rql/parser",
	"persvr/rql/query",
	"dijit/form/FilteringSelect",
	"dlagua/c/Subscribable"
])

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
		dojo.publish("/components/"+this.id,[val]);
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
		this.store = new dlagua.c.store.JsonRest({
			idProperty:"id",
			target:"/persvr/Nls/"
		});
		var qo = new rqlQuery.Query();
		qo = qo["in"]("id",locales);
		query = "?"+qo.toString();
		args.value = args.locale;
		this.addWatch("currentId",function(){
			console.log(this.currentId)
		})
	}
});