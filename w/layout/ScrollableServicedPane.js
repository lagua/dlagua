dojo.provide("dlagua.w.layout.ScrollableServicedPane");

dojo.require("dojo.io.script");
dojo.require("dlagua.c.Subscribable");
dojo.require("dijit.layout._LayoutWidget");
dojo.require("dijit._Templated");
dojo.require("dojox.mobile.parser");
dojo.require("dojox.mobile");
dojo.require("dlagua.x.mobile._ScrollableMixin");
dojo.requireIf(!dojo.isWebKit, "dlagua.x.mobile.compat");
dojo.requireIf(!dojo.isWebKit, "dojo.fx");
dojo.requireIf(!dojo.isWebKit, "dojo.fx.easing");
dojo.require("dijit.form.Button");
dojo.require("dojox.timing._base");
dojo.require("dojo.cache");
dojo.require("dlagua.c.store.JsonRest");
dojo.require("dojo.date.stamp");
dojo.require("dlagua.w.layout.ScrollableServicedPaneItem");
dojo.require("dojo.store.Memory");
dojo.require("dojo.store.Cache");
dojo.require("dlagua.c.rpc.FeedReader");

dojo.declare("dlagua.w.layout.ScrollableServicedPane",[dijit.layout._LayoutWidget, dijit._Templated, dlagua.x.mobile._ScrollableMixin,dlagua.c.Subscribable],{
	store:null,
	stores:{},
	listitems:null,
	itemnodesmap:null,
	idProperty:"id",
	hrProperty:"",
	hasDeferredContent:false,
	filter:"",
	sort:"",
	filterByItemProperties:"",
	filters:null,
	orifilters:null,
	schema:null,
	schemata:{},
	_ch:null,
	childrenReady:0,
	selectedIndex:0,
	selectedItem:null,
	itemHeight:0,
	template:"",
	childTemplate:"",
	templateModule:null,
	scrollBar:true,
	header:false,
	footer:false,
	snap:false,
	query:"",
	href:"",
	content:"",
	oldItem:null,
	service:"",
	locale:"",
	path:"",
	newData:null,
	servicetype:"",
	labelAttr:"title",
	templateProperty:"path",
	start:0,
	count:25,
	maxCount:Infinity,
	pageSize:5,
	total:Infinity,
	headerLabel:"",
	footerLabel:"",
	pageButtons:true,
	loadingAnimation:true,
	loadOnCreation:true,
	currentService:"",
	resolveProperties:"",
	allowedLoadDepth:0,
	filterById:"",
	reloadTriggerProperties:"path,locale,type",
	reload:false,
	_timer:null,
	autoSkipInterval:300,
	filterByLocale:true,
	baseClass:"dlaguaScrollableServicedPane",
	templateString: dojo.cache("dlagua.w.layout", "templates/ScrollableServicedPane.html"),
	useScrollBar:true,
	startup: function(){
		if(this._started){ return; }
		this._timer = new dojox.timing.Timer(this.autoSkipInterval);
		var params={};
		this.listitems = [];
		this.itemnodesmap = {};
		// servicetype+locale will be set by loader
		this.addWatch("locale",this.forcedLoad);
		this.addWatch("filter",function(){
			console.log(this.id,"reloading from filter",this.filter)
			this.orifilter = this.filter;
			this.forcedLoad();
		});
		this.addWatch("filterById",this.forcedLoad);
		this.addWatch("newData",function(){
			dojo.forEach(this.newData,dojo.hitch(this,function(item,i,items){
				this.addItem(item,i,items,"first");
				this.currentId = item[this.idProperty];
			}));
		});
		this.addWatch("reload",this.loadFromItem);
		this.orifilter = this.filter;
		this.addWatch("filters",function(){
			if(!persvr.rql) return;
			if(!this.orifilters) {
				this.orifilters = this.filters;
			} else {
				this.orifilters = dojo.mixin(this.orifilters,this.filters);
			}
			this.filters = null;
			var fa = new persvr.rql.Query.Query();
			var keys = {};
			for(var k in this.orifilters){
				if(this.orifilters[k].checked) {
					var fo = persvr.rql.Parser.parseQuery(this.orifilters[k].filter);
					fo.walk(function(name,terms){
						var k = terms[0];
						var v;
						if(terms.length>1) v = terms[1];
						if(keys[k]) {
							fa = fa.or();
						}
						if(v) {
							fa = fa[name](k,v);
						} else {
							fa = fa[name](k);
						}
					});
				}
			}
			if(this.orifilter) {
				var oo = persvr.rql.Parser.parseQuery(this.orifilter);
				oo.walk(function(name,terms){
					var k = terms[0];
					var v;
					if(terms.length>1) v = terms[1];
					if(keys[k]) {
						fa = fa.or();
					}
					if(v) {
						fa = fa[name](k,v);
					} else {
						fa = fa[name](k);
					}
				});
			}
			this.filter = fa.toString();
			this.forcedLoad();
		});
		this.addWatch("sort",function(){
			this.newsort = true;
			this.forcedLoad();
			this.newsort = false;
		});
		this.addWatch("childTemplate",function(){
			this.replaceChildTemplate();
		});
		this.addWatch("currentId",this.selectItemByCurrentId);
		this.addWatch("currentItem",this.loadFromItem);
		var self = this;
		if(this.header) {
			if(this.pageButtons) {
				this.prevButton = new dijit.form.Button({
					label:"Prev",
					showLabel:false,
					"class":"dlaguaScrollableServicedPanePrevButton",
					onMouseDown:function(){
						self.autoFire(-1);
					},
					onClick:function(){
						self.skip(-1);
					}
				});
				this.fixedHeader.appendChild(this.prevButton.domNode);
			}
			params.fixedHeaderHeight = dojo.marginBox(this.fixedHeader).h;
		} else {
			dojo.style(this.fixedHeader,"display","none");
			params.fixedHeaderHeight = 0;
		}
		if(this.footer) {
			if(this.pageButtons) {
				this.nextButton = new dijit.form.Button({
					label:"Next",
					showLabel:false,
					"class":"dlaguaScrollableServicedPaneNextButton",
					onMouseDown:function(){
						self.autoFire(1);
					},
					onClick:function(){
						self.skip(1);
					}
				});
				this.fixedFooter.appendChild(this.nextButton.domNode);
			}
			params.fixedFooterHeight = dojo.marginBox(this.fixedFooter).h;
		} else {
			dojo.style(this.fixedFooter,"display","none");
			params.fixedFooterHeight = 0;
		}
		this.init(params);
		if(this.count>this.maxCount) this.count = this.maxCount;
		// wait for any pub/sub loaders
		if(this.loadOnCreation) {
			console.log(this.id,"loadOnCreation")
			if(this.start>this.count) return;
			if(this.model || this.path) {
				this.forcedLoad();
			}
		}
		this.inherited(arguments);
	},
	forcedLoad: function(){
		this.reload = true;
		if(this.model || this.path) {
			// set default servicetype
			if(!this.servicetype) {
				this.servicetype = (this.model ? "persvr" : "page");
			}
			this.currentItem = {
				path: this.path,
				model:this.model
			};
		}
		this.loadFromItem();
	},
	replaceChildTemplate: function(child,templateDir) {
		if(!templateDir) templateDir = this.templateDir;
		var template = this.getTemplate(templateDir);
		if(this.xDomainResolver) {
			var resolver = this.xDomainResolver;
			var self = this;
			var content = resolver.params || {};
			content[resolver.fileParamName] = dojo.moduleUrl(this.templateModule).path+"/"+template;
			dojo.io.script.get({
				url:resolver.path,
				content:content,
				callbackParamName:resolver.callbackParamName,
				load:function(res){
					var tpl = resolver.transformer(res);
					var tplo = self.parseTemplate(tpl);
					if(child){
						child.applyTemplate(tplo.tpl,tplo.partials);
					} else {
						dojo.forEach(self.listitems,function(li){
							li.applyTemplate(tplo.tpl,tplo.partials);
						});
					}
				}
			});
		} else {
			var tpl = dojo.cache(this.templateModule,template);
			var tplo = this.parseTemplate(tpl);
			if(child && child!="childTemplate"){
				child.applyTemplate(tplo.tpl,tplo.partials);
			} else {
				dojo.forEach(this.listitems,function(li){
					li.applyTemplate(tplo.tpl,tplo.partials);
				});
			}
		}
	},
	getSchema:function(){
		var d = new dojo.Deferred;
		// prevent getting schema again
		if(this.schemata[this.store.schemaUri]) {
			this.schemaUri = this.store.schemaUri;
			var schema = this.schema = this.schemata[this.schemaUri];
			for(var k in schema.properties) {
				if(schema.properties[k].primary) this.idProperty = k;
				if(schema.properties[k].hrkey) this.hrProperty = k;
			}
			this.store.idProperty = this.idProperty;
			d.callback(true);
			return d;
		}
		if(!this.schemaUri || this.schemaUri!=this.store.schemaUri) {
			this.schemaUri = this.store.schemaUri;
			this.store.getSchema(this.store.schemaUri,{useXDomain:(this.useXDomain)}).then(dojo.hitch(this,function(schema){
				this.schema = schema;
				this.schemata[this.schemaUri] = schema;
				for(var k in schema.properties) {
					if(schema.properties[k].primary) this.idProperty = k;
					if(schema.properties[k].hrkey) this.hrProperty = k;
				}
				this.store.idProperty = this.idProperty;
				d.callback(true);
			}));
		} else {
			d.callback(true);
		}
		return d;
	},
	cancel:function(){
		var o = this.oldItem;
		var n = this.currentItem;
		// should we cancel oldItem and let currentItem take over?
		var props = this.reloadTriggerProperties.split(",");
		// if any of the keys below are different, cancel
		var cancel = false;
		if(o) {
			for(var i=0;i<props.length;i++) {
				var p = props[i];
				if(p in n && p in o && n[p]!=o[p]) {
					cancel = true;
					break;
				}
			}
		}
		if(!cancel) return;
		switch(o.type || this.servicetype) {
			case "persvr":
				if(this.results && this.results.fired==-1) {
					this.results.cancel();
				}
			break;
		}
	},
	loadFromItem: function() {
		if(this._beingDestroyed || !this.currentItem) return;
		if(!this.currentItem.locale) this.currentItem.locale = this.locale;
		console.log("reload?",this.id,this.reload)
		var o = this.oldItem;
		var n = this.currentItem;
		var allowdepth = parseInt(this.allowedLoadDepth);
		if(allowdepth && allowdepth!=n.__depth) return;
		if(!this.reload) {
			// if all of the keys below are the same, don't reload
			var props = this.reloadTriggerProperties.split(",");
			if(o) {
				var reload = false;
				for(var i=0;i<props.length;i++) {
					var p = props[i];
					if(p in n && p in o && n[p]!=o[p]) {
						reload = true;
						break;
					}
				}
				if(!reload) return;
			}
		}
		if(this._loading) {
			console.warn("Aborting SSP loading!")
			this.cancel();
		} else {
			console.warn("reload!",this.id,n);
		}
		// resetters
		this._loading = true;
		this.start = 0;
		this.total = 0;
		this.reload = false;
		this.hasDeferredContent = false;
		//this.idProperty = this.hrProperty = "";
		this.childrenReady = 0;
		// make a shallow copy to compare next load
		var item = dojo.mixin({},this.currentItem);
		// copy type if have one
		if(item.type) this.servicetype = item.type;
		this.oldItem = item;
		if(this.servicetype=="xform") {
			this.servicetype = "page";
		} else if(this.servicetype=="persvr" || this.servicetype=="atom") {
			this.template = this.getTemplate();
		}
		switch(this.servicetype) {
			case "persvr":
				if(!item.service) item.service = (this.service || "/persvr/");
				if(!item.model) return;
				var model = item.model;
				var target = item.service+model+"/";
				var schemaUri = item.service+"Class/"+model;
				if(!this.newsort && item.sort) this.sort = item.sort;
				if(item.filter) this.orifilter = this.filter = item.filter;
				if(!this.store) {
					this.store = new dlagua.c.store.JsonRest({
						target:target,
						schemaUri:schemaUri
					});
					if(this.stores) {
						if(!this.stores[target]) {
							this.stores[target] = new dojo.store.Cache(this.store, new dojo.store.Memory());
						}
					}
				} else {
					this.store.target = target;
					this.store.schemaUri = schemaUri;
				}
				break;
			case "atom":
				if(!item.service) item.service = (this.service || "/atom/content");
				break;
			default:
				if(!item.service) item.service = (this.service || "/xbrota/rest");
				break;
		}
		this.rebuild(item);
	},
	selectItemByCurrentId: function(){
		if(this._beingDestroyed) return;
		var item = this.itemnodesmap[this.currentId];
		if(!item) {
			// force more stuff from the store
			this.pageStore(-Infinity);
			return;
		}
		this.currentId = null;
		var index = item.getIndexInParent();
		this.scrollToItem(index);
	},
	rebuild:function(item) {
		this.currentService = item.service; 
		this.destroyDescendants();
		dojo.style(this.containerNode,{
			top:0
		});
		if(this.useScrollBar) {
			this.scrollToInitPos();
		}
		if(this.loadingAnimation && this.footer) {
			dojo.addClass(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
		}
		this.selectedIndex = 0;
		this.selectedItem = null;
		this.listitems = [];
		this.itemnodesmap = {};
		if(this.servicetype=="persvr") {
			this.getSchema().then(dojo.hitch(this,function(){
				var q = this.createQuery();
				var start = this.start;
				this.start += this.count;
				var results = this.results = this.store.query(q,{
					start:start,
					count:this.count,
					useXDomain:this.useXDomain
				});
				results.total.then(dojo.hitch(this,function(total){
					this.total = total;
					if(total===0 || isNaN(total)) this.onReady();
				}));
				results.forEach(dojo.hitch(this,this.addItem));
			}));
		} else if(this.servicetype=="atom") {
        	var fr = new dlagua.c.rpc.FeedReader();
        	fr.read(item.service+"/"+item.path).then(dojo.hitch(this,function(items){
        		var total = items.length;
        		this.total = total;
				if(total===0 || isNaN(total)) {
					this.onReady();
				} else {
					dojo.forEach(items,this.addItem,this);
				}
        	}));
		} else {
			if(item) {
				this._initContent(item);
			} else {
				this.onReady();
			}
		}
	},
	
	destroyRecursive: function(/*Boolean*/ preserveDom){
		// summary:
		//		Destroy the ContentPane and its contents
		this.unwatchAll();
		this.inherited(arguments);
	},
	skip:function(dir) {
		var nxt = this.selectedIndex+dir;
		this.scrollToItem(nxt);
	},
	_stopFiring: function(){
		dojo.disconnect(this.MOUSE_UP);
		this.MOUSE_UP = null;
		this._timer.stop();
		this._timer.onTick = function(){};
	},
	autoFire: function(dir) {
		if(this.MOUSE_UP) return;
		this.MOUSE_UP = dojo.connect(dojo.body(),"onmouseup",this,this._stopFiring);
		if(!this._timer.isRunning) {
			var _me = this;
			this._timer.onTick = function() {
				_me.skip(dir);
			};
			this._timer.start();
		}
	},
	scrollToItem: function(n) {
		// FIXME item should not scroll beyond min/max
		var len = this.listitems.length;
		if(n>=len || n<0) return;
		var y = 0;
		if(this.itemHeight) { 
			y = this.itemHeight*n;
		} else {
			for(var i=0; i<Math.min(n,len); i++) {
				y += this.listitems[i].marginBox.h;
			}
		}
		this.slideTo({x:0,y:-y},0.3,"ease-out");
	},
	pageStore:function(py){
		if(this._loading) return;
		if(!py) py = this.getPos().y;
		var dim = this._dim;
		var len = this.listitems.length;
		if(this.store && -py>=dim.o.h && len<this.total && this.total<this.maxCount) {
			// try to get more stuff from the store...
			this._loading = true;
			this.childrenReady = 0;
			if(this.loadingAnimation && this.footer) {
				dojo.addClass(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
			}
			var count = (this.pageSize || this.count);
			if(this.start+count>this.maxCount) return;
			if(this.start+count>=this.total) count = this.total-this.start;
			var start = this.start;
			this.start += count;
			var q = this.createQuery();
			var results = this.results = this.store.query(q,{
				start:start,
				count:count,
				useXDomain:this.useXDomain
			});
			results.total.then(dojo.hitch(this,function(total){
				this.total = total;
			}));
			results.forEach(dojo.hitch(this,this.addItem));
		}
	},
	setSelectedItem: function(index) {
		if(this.selectedIndex==index) return;
		this.selectedIndex = index;
		var py = this.getPos().y;
		var dim = this._dim;
		var len = this.listitems.length;
		if(this.snap) {
			var y = 0;
			if(this.itemHeight) { 
				y = this.itemHeight*index;
			} else {
				for(var i=0; i<Math.min(index,len); i++) {
					y += this.listitems[i].marginBox.h;
				}
			}
			var dy = y+py;
			// FIXME: for border, but margin may differ
			if(dy==1 || dy==-1) dy = 0;
			if(dy!=0 && !this._bounce) this._bounce = {x:0,y:-y};
		}
		this.selectedItem = this.listitems[index];
		console.log("selectedItem",this.selectedItem);
		if(this.id && this.listitems && this.listitems.length) dojo.publish("/components/"+this.id,[this.listitems[index].data]);
		this.pageStore(py);
	},
	createQuery:function(){
		if(!persvr.rql) return;
		var qo = this.query ? persvr.rql.Parser.parseQuery(this.query) : new persvr.rql.Query.Query();
		if(this.filterByLocale) qo = qo.eq("locale",this.locale);
		if(this.filter) {
			// try to parse it first
			var fo = persvr.rql.Parser.parseQuery(this.filter);
			fo.walk(function(name,terms){
				var k = terms[0];
				var v;
				if(terms.length>1) v = terms[1];
				if(v) {
					if(dojo.isString(v)) v = v.replace("undefined","*");
					qo = qo[name](k,v);
				} else {
					qo = qo[name](k);
				}
			});
		}
		if(this.filterByItemProperties) {
			var ar = this.filterByItemProperties.split(",");
			for(var i in ar) {
				var k = ar[i];
				if(k in this.currentItem) {
					var v = this.currentItem[k];
					qo = qo.eq(k,v);
				}
			}
		}
		if(this.filterById) {
			qo = qo.eq(this.idProperty,this.filterById);
		}
		if(this.sort) {
			qo = qo.sort(this.sort);
		}
		return "?"+qo.toString();
	},
	checkSelectedItem: function(){
		// get proximate item
		// BIG FIXME!: py is NOT safe for borders / gutters
		var py = this.getPos().y;
		var li = this.listitems;
		var len = li.length;
		var y=0, y1=0, y2=0, i=0;
		var h = this.itemHeight;
		// won't work for inline items
		for(;i<len;i++) {
			y1 = (h ? y-0.5*h : y-(0.5*li[(i>0 ? i-1 : i)].marginBox.h));
			y2 = (h ? y+0.5*h : y+(0.5*li[i].marginBox.h));
			if(-py>=y1 && -py<y2) break;
			y += (h ? h : li[i].marginBox.h);
		}
		if(i>=len) i=0;
		this.setSelectedItem(i);
	},
	onFlickAnimationEnd:function(e){
		if(e && e.srcElement){
			dojo.stopEvent(e);
		}
		this.stopAnimation();
		if(this._bounce){
			var _this = this;
			var bounce = _this._bounce;
			setTimeout(function(){
				_this.slideTo(bounce, 0.3, "ease-out");
			}, 0);
			_this._bounce = undefined;
		}else{
			this.hideScrollBar();
			this.removeCover();
			this.startTime = 0;
			// this really is dim reset
			this._dim = this.getDim();
			this.checkSelectedItem();
		}
	},
	layout:function(){
		this.resizeView();
	},
	resizeView: function(e){
		// moved from init() to support dynamically added fixed bars
		if(this.footer) {
			this.fixedFooterHeight = dojo.marginBox(this.fixedFooter).h;
		}
		this._appFooterHeight = (this.fixedFooterHeight && !this.isLocalFooter) ? this.fixedFooterHeight : 0;
		if(this.header) {
			this.fixedHeaderHeight = dojo.marginBox(this.fixedHeader).h;
			this.containerNode.style.paddingTop = this.fixedHeaderHeight + "px";
		}

		// has to wait a little for completion of hideAddressBar()
		var c = 0;
		var _this = this;
		setTimeout(function(){
			if(!_this || _this._beingDestroyed) {
				return;
			}
			// recalc dim
			var pos = _this.getPos();
			_this.showScrollBar();
			if(_this.useScrollBar) {
				_this.slideScrollBarTo(pos, 0.3, "ease-out");
			}
			_this.pageStore(pos.y);
		}, 100);
	},
	getModel:function(){
		return this.model || this.currentItem.model;
	},
	parseTemplate: function(tpl){
		tpl = tpl.replace(/[\n\t\u200B\u200C\u200D\uFEFF]+/g,"").replace(/\>\s+\</g,"><");
		var div = dojo.create("div",{
			innerHTML:tpl
		});
		dojo.query("span.templaField",div).forEach(function(node){
			var p = node.parentNode;
			var inner = node.firstChild;
			p.insertBefore(inner, node);
			p.removeChild(node);
		});
		var types = [];
		// look for nesting
		var partials = {};
		var partialcount = 0;
		var getNode = function(node){
			var type = dojo.attr(node,"data-templa-type");
			types.push(type);
			var props = dojo.attr(node,"data-templa-props");
			var pre = document.createTextNode("{{#_mod}}"+type+"|"+(props || "")+"|");
			var post = document.createTextNode("{{/_mod}}");
			dojo.place(pre,node,"first");
			dojo.place(post,node);
			return node;
		}
		dojo.query("span[data-templa-type] span[data-templa-type]",div).forEach(function(node){
			node = getNode(node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
			var partname = "_mod"+partialcount;
			partials[partname] = p.innerHTML;
			p.innerHTML = "{{>"+partname+"}}";
			partialcount++;
		});
		dojo.query("span[data-templa-type]",div).forEach(function(node){
			node = getNode(node);
			var p = node.parentNode;
			var inner;
			while(inner = node.firstChild){
				// insert all our children before ourselves.
				p.insertBefore(inner, node);
			}
			p.removeChild(node);
		});
		var dj = dojo;
		dojo.forEach(types,function(type){
			if(type.indexOf("::")) {
				var ar = type.split("::");
				type = ar[0];
			}
			dj.require(type);
		});
		tpl = div.innerHTML.toString();
		tpl = tpl.replace(/{{&gt;/g,"{{>");
		return {tpl:tpl,partials:partials};
	},
	getTemplate:function(templateDir){
		var xtemplate = "";
		var item = this.currentItem;
		if(!item) return;
		if(!templateDir) templateDir = this.templateDir;
		if(!this.childTemplate && item[this.templateProperty]) {
			var tpath = item[this.templateProperty];
			if(this.templateProperty=="path" && this.filterById) {
				var ar = tpath.split("/");
				var i;
				for(i=0;i<ar.length;i++){
					if(ar[i]==this.filterById) {
						break;
					}
				}
				tpath = ar.splice(0,i).join("/");
			}
			xtemplate = (templateDir ? templateDir+"/" : "")+tpath+(this.filterById ? "_view.html" : ".html");
		}
		return item.locale+"/"+(this.childTemplate ? this.childTemplate : xtemplate);
	},
	addItem:function(item,index,items,insertIndex) {
		var content = "";
		var id = item[this.idProperty];
		var listItem = new dlagua.w.layout.ScrollableServicedPaneItem({
			parent:this,
			data:item,
			itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
		});
		this.listitems.push(listItem);
		this.connect(listItem,"onLoad",function(){
			// as this can take a while, listItem may be destroyed in the meantime
			if(this._beingDestroyed || listItem._beingDestroyed) return;
			if(this.xDomainResolver) {
				var self = this;
				var resolver = this.xDomainResolver;
				var content = resolver.params || {};
				content[resolver.fileParamName] = dojo.moduleUrl(this.templateModule).path+"/"+this.template;
				dojo.io.script.get({
					url:resolver.path,
					content:content,
					callbackParamName:resolver.callbackParamName,
					load:function(res){
						if(self._beingDestroyed) return;
						var tpl = resolver.transformer(res);
						var tplo = self.parseTemplate(tpl);
						listItem.applyTemplate(tplo.tpl,tplo.partials);
						dojo.fadeIn({node:listItem.containerNode}).play();
						self.childrenReady++;
						if(self.childrenReady == items.length) {
							setTimeout(function(){
								self.onReady();
							},2);
						}
					}
				});
			} else {
				var tpl = dojo.cache(this.templateModule,this.template);
				var tplo = this.parseTemplate(tpl);
				listItem.applyTemplate(tplo.tpl,tplo.partials);
				dojo.fadeIn({node:listItem.containerNode}).play();
				this.childrenReady++;
				if(this.childrenReady == items.length) {
					// wait for the margin boxes to be set
					setTimeout(dojo.hitch(this,function(){
						this.onReady();
					}),2);
				}
			}
			this.itemnodesmap[item[this.idProperty]] = listItem;
		});
		this.addChild(listItem,insertIndex);
	},
	_initContent: function(item) {
		// setcontent = false will not set the content here
		var self = this;
		var listItem = new dlagua.w.layout.ScrollableServicedPaneItem({
			itemHeight:(this.itemHeight?this.itemHeight+"px":"auto")
		});
		var href = item.service+"/"+item.locale+"/"+item.path;
		if(item.type=="xform") {
			this.setXFormTarget(listItem,href);
			setTimeout(function(){
				self.onReady();
			},100);
		} else {
			dojo.xhrGet({
				url:href,
				load:function(res){
					listItem.set("content",res);
					setTimeout(function(){
						self.onReady();
					},10);
				}
			});
		}
		this.listitems.push(listItem);
		this.addChild(listItem);
		this.itemnodesmap[item[this.idProperty]] = listItem;
		dojo.fadeIn({node:listItem.containerNode}).play();
	},
	onReady: function(){
		console.log("done loading "+this.id);
		this._loading = false;
		if(this.loadingAnimation && this.footer) {
			dojo.removeClass(this.fixedFooter,"dlaguaScrollableServicedPaneLoading");
		}
		var pos = this.getPos();
		this.showScrollBar();
		if(this.useScrollBar) {
			this.slideScrollBarTo(pos, 0.3, "ease-out");
		}
		// if needed, get more stuff from the store
		if(this.servicetype == "persvr") this.pageStore(pos.y);
		// select currentId for #anchor simulation
		if(this.currentId) {
			this.selectItemByCurrentId();
		}
	}
});
