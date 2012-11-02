dojo.provide("dlagua.w.layout.TemplaPane");

dojo.require("dijit.layout.ContentPane");
dojo.require("dlagua.w.layout.TemplaMixin");
dojo.require("dlagua.c.store.JsonRest");

dojo.declare("dlagua.w.layout.TemplaPane",[dijit.layout.ContentPane,dlagua.w.layout.TemplaMixin],{
	template:"",
	templateModule:"",
	service:"",
	model:"",
	idProperty:"",
	schema:null,
	data:null,
	store:null,
	_getSchema:function(){
		var d = new dojo.Deferred();
		if(!this.store) {
			d.callback();
			return d;
		}
		this.store.getSchema(this.store.schemaUri).then(dojo.hitch(this,function(schema){
			this.schema = schema;
			for(var k in schema.properties) {
				if(schema.properties[k].primary) this.idProperty = k;
			}
			this.store.idProperty = this.idProperty;
			d.callback(true);
		}));
		return d;
	},
	startup: function(){
		this.inherited(arguments);
		var tpl = dojo.cache(this.templateModule,this.template);
		if(this.service && this.model) {
			this.store = new dlagua.c.store.JsonRest({
				target:this.service+"/"+this.model+"/",
				schemaUri:this.service+"/Class/"+this.model
			});
			this._getSchema().then(dojo.hitch(this,function(sxs){
				if(sxs) {
					this.store.query().then(dojo.hitch(this,function(res){
						this.data = {items:res};
						this._load().then(dojo.hitch(this,function(sxs){
							if(sxs) {
								this.applyTemplate(tpl);
							}
						}))
					}));
				}
			}))
		}
	}
});