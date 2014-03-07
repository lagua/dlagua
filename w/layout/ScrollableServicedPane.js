//TODO:
/* take apart ScrollablePane and _ServicedMixin
 * make services require plugin RPCs
 * take out skip / autofire / timer and add param for plugin
 * dynamic loading of modules:
 * make JSON / ATOM / XML pluggable, require first
 */
define([
	"dojo/_base/declare",
	"dlagua/w/layout/_ScrollableServicedPane",
	"dlagua/w/layout/_FormMixin",
	"dlagua/w/layout/_ModelMixin",
	"dlagua/w/layout/_PageKeysMixin",
	"dlagua/w/layout/_PagedMixin",
	"dlagua/w/Subscribable"
],function(declare,_SSP,_FormMixin,_ModelMixin,_PageKeysMixin,_PagedMixin,Subscribable){
return declare("dlagua.w.layout.ScrollableServicedPane",[_SSP, _FormMixin, _ModelMixin, _PageKeysMixin, _PagedMixin, Subscribable],{

});

});
