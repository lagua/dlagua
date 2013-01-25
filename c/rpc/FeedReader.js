define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Deferred",
	"dojo/request",
	"dojo/query",
	"dojo/date/stamp",
	"dlagua/c/Subscribable"
], function(declare,lang,array,Deferred,request,query,stamp,Subscribable) {

return declare("dlagua.c.rpc.FeedReader",[Subscribable],{
	type:"atom",
	read:function(feed) {
		if(!feed) return;
		var d = new Deferred();
		request(feed,{
	        handleAs: "xml",
	        headers:{"X-Requested-With":null}
		}).then(lang.hitch(this, function(response, ioArgs){
        	d.resolve(this.parse(response));
        }))
		return d;
	},
	parse: function(response) {
		var items = [];
		if(this.type=="atom") {
			var entries = query("entry",response);
			entries.forEach(lang.hitch(this,function(entry){
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
			var date1 = stamp.fromISOString(item1.published);
			var date2 = stamp.fromISOString(item2.published);
			if(date1 > date2) return -1;
			if(date1 < date2) return 1;
			return 0;
		});
		return items;
	},
	getEntryTagValue: function(entry, tagName) {
		var elements = query(tagName,entry);
		var str = "";
		elements.forEach(function(elm){
			str = elm.firstChild ? elm.firstChild.nodeValue : "";
		});
		return str;
	},
	getEntryAuthor: function(entry) {
		var elements = query("author",entry);
		var subs = ["name","email"];
		var author = {};
		var self = this;
		elements.forEach(function(elm){
			array.forEach(subs,function(sub){
				author[sub] = self.getEntryTagValue(elm,sub);
			});
		});
		return author;
	},
	getXHTMLContent: function(entry) {
		var elements = query("content",entry);
		var xhtml;
		elements.forEach(function(elm){
			var type = elm.getAttribute("type");
			xhtml = elm.firstChild.innerText || elm.firstChild.textContent;
		});
		return xhtml;
	},
	getEntryLink: function(entry) {
		var elements = query("link",entry);
		for(var i=0; i<elements.length; i++) {
			if (!elements[i].attributes["rel"] != "undefined") {
				// Link without ref attribute was found - return its href attribute
				return elements[i].getAttribute("href");
			}
		}
		return "";
	},
	getEntryAltLink: function(entry) {
		var elements = query("link",entry);
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