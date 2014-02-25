define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dlagua/w/layout/_ScrollableServicedPane",
	"dlagua/w/layout/_FormMixin",
	"dlagua/w/Subscribable"
], function(declare,lang, _SSP, _FormMixin, Subscribable) {
	
	return declare("dlagua.w.layout.FormPane",[_SSP,_FormMixin, Subscribable],{});

});