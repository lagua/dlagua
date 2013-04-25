define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dlagua/w/layout/_ScrollableServicedPane",
	"dlagua/w/layout/_XFormMixin",
	"dlagua/c/Subscribable"
], function(declare,lang, _SSP, _XFormMixin, Subscribable) {
	
	return declare("dlagua.w.layout.XFormPane",[_SSP,_XFormMixin, Subscribable],{});

});