define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dlagua/c/rpc/FeedReader"
],function(declare,lang,array,FeedReader) {

	return declare("dlagua.w.layout._AtomMixin", [], {
		rebuild:function(item) {
			this.inherited(arguments);
			if(this.servicetype=="atom") {
				var fr = new FeedReader();
	        	fr.read(item.service+"/"+item.path).then(lang.hitch(this,function(items){
	        		var total = items.length;
	        		this.total = total;
					if(total===0 || isNaN(total)) {
						this.onReady();
					} else {
						array.forEach(items,this.addItem,this);
					}
	        	}));
			}
		}
	});
	
});