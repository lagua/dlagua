define([
"dojo/_base/lang",
"dojo/_base/array",
"dojo/dom",
"dojo/i18n",
"dojo/date",
"dojo/date/locale",
"dojo/date/stamp",
"dojo/aspect",
"dojox/uuid/generateRandomUuid",
"dojox/timing"
],function(lang,array,dom,i18n,date,dlocale,stamp,aspect,generateRandomUuid,timing){

lang.getObject("dlagua.c.date.locale", true);

var format = function(val,options) {
	var date;
	var txt = "", oritxt = "";
	if(options.selector=="time") {
		switch(options.timePart) {
			case "minutes":
				date = new Date(parseInt(val,10)*60*1000);
			break;
			default:
				date = new stamp.fromISOString(val);
			break;
		}
	} else {
		date = new stamp.fromISOString(val);
	}
	if(options._ref.ref && options._ref.ref.locale) options.locale = options._ref.ref.locale.replace("_","-");
	if(!options.ignoreZeroTimes || date.getHours()+date.getMinutes()+date.getSeconds()>0){
		oritxt = txt = dlocale.format(date,options);
	}
	if(options.autoupdate) {
		var id = generateRandomUuid();
		var interval = (options.updateInterval || 30*1000);
		var limit = (options.updateLimit || 7*24*60*60*1000);
		var now = new Date();
		var diff = date.difference(date,now,"millisecond");
		var thresholds = (options.updateThresholds || [60*1000,60*60*1000,24*60*60*1000,7*24*60*60*1000,30*24*60*60*1000]);
		// TODO: from locale
		var locale = i18n.normalizeLocale(options.locale);
		var lb = i18n.getLocalization("dlagua.c.date", "interval", locale);
		var markers = (options.updateMarkers || ["{moments} {ago}","{value} {minute} {ago}","{value} {hour} {ago}","{value} {day} {ago}","{value} {week} {ago}"]);
		if(diff<limit) {
			var x = 0;
			for(var i=0;i<thresholds.length;i++) {
				if(diff<thresholds[i]) {
					x = i;
					break;
				}
			}
			var val = Math.round(diff/thresholds[x-1]);
			var repl = lang.mixin(lb,{
				value:val,
				second:(val==1 ? lb.second : lb.seconds),
				minute:(val==1 ? lb.minute : lb.minutes),
				hour:(val==1 ? lb.hour : lb.hours),
				day:(val==1 ? lb.day : lb.days),
				week:(val==1 ? lb.week : lb.weeks)
			});
			txt = '<span id="'+id+'">'+lang.replace(markers[x],repl)+'</span>';
			var timer = new timing.Timer(interval);
			timer.start();
			var tc = aspect.after(timer,"onTick",this,function(){
				var now = new Date();
				var diff = date.difference(date,now,"millisecond");
				if(diff<limit) {
					var x = 0;
					for(var i=0;i<thresholds.length;i++) {
						if(diff<thresholds[i]) {
							x = i;
							break;
						}
					}
					var val = Math.round(diff/thresholds[x-1]);
					var repl = lang.mixin(lb,{
						value:val,
						second:(val==1 ? lb.second : lb.seconds),
						minute:(val==1 ? lb.minute : lb.minutes),
						hour:(val==1 ? lb.hour : lb.hours),
						day:(val==1 ? lb.day : lb.days),
						week:(val==1 ? lb.week : lb.weeks)
					});
					txt = lang.replace(markers[x],repl);
				} else {
					txt = oritxt;
					tc.remove();
				}
				var node = dom.byId(id);
				if(node) {
					node.innerHTML = txt;
				} else {
					// we lost the node, clear it
					tc.remove();
				}
			});
		}
	}
	return txt;
};

dlagua.c.date.locale.format = format;

return format;

});