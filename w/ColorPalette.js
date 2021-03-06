define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/Color", // dojo.Color dojo.Color.named
	"dojo/query",
	"dojo/dom-construct", // domConstruct.place
	"dojo/dom-attr",
	"dojo/dom-style",
	"dojo/string", // string.substitute
	"dojo/i18n",
	"dijit/ColorPalette",
	"dojox/color/Palette",
	"dojo/i18n!dojo/nls/colors",
	"dojo/colors"], function(declare, lang, array, Color, query, domConstruct, domAttr, domStyle, string, i18n, _ColorPalette, Palette) {

var ColorPalette = declare("dlagua.w.ColorPalette",[_ColorPalette], {
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
		for(palette in Palette.generators) {
			var p = Palette.generate(this.base, palette);
			var col = 0;
			this.customColors[row] = [];
			array.forEach(p.colors, function(color) {
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
		var alias = this._cells[this._selectedCell].dye._title;
		var baseAlias = this.baseAlias ? this.baseAlias+"_" : "";
		return baseAlias+alias;
	},
	setSelectedAlias:function(value,title){
		if(this._selectedCell == -1) return;
		var alias = title || value;
		var c = this._cells[this._selectedCell];
		c.dye.setColor(Color.fromString(value));
		var swatch = query(".dijitColorPaletteSwatch",c.node)[0]
		domStyle.set(swatch,"backgroundColor",value);
		domAttr.set(c.node,"title",alias);
		domAttr.set(swatch,"title",alias);
		domAttr.set(swatch,"alias",alias);
	},
	buildRendering: function(){
		// Instantiate the template, which makes a skeleton into which we'll insert a bunch of
		// <img> nodes
		this.inherited(arguments);

		//	Creates customized constructor for dye class (color of a single cell) for
		//	specified palette and high-contrast vs. normal mode.   Used in _getDye().
		if(this.palette != "custom" && this.palette != "variants") return;
		if(this.palette == "variants") this._prepareVariants();
		if(!this.customColors.length) {
			this.customColors = [["red"]];
			this.customTitles = i18n.getLocalization("dojo", "colors", this.lang);
		}
		this.palette = this.customColors.length+"x"+this.customColors[0].length;
		this._palettes[this.palette] = this.customColors;
		this._dyeClass = declare(ColorPalette._Color, {
			palette: this.palette
		});

		// Creates <img> nodes in each cell of the template.
		this._preparePalette(
			this._palettes[this.palette],
			this.customTitles);
	}
});

ColorPalette._Color = declare("dlagua.w._Color", Color, {
	// summary:
	//		Object associated with each cell in a ColorPalette palette.
	//		Implements dijit.Dye.

	// Template for each cell in normal (non-high-contrast mode).  Each cell contains a wrapper
	// node for showing the border (called dijitPaletteImg for back-compat), and dijitColorPaletteSwatch
	// for showing the color.
	template:
		"<span class='dijitInline dijitPaletteImg'>" +
			"<img src='${blankGif}' alt='${alt}' title='${title}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>" +
		"</span>",

	constructor: function(alias, row, col, title){
		this._title = title;
		this._row = row;
		this._col = col;
		this.setColor(Color.fromString(alias));
	},

	getValue: function(){
		// summary:
		//		Note that although dijit._Color is initialized with a value like "white" getValue() always
		//		returns a hex value
		return this.toCss(true);
	},

	fillCell: function(/*DOMNode*/ cell, /*String*/ blankGif){
		var html = string.substitute(this.template, {
			// substitution variables for normal mode
			color: this.toCss(true),
			blankGif: blankGif,
			alt: this._title,
			title: this._title
		});

		domConstruct.place(html, cell);
	}
});

return ColorPalette;
});