define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/Stateful",
	"dijit/layout/TabContainer",
	"dijit/layout/ContentPane",
	"dlagua/c/Subscribable"
	],function(declare,lang,array,Stateful,TabContainer,TabPane,Subscribable){
	
	return declare("dlagua.w.layout.TabContainer", [TabContainer,Subscribable], {
		busy: false,
		init: false,
		tabinit: false,
		tabcontainer:null,
		toolbar:null,
		tabs:[],
		pagesize: 10,
		lastState:"",
		props:null,
		loadChildrenDepth:3,
		filters:null,
		startup: function() {
			/*
			this.toolbar = new dtabbed.widget.Toolbar({
				region:"bottom",
				id:"toolbar",
				target:this
			});
			this.addChild(this.toolbar);
			dojo.addClass(this.toolbar.domNode,"shadow");
			dojo.forEach(this.getChildren(), this._setupChild, this);
			*/
			this.own(
				this.watch("currentItem",lang.hitch(this,this._rebuild)),
				this.watch("currentId",lang.hitch(this,this._loadFromId))
			);
			this.inherited(arguments);
		},
		_loadFromId:function(){
			
		},
		_rebuild:function(){
			this.destroyDescendants();
			var children
			if(this.currentItem.__depth <= this.loadChildrenDepth) {
				children = this.loadChildrenDepth==this.currentItem.__depth ? this.currentItem.children : [this.currentItem];
				children = array.filter(children,function(c){
					return !c.hidden;
				});
				if(!children.length) {
					children = [this.currentItem];
				}
			} else {
				children = this.currentItem.__parent.children;
				children = array.filter(children,function(c){
					return !c.hidden;
				});
			}
			array.forEach(children,lang.hitch(this,this._addTab));
		},
		_addTab:function(tab){
			var self = this;
			if(tab.notoolbar) toolbar = null;
			var title = tab.title;
			// TODO: too specific
			if(tab.titleformat) {
				title = self.titleformat(title,tab.titleformat);
			}
			var props = lang.mixin({},tab);
			var key = tab.name;
			// deze properties moeten worden geset, en later ingemixd
			var setprops = {
				target: self,
				key: key,
				title: title,
				start:0,
				count: self.pagesize,
				href:tab.path
			};
			// hoppa...
			props = lang.mixin(props,setprops);
			if(tab.pluggable) {
				var plg = tab.pluggable.replace(/\./g,"/");
				require([plg],function(Pluggable){
					self.tabs[key] = new Pluggable(props);
				})
			} else {
				this.tabs[key] = new TabPane(props);
			}
			var child = self.tabs[key];
			if(child.optional){
				//var d = googlepreview(true,child.basehash[child.basehash.length-1]);
				var callback = dojo.hitch(child, function(sxs) {
					_tabsloaded.push(this.key);
					if(sxs) {
						// get the correct insert index (it's not just numerical)
						var index = "last";
						var children = self.tabcontainer.getChildren();
						var l = children.length;
						if(l>0 && children[l-1].index>=this.index) {
							index = 0;
							for(var i=0;i<l;i++){
								var c = children[i];
								if(c.index && c.index>this.index) break;
								index++;
							}
						}
						self.tabcontainer.addChild(this,index);
						if(tab.disabled) this.disable(true);
						if(this.key==self.props.tab && this!=self.getSelectedTab()) {
							console.log("selecting tab "+self.props.tab);
							self.tabcontainer.selectChild(this);
						}
					}
					if(_tabsloaded.length==mi) {
						console.log("all tabs loaded");
						console.log(this.key+" = "+this.index+" optional");
						md.callback(true);
					}
		        });
				d.addCallback(callback);
			} else {
				self.addChild(child);
				/*if(tab.disabled) child.disable(true);
				_tabsloaded.push(key);
				if(key==self.props.tab && child!=self.getSelectedTab()) {
					console.log("selecting tab "+self.props.tab);
					self.tabcontainer.selectChild(child);
				}*/
			}
		},
		/*isReservedTab: function(tab,path){
			var _tabs = dojox.jsonPath.query(data,"$."+path+".tabs");
			_tabs = _tabs[0];
			for(var i in _tabs){
				if(tab==i) return true;
			}
			return false;
		},
		hashToPath: function(hash){
			var ar = hash.split("/");
			var code=null;
			var path="";
			var _tabs = [];
			var tab;
			this.props = null;
			path = ar.join(".");
			var maybeTab = ar.pop();
			var repath = ar.join(".");
			if(repath!=="") {
				_tabs = dojox.jsonPath.query(data,"$."+repath+".tabs");
			}
			if(_tabs.length>0) {
				console.log("maybeTab=tab "+repath);
				path = repath;
			} else {
				ar.push(maybeTab);
				console.log("push tab back up "+ar);
			}
			if(this.isReservedTab(maybeTab,path)) {
				console.log("reserved tab: "+maybeTab);
				tab = maybeTab;
			}
			this.props = new dtabbed.app.InferredPath({path:path,ar:ar,tab:tab});
			// if there was no tab on the hash
			if(!this.props.tab) {
				// the selected tab in the data or the first tab
				var firstTab,selTab;
				_tabs = dojox.jsonPath.query(data,"$."+this.props.path+".tabs");
				// return the tab to select according to data
				// this not required but still in the model just in case...
				var i;
				for(i in _tabs[0]){
					if(_tabs[0][i].selected) {
						selTab = i;
						break;
					}
				}
				// first
				for(i in _tabs[0]){
					firstTab = i;
					break;
				}
				// second check is rare case of first tab being optional
				// i.e. in new/books month tabs (not anymore...)
				if(!selTab && !_tabs[0][firstTab].optional) selTab = firstTab;
				this.props.selTab = selTab;
				this.props.firstTab = firstTab;
			}
		},
		setContent: function(hash) {
			var oldHash = this.lastState;
			var self = this;
			if(!this.tabcontainer) this.tabcontainer = dijit.byId("tabcontainer");
			this.hashToPath(hash);
			if(!this.props) {
				console.log("no props returned");
				return;
			}
			if(!this.props.tab && this.props.selTab) {
				hash+="/"+this.props.selTab;
				restore = true;
				window.location.replace(pageUrl+"#"+hash);
			}
			// custom loaders
			this.onSetContent();
			
			this.tabinit=false;
			// set base hash (without tab) from this.props.ar
			var basehash = (this.props.basehash?this.props.basehash:this.props.ar);
			console.log(this.props);
			var hashbase = basehash.join("/");
			this.lastState = hashbase;
			var tb = [];
			var tbp = dojox.jsonPath.query(data,"$."+this.props.ar[0]+".toolbar");
			if(tbp.length>0) tb[0] = tbp[0];
			tbp = dojox.jsonPath.query(data,"$."+this.props.ar[0]+"."+this.props.ar[1]+".toolbar");
			if(tbp.length>0) tb[1] = tbp[0];
			var tboptions = tb[1];
			tboptions = (tboptions ? tboptions : tb[0]);
			// escape adding tabs for same level
			console.log(hashbase+"-"+oldHash);
			if(oldHash!=hashbase) {
				self.setMainTabActive("maintab_"+self.props.ar[0]);
				if(self.init) self.destroyTabs();
				// always remove toolbar: height should be set initially
				// add tabs...
				var d = self.addTabs(self.props.path,basehash,tboptions,self.props.code);
				// fire some widgets here...
				self.updateWidgets();
				
				d = d.then(function() {
					// if there was no tab on the hash and selTab was optional
					// find the first available tab and reload
					// set the hash without reloading the page
					if(!self.props.tab) {
						// old option for optional first tab
						self.props.tab = self.props.selTab;
					}
					for(var key in self.tabs){
						var child = self.tabs[key];
						if(key==self.props.tab && child!=self.getSelectedTab()) {
							console.log("selecting tab "+self.props.tab);
							self.tabcontainer.selectChild(child);
						}
					}
					self.tabinit=true;
					self.init=true;
				});
			} else {
				console.log("noTabReload");
				this.tabinit=true;
				if(!this.props.tab) {
					if(!this.props.selTab) {
						for(var i in this.tabs) {
							this.props.tab = i;
							break;
						}
					} else {
						this.props.tab = this.props.selTab;
					}
				}
				var child = this.tabs[this.props.tab];
				if(child.pluggable || child.search) {
					child.code = this.props.code;
					this.tabTransition(child);
				}
				// set selected tab for history 
				this.tabcontainer.selectChild(child);
			}
		},
		setMainTabActive: function(tab) {
			if(!dijit.byId(tab)) return;
			if(selectedMenuItem) {
				dojo.removeClass(dijit.byId(selectedMenuItem).domNode,"dijitDropDownButtonActive");
			}
			selectedMenuItem = tab;
			dojo.addClass(dijit.byId(tab).domNode,"dijitDropDownButtonActive");
		},
		addTabs: function(path,basehash,parenttoolbar,code) {
			var md = new dojo.Deferred();
			var self = this;
			var _tabs = dojox.jsonPath.query(data,"$."+path+".tabs");
			_tabs = _tabs[0];
			var mi = 0;
			for(var i in _tabs) mi++;
			var cnt = 0;
			var _tabsloaded = [];
			this.tabcontainer.transition = dojo.connect(this.tabcontainer,"_transition",this,this.tabTransition);
			for(var key in _tabs) {
				var tab = _tabs[key];
				var tbp = dojox.jsonPath.query(data,"$."+path+".tabs."+key+".toolbar");
				var toolbar = (tbp.length>0) ? tbp[0] : parenttoolbar;
				if(tab.notoolbar) toolbar = null;
				var title = tab.title;
				// TODO: too specific
				if(tab.titleformat) {
					title = self.titleformat(title,tab.titleformat);
				}
				var props = {
					target: self,
					key: key,
					title: title,
					url: tab.url,
					query: tab.query,
					count: self.pagesize,
					path:path,
					basehash:basehash,
					print_url:tab.print_url,
					ori_filter:tab.filter,
					style:tab.style,
					optional:tab.optional,
					sorting: tab.sorting,
					toolbar:self.toolbar,
					toolbar_options:toolbar,
					displayError:((self.displayError==undefined || self.displayError) ? true : false),
					// IMPORTANT: code only for current tab
					// TODO: what else should be applied only to tab on path?
					code:(key==self.props.tab ? code : null),
					load:tab.load,
					paging:(toolbar ? toolbar.paging : false),
					method:(tab.method ? tab.method : "xhrGet"),
					contentType:(tab.contentType ? tab.contentType : "text"),
					pluggable:tab.pluggable,
					search:tab.search
				};
				if(tab.pluggable) {
					var Pluggable = dojo.getObject(tab.pluggable);
					this.tabs[key] = new Pluggable(props);
				} else {
					this.tabs[key] = new dtabbed.layout.TabPane(props);
				}
				var child = self.tabs[key];
				child.index = cnt;
				cnt++;
				if(child.optional){
					var d = googlepreview(true,child.basehash[child.basehash.length-1]);
					var callback = dojo.hitch(child, function(sxs) {
						_tabsloaded.push(this.key);
						if(sxs) {
							// get the correct insert index (it's not just numerical)
							var index = "last";
							var children = self.tabcontainer.getChildren();
							var l = children.length;
							if(l>0 && children[l-1].index>=this.index) {
								index = 0;
								for(var i=0;i<l;i++){
									var c = children[i];
									if(c.index && c.index>this.index) break;
									index++;
								}
							}
							self.tabcontainer.addChild(this,index);
							if(tab.disabled) this.disable(true);
							if(this.key==self.props.tab && this!=self.getSelectedTab()) {
								console.log("selecting tab "+self.props.tab);
								self.tabcontainer.selectChild(this);
							}
						}
						if(_tabsloaded.length==mi) {
							console.log("all tabs loaded");
							console.log(this.key+" = "+this.index+" optional");
							md.callback(true);
						}
			        });
					d.addCallback(callback);
				} else {
					self.tabcontainer.addChild(child);
					if(tab.disabled) child.disable(true);
					_tabsloaded.push(key);
					if(key==self.props.tab && child!=self.getSelectedTab()) {
						console.log("selecting tab "+self.props.tab);
						self.tabcontainer.selectChild(child);
					}
				}
			}
			if(_tabsloaded.length==mi) {
				console.log(key+" = "+this.tabs[key].index+" normal");
				md.callback(true);
			}
			return md;
		},
		destroyTabs: function() {
			dojo.disconnect(this.tabcontainer.transition);
			this.tabcontainer.destroyDescendants();
			this.tabs = [];
		},
		tabTransition: function(child,oldChild){
			if(!oldChild && this.props.tab && this.props.tab != child.key) return;
			console.log("tab transition to "+child.key);
			var self = this;
			self.toolbar.remove();
			// reset all filters!
			if(child.toolbar_options) {
				self.toolbar.add(child.toolbar_options);
				if(child.toolbar_options.filters) child.setFilter("all");
				// set pagesize before paging
				if(child.pagesize && (child.toolbar_options.paging || child.toolbar_options.filters)) {
					self.pagesize = child.count = child.pagesize;
					child.start = 0;
				}
			}
			// returns dojo.Deferred
			var d = child.setContent();
			d.then(function(){
				if(child.toolbar_options) {
					if(child.toolbar_options.paging || child.toolbar_options.filters) {
						child.page();
					}
				}
				if(child.pluggable) child.update(true);
				// force resize for toolbar
				self.resize();
			});
		},*/
		getSelectedTab:function(){
			return this.tabcontainer.selectedChildWidget;
		},
		onSetContent:function() {
			//overwrite
		}
	});
});


