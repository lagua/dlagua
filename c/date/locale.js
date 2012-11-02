dojo.provide("dlagua.c.date.locale");
dojo.require("dojo.date.locale");
dojo.require("dojo.date.stamp");

dojo.getObject("c.date.locale", true, dlagua);

dlagua.c.date.locale.format = function(val,options) {
	var date;
	var txt = "", oritxt = "";
	if(options.selector=="time") {
		switch(options.timePart) {
			case "minutes":
				date = new Date(parseInt(val,10)*60*1000);
			break;
			default:
				date = new dojo.date.stamp.fromISOString(val);
			break;
		}
	} else {
		date = new dojo.date.stamp.fromISOString(val);
	}
	if(options._ref.ref && options._ref.ref.locale) options.locale = options._ref.ref.locale.replace("_","-");
	if(!options.ignoreZeroTimes || date.getHours()+date.getMinutes()+date.getSeconds()>0){
		oritxt = txt = dojo.date.locale.format(date,options);
	}
	if(options.autoupdate) {
		dojo.require("dojox.uuid.generateRandomUuid");
		dojo.require("dojox.timing");
		dojo.require("dojo.i18n");

		var id = dojox.uuid.generateRandomUuid();
		var interval = (options.updateInterval || 30*1000);
		var limit = (options.updateLimit || 7*24*60*60*1000);
		var now = new Date();
		var diff = dojo.date.difference(date,now,"millisecond");
		var thresholds = (options.updateThresholds || [60*1000,60*60*1000,24*60*60*1000,7*24*60*60*1000,30*24*60*60*1000]);
		// TODO: from locale
		var locale = dojo.i18n.normalizeLocale(options.locale);
		var lb = dojo.i18n.getLocalization("lagua.date", "interval", locale);
		var markers = (options.updateMarkers || ["{moments} {ago}","{value} {minute} {ago}","{value} {hour} {ago}","{value} {day} {ago}","{value} {week} {ago}"]);
		if(diff<limit) {
			var i=0;
			for(;i<thresholds.length;i++) {
				if(diff<thresholds[i]) break;
			}
			var val = Math.round(diff/thresholds[i-1]);
			var repl = dojo.mixin(lb,{
				value:val,
				second:(val==1 ? lb.second : lb.seconds),
				minute:(val==1 ? lb.minute : lb.minutes),
				hour:(val==1 ? lb.hour : lb.hours),
				day:(val==1 ? lb.day : lb.days),
				week:(val==1 ? lb.week : lb.weeks)
			});
			txt = '<span id="'+id+'">'+dojo.replace(markers[i],repl)+'</span>';
			var timer = new dojox.timing.Timer(interval);
			timer.start();
			var tc = dojo.connect(timer,"onTick",this,function(){
				var now = new Date();
				var diff = dojo.date.difference(date,now,"millisecond");
				var i=0;
				if(diff<limit) {
					for(;i<thresholds.length;i++) {
						if(diff<thresholds[i]) break;
					}
					var val = Math.round(diff/thresholds[i-1]);
					var repl = dojo.mixin(lb,{
						value:val,
						second:(val==1 ? lb.second : lb.seconds),
						minute:(val==1 ? lb.minute : lb.minutes),
						hour:(val==1 ? lb.hour : lb.hours),
						day:(val==1 ? lb.day : lb.days),
						week:(val==1 ? lb.week : lb.weeks)
					});
					txt = dojo.replace(markers[i],repl);
				} else {
					txt = oritxt;
					dojo.disconnect(tc);
				}
				var node = dojo.byId(id);
				if(node) {
					node.innerHTML = txt;
				} else {
					// we lost the node, clear it
					dojo.disconnect(tc);
				}
			});
		}
	}
	return txt;
};