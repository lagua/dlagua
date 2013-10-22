define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dojo/sniff",
	"dojo/dom",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/registry",
	"dlagua/w/layout/ScrollableServicedPane"
 ], function(declare, lang, array, on, has, dom, domGeometry, domClass, domAttr, domConstruct, domStyle, registry, ScrollableServicedPane){
	var resizeTimeout;
	return declare("dlagua.w.layout.GridContainer",[ScrollableServicedPane],{
		cols:9,
		rows:100,
		gridChildren:null,
		size:100,
		tileSize:2,
		allowFill:false,
		allowOverlap:false,
		startup: function(){
			if(this._started) return;
			this.initRows = this.rows;
			this.inherited(arguments);
		},
		resize:function(){
			var gridSize = this.size;
			this._dim = this.getDim();
			this.set("cols",Math.floor(this._dim.v.w / gridSize));
			//clearTimeout(resizeTimeout);
	        // handle normal resize
	        //resizeTimeout = setTimeout(lang.hitch(this,function() {
	        	this.refresh();
	        	this.inherited(arguments);
	        //}),250);
		},
		sortBy: function(ar,keys){
			var terms = [];
			for(var i = 0; i < keys.length; i++){
				var sortAttribute = keys[i];
				var firstChar = sortAttribute.charAt(0);
				var term = {attribute: sortAttribute, ascending: true};
				if (firstChar == "-" || firstChar == "+") {
					if(firstChar == "-"){
						term.ascending = false;
					}
					term.attribute = term.attribute.substring(1);
				}
				terms.push(term);
			}
			ar.sort(function(a, b){
				for (var term, i = 0; term = terms[i]; i++) {
					if(a[term.attribute] != b[term.attribute]) {
						var ta = a[term.attribute];
						var tb = b[term.attribute];
						return term.ascending == a[term.attribute] > b[term.attribute] ? 1 : -1;
					}
				}
				return 0;
			});
			return ar;
		},
		getChildByIndex:function(index, children){
			children = children || this.gridChildren;
			for(var i=0,z=children.length;i<z;i++) {
				if(children[i].index==index) return children[i];
			}
			return null;
		},
		getChildById:function(id){
			var children = this.gridChildren;
			for(var i=0,z=children.length;i<z;i++) {
				if(children[i].id==id) return children[i];
			}
			return null;
		},
		addChild:function(widget,insertIndex){
			this.inherited(arguments);
			if(!this.gridChildren) this.gridChildren = [];
			var attrs = ["id","colSpan","rowSpan","minColSpan","order","index","region","allowTileSize","preventResize"];
			var widgetProps = {};
			array.forEach(attrs,function(attr){
				if(widget.hasOwnProperty(attr)) widgetProps[attr] = widget[attr];
			});
			setTimeout(lang.hitch(this,function(){
				var r = this._dim.v.w/this.cols;
				var colspan = Math.round(widget.marginBox.w/r);
				var rowspan = Math.round(widget.marginBox.h/r);
				widgetProps = lang.mixin({
					index: insertIndex !== undefined && typeof insertIndex !="string" ? insertIndex : (widget.order!==undefined ? parseInt(widget.order,10) : this.gridChildren.length+1),
					colSpan: colspan,
					rowSpan: rowspan,
					tier:1,
					priority:999,
					preventResize:true
				},widgetProps);
				this.gridChildren.push(widgetProps);
			}),2000);
		},
		_layoutChildren: function(){
			// Override _ContentPaneResizeMixin._layoutChildren because even when there's just a single layout child
			// widget, sometimes we don't want to size it explicitly (i.e. to pass a dim argument to resize())

			array.forEach(this.getChildren(), function(widget){
				if(widget.resize){
					widget.resize(widget._borderBox);
				}
			});
		},
		resetChildren:function(){
			var children = this.getChildren();
			for(var i = 0; i < children.length; i++){
				var item = children[i];
				// reset styles
				domClass.remove(item.domNode, this.childItemClass + "FirstColumn");
				domClass.remove(item.domNode, this.childItemClass + "LastColumn");
				domClass.remove(item.domNode, this.childItemClass + "FirstRow");
				domClass.remove(item.domNode, this.childItemClass + "LastRow");
			}
		},
		refresh:function(){
			if(!this._started || !this.gridChildren) return;
			var gridSize = this.size;
			this.set("cols",Math.floor(this._dim.v.w / gridSize));
			//this.set("rows",Math.floor(viewport.h / gridSize));
			// reset DOM
			this.resetChildren();
			var children = lang.clone(this.gridChildren);
			var matrix = this.calcMatrix(children);
			if(matrix) {
				this.printMatrix(matrix);
				this.sortChildren(matrix);
				this.matrixToDOM(matrix);
				this._layoutChildren();
			}
		},
		resizeFit:function(children,maxcols,maxrows){
			var matrix;
			while(!matrix) {
				// group by region
				var recalc;
				for(var i = 0;i<children.length;i++){
					if(children[i].minColSpan && children[i].colSpan>children[i].minColSpan) {
						children[i].colSpan--;
						recalc = true;
					}
				}
				if(recalc) {
					recalc = false;
					matrix = this.calcRegion(children,maxcols,maxrows);
				} else {
					break;
				}
			}
			return matrix;
		},
		tileFit:function(children,maxcols,maxrows,ignoreTier){
			var i = 0;
			for(;i<children.length;i++){
				var c = children[i];
				if(c.allowTileSize) {
					children[i].colSpan = children[i].rowSpan = this.tileSize;
					children[i].region = "trailing";
					if(ignoreTier) children[i].tier = 1;
				}
			}
			return this.calcRegion(children,maxcols,maxrows);
		},
		calcMatrix:function(children){
			var cols = 0,rows = 0;
			var matrix, matrices = [], hasTiles = false;
			var ri = 0;
			var self = this;
			var mc = this.cols, mr = this.rows;
			matrix = this.calcRegion(children,mc,mr);
			if(matrix) {
				matrix = this.updateMatrixRows(matrix,mc,this.rows);
				matrix = this.resizeChildren(matrix,children);
			}
			return matrix;
		},
		expandCenter:function(matrix,children,taken /* by other regions */){
			var empty = this.cols-taken;
			var len = matrix[0].length;
			for(var rc=0;rc<matrix.length;rc++) {
				var index = matrix[rc][0];
				for(var c = len; c<empty; c++) {
					matrix[rc][c] = index;
				}
			}
			return matrix;
		},
		getFree:function(matrix,mincol,minrow,maxcol,maxrow){
			var freeCols = 0, freeRows = 0;
			var row = this.getRowByIndex(matrix,0,mincol,minrow,maxcol,maxrow);
			if(!row.length) return [];
			if(maxrow===undefined && row[1]>mincol) {
				return this.getFree(matrix,mincol,minrow+1,maxcol,maxrow);
			}
			if(maxcol==this.cols && row[0]>minrow) {
				return this.getFree(matrix,mincol+1,minrow,maxcol,maxrow);
			}
			var cs, rs, ce, re;
			cs = row[1];
			rs = row[0];
			ce = Math.min(maxcol,matrix[rs].lastIndexOf(0));
			var col = this.columnFromMatrix(matrix,cs,rs,maxrow);
			re = rs+col.lastIndexOf(0);
			if(re==-1) re = maxrow;
			var free = true;
			for(var rc=rs;rc<re;rc++) {
				for(var cc=cs;cc<ce;cc++) {
					if(matrix[rc][cc]!==0) {
						free = false;
						break;
					}
				}
			}
			return free ? [cs,rs,ce,re] : [];
		},
		resizeChildren:function(matrix,children, hasTiles) {
			children = this.sortBy(children,["index"]);
			var cs, rs, ce, re, c, row;
			for(var i=0;i<children.length;i++) {
				c = children[i];
				if((hasTiles && c.allowTileSize) || c.preventResize) continue;
				row = this.getRowByIndex(matrix,c.index);
				cs = row[1];
				rs = row[0];
				ce = matrix[rs].lastIndexOf(c.index);
				re = this.columnFromMatrix(matrix,ce).lastIndexOf(c.index);
				var freeBelow = this.getFree(matrix,cs,rs,ce);
				if(freeBelow.length>0) {
					matrix = this.fillEmpty(matrix,freeBelow[0],freeBelow[1],freeBelow[2],freeBelow[3],c.index);
					if(freeBelow[3]>re) matrix = this.moveBlock(matrix,freeBelow[0],freeBelow[1],freeBelow[2],freeBelow[3],cs,re);
				}
			}
			return matrix;
		},
		filterBy:function(children,region,matrix) {
			var self = this;
			return array.filter(lang.clone(children),function(c){
				if(c.region==region) {
					for(var rc = 0;rc<matrix.length;rc++){
						var cc = matrix[rc].indexOf(c.index);
						if(cc>-1) {
							var col = self.columnFromMatrix(matrix,cc);
							var lastRow = array.lastIndexOf(col,c.index);
							c._box = [cc,rc,array.lastIndexOf(matrix[rc],c.index),lastRow];
							return c;
						}
					}
				}
			});
		},
		moveRow: function(row, firstCol, lastCol, newCol){
			var args = [newCol<=firstCol ? newCol : newCol-lastCol, 0].concat(row.splice(firstCol,lastCol-firstCol+1));
			Array.prototype.splice.apply(row, args);
			return row;
		},
		moveBlock: function(matrix,firstCol,firstRow,lastCol,lastRow, newCol, newRow) {
			if(newCol!==null && newCol!=firstCol) {
				for(var rc = firstRow; rc<=lastRow; rc++) {
					matrix[rc] = this.moveRow(matrix[rc], firstCol, lastCol, newCol);
				}
			}
			if(newRow!==null && newRow!=firstRow) {
				for(var cc = firstCol; cc<=lastCol; cc++) {
					var col = this.columnFromMatrix(matrix,cc);
					col = this.moveRow(col,firstRow,lastRow,newRow)
					for(var rc=0;rc<this.rows;rc++) {
						matrix[rc][cc] = col[rc];
					}
				}
			}
			return matrix;
		},
		getEmpty: function(matrix,firstCol,firstRow,lastCol,lastRow){
			var empty = 0;
			var row = matrix[firstRow];
			if(!row || row[lastCol]!==0) return empty;
			for(var x = lastCol;x>firstCol;x--) {
				var ecol = array.filter(this.columnFromMatrix(matrix,x,firstRow,lastRow),function(index){
					return index!==0;
				});
				if(row[x]===0 && ecol.length===0) {
					empty++;
				} else {
					break;
				}
			}
			return empty;
		},
		fillEmpty: function(matrix,firstCol,firstRow,lastCol,lastRow,index){
			for(var rc = firstRow; rc<=lastRow; rc++) {
				if(!matrix[rc]) {
					matrix[rc] = [];
					for(var cc = 0; cc<this.cols; cc++) {
						matrix[rc][cc] = 0;
					}
				}
				for(var cc = firstCol; cc<=lastCol; cc++) {
					matrix[rc][cc] = index;
				}
			}
			return matrix;
		},
		getRowByIndex:function(matrix,index,cs,rs,ce,re){
			cs = cs!==undefined ? cs : 0;
			rs = rs!==undefined ? rs : 0;
			ce = ce!==undefined ? ce : this.cols;
			re = re!==undefined ? re : this.rows;
			for(var rc=rs;rc<re;rc++){
				for(var cc=cs;cc<ce;cc++){
					if(matrix[rc][cc]==index) {
						return [rc,cc];
					}
				}
			}
			return [];
		},
		updateMatrixRows: function(matrix,maxcols,maxrows){
			for(var rc=0;rc<maxrows;rc++) {
				if(matrix[rc]) continue;
				matrix[rc] = [];
				for(var c = 0; c<maxcols; c++) {
					matrix[rc][c] = 0;
				}
			}
			return matrix;
		},
		calcRegion: function(children,maxcols,maxrows){
			var self = this;
			var colIdx = 0;
			var rowIdx=0;
			var matrix = [];
			var colspan, rowspan;
			var emptyX=0,emptyY=0;
			children = this.sortBy(children,["index"]);
			var rc,cc;
			var updateRowCount = function(h) {
				if(!h) h = 1;
				rowIdx+=h;
				checkRow(rowIdx);
			}
			var updateColCount = function(w){
				if(w===undefined) {
					// reset
					colIdx = 0;
				} else {
					colIdx+=w;
				}
			}
			var checkRow = function(rc){
				if(!matrix[rc]) {
					matrix[rc] = [];
					for(var c = 0; c<maxcols; c++) {
						matrix[rc][c] = 0;
					}
				}
			}
			for(rc = 0; rc<maxrows;rc++) {
				checkRow(rc);
			}
			updateColCount();
			for(var i = 0; i < children.length; i++){
				var item = children[i];
				colspan = item.colSpan;
				rowspan = item.rowSpan;
				// will it fit?
				var fit = function(){
					// stop trying if no more rows
					// or less columns than max width
					var cc=0, rc=0, range = [], inrange = false;
					if(rowIdx+rowspan>maxrows) return;
					if(colIdx+colspan>maxcols) {
						updateColCount();
						updateRowCount();
						return fit();
					}
					// just escape when the largest item is placed
					if(colspan==maxcols) {
						return true;
					}
					// check if seat is taken...
					if(!inrange) {
						if(colspan==1 && matrix[rowIdx] && matrix[rowIdx][colIdx]) {
							updateColCount(1);
							inrange = true;
						} else {
							range = matrix[rowIdx].slice(colIdx,colIdx+colspan);
							range = array.filter(range,function(cc){
								return cc!==0;
							});
							if(range.length>0) {
								updateColCount(range.length);
								inrange = true;
							}
						}
					}
					if(inrange) {
						return fit();
					} else {
						return true;
					}
				}
				var oldRow = rowIdx;
				var fits = fit();
				// stuff didn't fit
				if(!fits) return;
				// update matrix
				for(cc = colIdx; cc<colIdx+colspan; cc++) {
					for(rc=rowIdx;rc<rowIdx+rowspan;rc++) {
						checkRow(rc);
						matrix[rc][cc] = item.index;
					}
				}
				updateColCount(colspan);
				if(colIdx>=maxcols) {
					updateColCount();
					updateRowCount();
				}
			}
			return matrix;
		},
		sortChildren:function(matrix){
			var order = [];
			for(var rc = 0; rc<this.rows;rc++) {
				order = order.concat(matrix[rc]);
			}
			var childrenSorted = [];
			for(var i=0; i<order.length;i++) {
				var c = order[i];
				if(c && childrenSorted.indexOf(c)===-1) childrenSorted.push(c);
			}
			var domChildren = this.getChildren();
			var prevId;
			for(var i=0;i<childrenSorted.length;i++){
				var child = this.getChildByIndex(childrenSorted[i]);
				var id = child.id;
				if(domChildren[i].id != id) {
					if(!prevId) {
						domConstruct.place(dom.byId(id),this.containerNode,"first");
					} else {
						domConstruct.place(dom.byId(id),dom.byId(prevId),"after");
					}
				}
				prevId = id;
			}
		},
		printMatrix:function(matrix){
			var nCols = this.cols;
			var nRows = this.rows;
			for(var rc = 0;rc<nRows;rc++){
				if(!matrix[rc]) continue;
				var s = "";
				for(var cc = 0;cc<nCols;cc++){
					var n = matrix[rc][cc];
					var p = n!==0 && n < 10 ? "0" + n : n;
					s += "["+(n!==0 ? p : "--") + "]";
				}
				console.log(s);
			}
			console.log(".")
		},
		columnFromMatrix:function(matrix,n,min,max){
			if(n>=matrix[0].length) return;
			var col = [];
			if(min===undefined) min = 0;
			if(max===undefined) max = matrix.length;
			for(var i=min;i<max;i++) {
				col.push(matrix[i][n]);
			}
			return col;
		},
		getBox:function(node){
			var cs = domStyle.getComputedStyle(node);
			var regions = ["Top","Right","Bottom","Left"];
			var box = [0,0];
			for(var i=0;i<4;i++){
				box[i%2] += parseInt(cs["padding"+regions[i]],10);
				box[i%2] += parseInt(cs["margin"+regions[i]],10);
			}
			return box;
		},
		matrixToDOM:function(matrix){
			var nCols = this.cols;
			var nRows = this.rows;
			var self = this;
			var box = domGeometry.position(this.domNode);
			var w = Math.floor(box.w/nCols);
			var h = Math.floor(box.h/10);
			var children = [];
			for(var rc = 0;rc<nRows;rc++){
				if(!matrix[rc]) continue;
				for(var cc = 0;cc<nCols;cc++){
					var n = matrix[rc][cc];
					var item = n!== 0 ? (children[n] ? children[n] : lang.clone(this.getChildByIndex(n))) : null;
					if(item && !item._placed) {
						children[n] = item;
						var first = cc == 0;
						var last = cc == nCols-1;
						var lastCol = matrix[rc].lastIndexOf(n)+1;
						var col = this.columnFromMatrix(matrix,cc);
						var lastRow = col.lastIndexOf(n)+1;
						var colspan = lastCol-cc;
						var rowspan = lastRow-rc;
						var iw = w * colspan;
						var ih = 100 * rowspan;
						item._placed = [rc,cc];
						var widget = dom.byId(item.id);
						var box = this.getBox(widget);
						console.log(box)
						domStyle.set(widget, {
							//width: (iw - box[1]/2) + "px",
							position: "absolute",
							top: item._placed[0]*100+"px",
							left: item._placed[1]*w+"px",
							height: (ih - box[0]) + "px"
						});
						var borderBox = {
							w:(iw - box[1]/2),
							t:item._placed[0]*h,
							l:item._placed[1]*w,
							h:ih - box[0]
						};
						registry.byId(item.id)._borderBox = borderBox;
						domClass.toggle(widget, this.childItemClass + "FirstColumn", first);
						domClass.toggle(widget, this.childItemClass + "LastColumn", last);
						domClass.toggle(widget, this.childItemClass + "FirstRow", rc === 0);
						domClass.toggle(widget, this.childItemClass + "LastRow", rc + 1 === nRows);
					}
				}
			}
		}
	});
});