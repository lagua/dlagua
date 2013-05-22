define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/query",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/registry",
	"dijit/_WidgetBase",
	"dijit/_Container",
	"dijit/_Contained",
	"dijit/Destroyable",
	"dlagua/c/Subscribable"
], function(declare, lang, array, query, domAttr, domClass, domConstruct, registry, _WidgetBase, _Container, _Contained, Destroyable, Subscribable) {
	var Base = declare("dlagua.w.Base",[_WidgetBase, _Container, _Contained, Destroyable, Subscribable],{
	});
	return Base;
});