dojo.provide("dlagua.x.dtl.filter.strings");
dojo.require("dojox.dtl.filter.strings");
dojo.require("dlagua.c.string.cleanWhitespace");
dojo.mixin(dlagua.x.dtl.filter.strings, {
	truncatewords_html: function(value, arg){
		var clen = parseInt(arg.length, 10);
		var wlen = parseInt(arg.words, 10);
		
		var ellipsis = arg.ellipsis ? " "+arg.ellipsis : "";
		if(arg.link) {
			var trg = (arg.target ? 'target="'+arg.target+'"' : "");
			ellipsis = '<a href="'+arg.link+'" '+trg+'>'+ellipsis+"</a>";
		}
		if(clen <= 0 && wlen <= 0){
			return "";
		}
		var words = 0;
		var chars = 0;
		var open = [];
		var stop = false;
		var lastword = "";
		var strings = dojox.dtl.filter.strings;
		value = dlagua.c.string.cleanWhitespace(value);
		var tokens = dojox.string.tokenize(value, strings._truncate_words, function(all, word){
			if(stop) return;
			if(word){
				// It's an actual non-HTML word
				words++;
				if(clen>0) chars+=word.length;
				if((wlen>0 && words <= wlen) || (clen>0 && chars < clen)){
					return word;
				}else if((wlen>0 && words > wlen) || (clen>0 && chars >= clen)){
					stop = true;
					if(clen>0) lastword = word;
					return String.fromCharCode(3);
				}
			}
			// Check for tag
			var tag = all.match(strings._truncate_tag);
			if(!tag) return;
			var closing = tag[1];
			var tagname = tag[2].toLowerCase();
			var selfclosing = tag[3];
			if(closing || strings._truncate_singlets[tagname]){
			}else if(closing){
				var i = dojo.indexOf(open, tagname);
				if(i != -1){
					open = open.slice(i + 1);
				}
			}else{
				open.unshift(tagname);
			}
			return all;
		});
		// find end of text char
		var end = dojo.indexOf(tokens,String.fromCharCode(3));
		if(end>-1) {
			tokens = tokens.slice(0,end);
			tokens.push(lastword+"&hellip; " + ellipsis);
		}
		var output = tokens.join("");

		output = output.replace(/\s+$/g, "");

		for(var i = 0, tag; tag = open[i]; i++){
			output += "</" + tag + ">";
		}

		return output;
	}
});