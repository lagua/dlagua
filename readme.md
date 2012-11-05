dlagua, an app boilerplate for dojo and Persevere 2.0
===========================================================

dlagua is the workhorse of Lagua Web Solutions. It mirrors the structure of the dojo toolkit loosly, where
* c = core (e.g. dojo)
* w = widgets (e.g. dijit)
* x = experimental, extensions (e.g. dojox)

This means dojo is extended (not forked) to create production quality modules, all actually used in web apps designed by Lagua.
Apps can be declared in HTML using the data-dojo-* attributes, and use persevere 2.0 by default as a persistent JSON storage layer. A typical app would be:

	<script>
		// as dlagua currently extends from dojo1.6, we need to require some additional packages (e.g. persvr/rql) through requirejs 
		dojo.require("dojo.parser");
		dlagua.c._base.addRequirejs().then(function(){
			dojo.parser.parse();
		});
	</script>
    <div id="myApp" data-dojo-type="lagua.App">
    	<script type='dojo/method'>
			this.subscribe("/components/menu"); // create a subscription to the menu
		</script>
		<div data-dojo-id="menustore" data-dojo-type="dlagua.c.store.JsonRest" data-dojo-props="target:'/persvr/Menu/'"></div>
		<div id="menu" data-dojo-type="dlagua.w.MenuBar" data-dojo-props="region:'top',locale:'en_us',store:menustore">
	    	<script type='dojo/method'>
		    	this.subscribe("/app/pathchange"); // create a subscription to the changes of 'path'
		    </script>
		</div>
		<div id="center" data-dojo-type="dlagua.w.layout.ScrollableServicedPane" data-dojo-props="region:'center',locale:'en_us',service:'somerestservice'">
			<script type='dojo/method'>
				this.subscribe("/app/pagechange"); // create a subscription to the changes of the currently selected /persvr/Menu item
			</script>
		</div>
	</div>
	
The persevere Menu model for this particular setup is defined like this:
	var Model = require("perstore/model").Model,
		DefaultStore = require("perstore/stores").DefaultStore;
	
	var menuStore = DefaultStore();
	Menu = exports.Menu = Model(menuStore, {
		properties: { // schema definitions for property types
			name: {
				type:"string",
				indexed:true
			},
			type: {
				type:"string",
				default:"page",
				indexed:true
			},
			title:{
				type:"string",
				optional:true
			},
			model:{
				type:"string",
				optional:true
			},
			locale: {
				type:"string",
				indexed:true
			},
			path: {
				type:"string",
				optional:true,
				indexed:true
			}
		}
	});

The path property contains a path to the HTML page to be displayed when a navigational component selects this item.

Please note that in this example, the locale property uses a slightly different format than the *lang* attribute used in dojo, but you could use that too.

In order to be able to edit html pages, they are stored in a REST capable service. This could be the file system, or you could set up some service that stores and retrieves HTML directly (like the formidable eXist database).
If the type property is changed to "persvr", another persevere model can be specified to load using the built-in mustache.js template engine! Other supported services are Atom (also templated with mustache.js) and XForms (requiring a special setup with Betterform).

Visit http://lagua.nl to discover more ways of setting up and using dlagua apps and for production-ready solutions including a CMS, client-side template editing and theming!

Reference:
* http://dojotoolkit.org
* http://persvr.org
* http://exist-db.org
* http://betterform.de
