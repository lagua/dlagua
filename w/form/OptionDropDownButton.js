define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/aspect",
	"dojo/topic",
	"dojo/request",
	"dijit/TooltipDialog",
	"dijit/form/DropDownButton",
	"dijit/form/Button",
	"dijit/form/Select",
	"dijit/form/CheckBox",
	"dlagua/c/Subscribable",
	"dforma/Group",
	"dforma/Label"
],function(declare,lang,array,aspect,topic,request,TooltipDialog,DropDownButton,Button,Select,CheckBox,Subscribable,Group,Label){

return declare("dlagua.w.form.OptionDropDownButton",[DropDownButton],{
	baseClass:"dlaguaOptionDropDownButton",
	options:null,
	href:null,
	contentgroup:null,
	sortgroup:null,
	filtergroup:null,
	_removeOptions:function(){
		array.forEach(this.filtergroup.getChildren(),function(n){
			n.destroyRecursive();
		});
		array.forEach(this.sortgroup.getChildren(),function(n){
			n.destroyRecursive();
		});
	},
	destroyRecursive:function(){
		this._removeOptions();
		this.inherited(arguments);
	},
	_addOptions:function(options){
		var self = this;
		var widgetid = this.id;
		this.contentgroup = new Group({
			"class":"dlaguaOptionDropDownContent"
		});
		this.contentgroup.placeAt(this.dropDown.containerNode);
		for(var k in options) {
			var ops = options[k];
			var j,l;
			switch(k) {
			case "filters":
				var filters = lang.clone(ops);
				this.filtergroup = new Group({
					"class":"dlaguaOptionDropDownFilters",
					label:"Filters:"
				});
				this.contentgroup.addChild(this.filtergroup);
				for(j in filters) {
					var f = filters[j];
					l = new Label({
						label:f.label,
						child:new CheckBox({
							name:j,
							checked:f.checked,
							onChange:function(checked){
								filters[this.name].checked = checked;
								topic.publish("/components/"+widgetid+"/filters",filters);
							}
						})
					});
					this.filtergroup.addChild(l);
				}
			break;
			case "sorting":
				var sorting = lang.clone(ops);
				this.sortgroup = new Group({
					"class":"dlaguaOptionDropDownSorting",
					label:"Sorting:"
				});
				this.contentgroup.addChild(this.sortgroup);
				var s = new Select({
					onChange:function(val){
						topic.publish("/components/"+widgetid+"/sorting",sorting[val].sort);
					}
				});
				for(j in sorting) {
					s.addOption({
						label:sorting[j].label,
						value:j
					});
				}
				// TODO: localize
				l = new Label({
					label:"Order by",
					child:s
				});
				this.sortgroup.addChild(l);
				break;
			case "events":
				var events = lang.clone(ops);
				this.eventgroup = new Group({
					"class":"dlaguaOptionDropDownEvents",
					label:"Events:"
				});
				this.contentgroup.addChild(this.eventgroup);
				for(j in events) {
					l = new Button({
						label:events[j].label,
						event:events[j].event,
						onClick:function(){
							topic.publish("/components/"+widgetid+"/events",this.event);
						}
					});
					this.eventgroup.addChild(l);
				}
				break;
			default:
				break;
			}
		}
	},
	postCreate:function() {
		this.dropDown = new TooltipDialog();
		var self = this;
		if(this.href) dropdown.set("href",this.href);
		if(this.options) {
			if(typeof this.options === "string") {
				request(this.options,{
					handleAs:"json"
				}).then(function(res,io){
					if(res) self._addOptions(res);
				});
			} else {
				self._addOptions(this.options);
			}
		}
		var _ch = this.own(
			aspect.after(this.dropDown,"onOpen",lang.hitch(this,function(){
				_ch.remove();
				this.contentgroup.startup();
			}))
		)[0];
		this.inherited(arguments);
	}
});

});