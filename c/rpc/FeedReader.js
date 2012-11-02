define("dlagua/c/rpc/FeedReader", ["dojo", "dlagua/c/Subscribable"], function(dojo) {

dojo.declare("dlagua.c.rpc.FeedReader",[dlagua.c.Subscribable],{
	type:"atom",
	read:function(feed) {
		if(!feed) return;
		var d = new dojo.Deferred();
		dojo.xhrGet({
			url: feed,
	        handleAs: "xml",
	        headers:{"X-Requested-With":null},
	        load: dojo.hitch(this, function(response, ioArgs){
	        	d.callback(this.parse(response));
	        })
		});
		return d;
	},
	parse: function(response) {
		var items = [];
		if(this.type=="atom") {
			var entries = dojo.query("entry",response);
			entries.forEach(dojo.hitch(this,function(entry){
				items.push({
					title:this.getEntryTagValue(entry,"title"),
					author:this.getEntryAuthor(entry),
					summary:this.getEntryTagValue(entry,"summary"),
					published:this.getEntryTagValue(entry,"published"),
					content:this.getXHTMLContent(entry),
					link:this.getEntryLink(entry),
					alt_link:this.getEntryAltLink(entry)
				});
			}));
		}
		items = items.sort(function(item1,item2){
			var date1 = dojo.date.stamp.fromISOString(item1.published);
			var date2 = dojo.date.stamp.fromISOString(item2.published);
			if(date1 > date2) return -1;
			if(date1 < date2) return 1;
			return 0;
		});
		return items;
	},
	getEntryTagValue: function(entry, tagName) {
		var elements = dojo.query(tagName,entry);
		var str = "";
		elements.forEach(function(elm){
			str = elm.firstChild ? elm.firstChild.nodeValue : "";
		});
		return str;
	},
	getEntryAuthor: function(entry) {
		var elements = dojo.query("author",entry);
		var subs = ["name","email"];
		var author = {};
		var self = this;
		elements.forEach(function(elm){
			dojo.forEach(subs,function(sub){
				author[sub] = self.getEntryTagValue(elm,sub);
			});
		});
		return author;
	},
	getXHTMLContent: function(entry) {
		var elements = dojo.query("content",entry);
		var xhtml;
		elements.forEach(function(elm){
			var type = elm.getAttribute("type");
			xhtml = elm.firstChild.innerText || elm.firstChild.textContent;
		});
		return xhtml;
	},
	getEntryLink: function(entry) {
		var elements = dojo.query("link",entry);
		for(var i=0; i<elements.length; i++) {
			if (!elements[i].attributes["rel"] != "undefined") {
				// Link without ref attribute was found - return its href attribute
				return elements[i].getAttribute("href");
			}
		}
		return "";
	},
	getEntryAltLink: function(entry) {
		var elements = dojo.query("link",entry);
		// Entry may contain multiple link elements - get link element with rel="alternate"
		for (i=0; i<elements.length; i++) {
			if (elements[i].getAttribute("rel") == "alternate" && elements[i].getAttribute("type") == "text/html") {
				return elements[i].getAttribute("href");
			}
		}
		return "";
	}
});

});