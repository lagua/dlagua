dojo.provide("dlagua.w.layout.ScrollableServicedPaneItem");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Contained");
dojo.require("dlagua.w.layout.TemplaMixin");

dojo.declare("dlagua.w.layout.ScrollableServicedPaneItem", [dijit._Widget, dijit._Templated, dijit._Contained, dlagua.w.layout.TemplaMixin], {
	parent:null, //quickref to parent widget
	data:null,
	itemHeight:null,
	marginBox:null,
	parseOnLoad:true,
	baseClass:"dlaguaScrollableServicedPaneItem",
	templateString: '<div style="height:${itemHeight};opacity:0;" dojoAttachPoint="containerNode"></div>',
	onLoad:function(){
		// you know what to do...
	},
	startup:function(){
		if(this._started) return;
		if(!this.data) {
			this._started = true;
			this.onLoad();
			return;
		}
		this._load().then(dojo.hitch(this,this.onLoad));
	},
	resizeChildren: function(){
		var box = this.marginBox;
		dojo.style(this.containerNode.firstChild, {
			width: box.w +'px',
			height: box.h + 'px'
		});
	},
	_setContentAttr: function(/*String|DomNode|Nodelist*/data){
		this._setContent(data || "");
		setTimeout(dojo.hitch(this,function(){
			if(!this.containerNode) {
				if(this._contentDeferred) this._contentDeferred.callback(false);
				return;
			}
			this.marginBox = dojo.marginBox(this.containerNode);
			if(this._contentDeferred) {
				var parent = (this.parent || this.getParent());
				if(!(parent && parent.hasDeferredContent)) this._contentDeferred.callback(true);
			}
		}),1);
	},
	updateLayout:function() {
		if(!this || !this.containerNode) return;
		this.marginBox = dojo.marginBox(this.containerNode);
		var parent = (this.parent || this.getParent());
		if(parent && parent.useScrollBar) parent.showScrollBar();
		if(this._contentDeferred) this._contentDeferred.callback(true);
	}
});
