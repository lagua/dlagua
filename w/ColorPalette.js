define("dlagua/w/ColorPalette", ["dojo", "dijit", "dojo/colors", "dojo/i18n", "dijit/ColorPalette", "i18n!dojo/nls/colors","dojox/color/Palette"], function(dojo, dijit) {

dojo.declare("dlagua.w.ColorPalette",
	[dijit.ColorPalette],
	{
	palette: "7x10",
	base: "#ff0000",
	baseAlias:"",
	customColors:null,
	customTitles:null,
	_preparePalette:function(){
		if(this.palette == "custom" || this.palette == "variants") return;
		this.inherited(arguments);
	},
	_prepareVariants:function(){
		this.customColors = [];
		this.customTitles = {};
		var row = 0;
		for(palette in dojox.color.Palette.generators) {
			var p = dojox.color.Palette.generate(this.base, palette);
			var col = 0;
			this.customColors[row] = [];
			dojo.forEach(p.colors, function(color) {
				var hex = color.toHex();
				this.customColors[row][col] = hex;
				this.customTitles[hex] = palette+"_"+col;
				col++;
			},this);
			row++;
		}
	},
	getSelectedAlias:function() {
		if(this._selectedCell == -1) return;
		var alias = this._cells[this._selectedCell].dye._alias;
		var titles = this.customTitles ? this.customTitles : dojo.i18n.getLocalization("dojo", "colors", this.lang);
		var baseAlias = this.baseAlias ? this.baseAlias+"_" : "";
		return baseAlias+titles[alias];
	},
	buildRendering: function(){
		// Instantiate the template, which makes a skeleton into which we'll insert a bunch of
		// <img> nodes
		this.inherited(arguments);

		// Creates <img> nodes in each cell of the template.
		// Pass in "customized" dijit._Color constructor for specified palette and high-contrast vs. normal mode
		if(this.palette != "custom" && this.palette != "variants") return;
		if(this.palette == "variants") this._prepareVariants();
		if(!this.customColors.length) {
			this.customColors = [["red"]];
			this.customTitles = dojo.i18n.getLocalization("dojo", "colors", this.lang);
		}
		this.palette = this.customColors.length+"x"+this.customColors[0].length;
		this._preparePalette(
			this.customColors,
			this.customTitles,
			dojo.declare(dlagua.w._Color, {
				palette: this.palette
			})
		);
	}
});

dojo.declare("dlagua.w._Color", dojo.Color, {
	// summary:
	//		Object associated with each cell in a ColorPalette palette.
	//		Implements dijit.Dye.

	// Template for each cell in normal (non-high-contrast mode).  Each cell contains a wrapper
	// node for showing the border (called dijitPaletteImg for back-compat), and dijitColorPaletteSwatch
	// for showing the color.
	template:
		"<span class='dijitInline dijitPaletteImg'>" +
			"<img src='${blankGif}' alt='${alt}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>" +
		"</span>",

	constructor: function(/*String*/alias, /*Number*/ row, /*Number*/ col){
		this._alias = alias;
		this._row = row;
		this._col = col;
		this.setColor(dojo.colorFromString(alias));
	},

	getValue: function(){
		// summary:
		//		Note that although dijit._Color is initialized with a value like "white" getValue() always
		//		returns a hex value
		return this.toHex();
	},

	fillCell: function(/*DOMNode*/ cell, /*String*/ blankGif){
		var html = dojo.string.substitute(this.template, {
			// substitution variables for normal mode
			color: this.toHex(),
			blankGif: blankGif,
			alt: this._alias,
			left: this._col * -20 - 5,
			top: this._row * -20 - 5
		});

		dojo.place(html, cell);
	}
});

return dlagua.w.ColorPalette;

});