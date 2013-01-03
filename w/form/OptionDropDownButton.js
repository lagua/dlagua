dojo.provide("dlagua.w.form.OptionDropDownButton");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.CheckBox");
dojo.require("dforma.Group");
dojo.require("dforma.Label");
dojo.declare("dlagua.w.form.OptionDropDownButton",[dijit.form.DropDownButton],{
	baseClass:"dlaguaOptionDropDownButton",
	options:null,
	href:null,
	contentgroup:null,
	sortgroup:null,
	filtergroup:null,
	_removeOptions:function(){
		dojo.forEach(this.filtergroup.getChildren(),function(n){
			n.destroyRecursive();
		});
		dojo.forEach(this.sortgroup.getChildren(),function(n){
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
		this.contentgroup = new dforma.Group({
			"class":"dlaguaOptionDropDownContent"
		}).placeAt(this.dropDown.containerNode);
		for(var k in options) {
			var ops = options[k];
			var j,l;
			switch(k) {
			case "filters":
				var filters = dojo.clone(ops);
				this.filtergroup = new dforma.Group({
					"class":"dlaguaOptionDropDownFilters"
				});
				this.contentgroup.addChild(this.filtergroup);
				for(j in filters) {
					var f = filters[j];
					l = new dforma.Label({
						label:f.label,
						child:new dijit.form.CheckBox({
							name:j,
							checked:f.checked,
							onChange:function(checked){
								filters[this.name].checked = checked;
								dojo.publish("/components/"+widgetid+"/filters",[filters]);
							}
						})
					});
					this.filtergroup.addChild(l);
				}
			break;
			case "sorting":
				var sorting = dojo.clone(ops);
				this.sortgroup = new dforma.Group({
					"class":"dlaguaOptionDropDownSorting"
				});
				this.contentgroup.addChild(this.sortgroup);
				var s = new dijit.form.Select({
					onChange:function(val){
						dojo.publish("/components/"+widgetid+"/sorting",[sorting[val].sort]);
					}
				});
				for(j in sorting) {
					s.addOption({
						label:sorting[j].label,
						value:j
					});
				}
				// TODO: localize
				l = new dforma.Label({
					label:"Sorteren:",
					child:s
				});
				this.sortgroup.addChild(l);
				break;
			default:
				break;
			}
		}
	},
	postCreate:function() {
		this.dropDown = new dijit.TooltipDialog();
		var self = this;
		if(this.href) dropdown.set("href",this.href);
		if(this.options) {
			if(dojo.isString(this.options)) {
				dojo.xhrGet({
					url:this.options,
					handleAs:"json",
					load:function(res,io){
						if(res) self._addOptions(res);
					}
				});
			} else {
				self._addOptions(this.options);
			}
		}
		var _ch = dojo.connect(this.dropDown,"onOpen",this,function(){
			dojo.disconnect(_ch);
			this.contentgroup.startup();
		});
		this.inherited(arguments);
	}
});