dojo.provide("dlagua.w.form.PublishButton");
dojo.require("dijit.form.Button");
dojo.declare("dlagua.w.form.PublishButton",[dijit.form.Button],{
	data:null,
	onClick:function(){
		var data = dojo.isString(this.data) ? dojo.fromJson(this.data) : this.data;
		dojo.publish("/components/"+this.id,[data]);
	}
});