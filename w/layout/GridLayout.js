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
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dijit/layout/_ContentPaneResizeMixin"
 ], function(declare, lang, array, on, has, dom, domGeometry, domClass, domAttr, domConstruct, domStyle, registry, _Contained, _Container, _WidgetBase, _ContentPaneResizeMixin){
	var resizeTimeout;
	return declare("dlagua.w.layout.GridLayout",[_WidgetBase, _Container, _Contained,_ContentPaneResizeMixin],{
		cols:0,
		rows:0,
		childItemClass: "mblGridItem",
		baseClass: "mblGridLayout",
		tag: "div",
		_tags: "div",
		gridChildren:null,
		size:100,
		tileSize:2,
		allowFill:false,
		allowOverlap:false,
		buildRendering: function(){
			this.domNode = this.containerNode = this.srcNodeRef || domConstruct.create(this.tag);
			domAttr.set(this.domNode, "role", "menu");
			this.inherited(arguments);
		},
		startup: function(){
			if(this._started){ return; }
			this.initRows = this.rows;
			this.inherited(arguments);
		},
		resize:function(){
			this.inherited(arguments);
			clearTimeout(resizeTimeout);
	        // handle normal resize
	        resizeTimeout = setTimeout(lang.hitch(this,function() {
	        	this.refresh();
	        }),250);
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
		swapWidget:function(widget,target) {
			this.resetChildren();
			if(typeof widget == "string") widget = registry.byId(widget);
			if(typeof target == "string") target = registry.byId(target); 
			var children = lang.clone(this.gridChildren);
			var selected = this.getChildById(widget.id);
			var trgtIdx, selIdx;
			for(var i=0;i<children.length;i++) {
				var c = children[i];
				if(c.id === widget.id) selIdx = i;
				if(c.id === target.id) trgtIdx = i;
				if(selIdx && trgtIdx) break;
			}
			if(selIdx===trgtIdx) return;
			var temp = lang.mixin({},children[trgtIdx]);
			children[trgtIdx].index = children[selIdx].index;
			children[trgtIdx].id = children[selIdx].id;
			children[selIdx].index = temp.index;
			children[selIdx].id = temp.id;
			var matrix = this.calcMatrix(children);
			if(matrix) {
				this.printMatrix(matrix);
				this.sortChildren(matrix);
				this.matrixToDOM(matrix);
			}
		},
		addChild:function(widget,insertIndex){
			this.inherited(arguments);
			if(!this.gridChildren) this.gridChildren = [];
			var attrs = ["id","colSpan","rowSpan","minColSpan","order","index","region","allowTileSize","preventResize"];
			var widgetProps = {};
			array.forEach(attrs,function(attr){
				if(widget.hasOwnProperty(attr)) widgetProps[attr] = widget[attr];
			});
			widgetProps = lang.mixin({
				index: insertIndex !== undefined && typeof insertIndex !="string" ? insertIndex : (widget.order!==undefined ? parseInt(widget.order,10) : this.gridChildren.length+1),
				colSpan: 1,
				rowSpan: 1,
				tier:1,
				priority:999,
				region:"trailing"
			},widgetProps);
			this.gridChildren.push(widgetProps);
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
			if(!this._started) return;
			var viewport = domGeometry.position(this.domNode);
			var gridSize = this.size;
			this.set("cols",Math.floor(viewport.w / gridSize));
			this.set("rows",Math.floor(viewport.h / gridSize));
			// reset DOM
			this.resetChildren();
			var children = lang.clone(this.gridChildren);
			var matrix = this.calcMatrix(children);
			if(matrix) {
				this.printMatrix(matrix);
				this.sortChildren(matrix);
				this.matrixToDOM(matrix);
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
			var regions = {
				center:{
					children:[],
					prog:"default",
					cols:0,
					rows:0
				},
				leading:{
					children:[],
					prog:"default",
					cols:0,
					rows:0
				},
				trailing:{
					children:[],
					prog:"default",
					cols:0,
					rows:0
				}
			}
			for(var r in regions){
				regions[r].children = array.filter(children, function(_){
					return _.region == r;
				});
			}
			// TODO start with regionsizes
			// create region objects, keep regions props like tile, resize and sizes
			var self = this;
			var getRegion = function(region,resize,tile){
				var rc = regions[region].children;
				var colspan;
				regions[region].cols = 0;
				regions[region].rows = 0;
				for(var i=0;i<rc.length;i++) {
					if(resize && !tile) {
						colspan = rc[i].minColSpan ? rc[i].minColSpan : rc[i].colSpan;
					} else if(tile) {
						colspan = rc[i].allowTileSize ? self.tileSize : (rc[i].minColSpan ? rc[i].minColSpan : rc[i].colSpan);
					} else {
						colspan = rc[i].colSpan;
					}
					regions[region].cols = Math.max(regions[region].cols,colspan);
					regions[region].rows += rc[i].rowSpan;
				}
				return regions[region].cols;
			};
			var getRegionProg = function(s,resize,tile){
				var regs = ["trailing","leading","center"];
				var reg = regs[s];
				var ct = 0;
				var prog = resize && !tile ? "resize" : (tile ? "tile" : "default");
				for(var i = 0; i < 3; i++) {
					var curReg = i < s+1;
					ct += getRegion(regs[i],resize && curReg, tile && curReg);
				}
				if(ct>self.cols) {
					if(s<2) return getRegionProg(s+1,resize,tile);
				} else {
					for(var i = 0; i < s + 1; i++) {
						regions[regs[i]].prog = prog;
					}
					return true;
				}
			};
			var getProg = function(resize,tile){
				var fits = getRegionProg(0,resize,tile);
				if(!fits) {
					if(!resize) {
						getProg(true);
					} else if(!tile) {
						getProg(true,true);
					}
				}
			}
			getProg();
			for(var r in regions){
				var mc = regions[r].cols, mr = regions[r].rows;
				var rchildren = regions[r].children;
				var prog = regions[r].prog;
				if(prog=="default") {
					matrix = this.calcRegion(rchildren,mc,mr);
				} else if(prog=="resize"){
					matrix = this.resizeFit(rchildren,mc,mr);
				} else if(prog=="tile"){
					if(r != "trailing") {
						regions["trailing"].children = regions["trailing"].children.concat(rchildren);
						matrix = this.updateMatrixRows([],0,this.rows);
						matrices.push(matrix);
						continue;
					}
					matrix = this.tileFit(rchildren,mc,this.rows);
				}
				if(matrix) {
					matrix = this.updateMatrixRows(matrix,mc,this.rows);
					matrix = this.resizeChildren(matrix,rchildren,prog=="tile");
					matrices.push(matrix);
				}
			}
			if(cols > this.cols) {
				console.log("nofit")
				return
			}
			if(matrices.length==3) {
				matrices[0] = this.expandCenter(matrices[0],regions["center"].children,matrices[1][0].length+matrices[2][0].length);
				matrix = [];
				for(var rc=0;rc<this.rows;rc++){
					matrix[rc] = matrices[1][rc].concat(matrices[0][rc],matrices[2][rc]);
				}
				return matrix;
			}
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
					//var col = this.columnFromMatrix(matrix,ce);
				}
			}
			/*for(var i=0;i<children.length;i++) {
				c = children[i];
				if((hasTiles && c.allowTileSize) || c.preventResize) continue;
				row = this.getRowByIndex(matrix,c.index);
				cs = row[1];
				rs = row[0];
				ce = matrix[rs].lastIndexOf(c.index);
				re = this.columnFromMatrix(matrix,ce).lastIndexOf(c.index);
				var freeAfter = this.getFree(matrix,cs,rs,this.cols,re+1);
				if(freeAfter.length>0) {
					matrix = this.fillEmpty(matrix,freeAfter[0],freeAfter[1],freeAfter[2],freeAfter[3],c.index);
					if(freeAfter[2]>ce+1) matrix = this.moveBlock(matrix,freeAfter[0],freeAfter[1],freeAfter[2],freeAfter[3],ce+1,rs);
				}
			}*/
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
					/*
					// if block before me same region but other tier
					if(!inrange) {
						range = matrix[rowIdx] ? matrix[rowIdx].slice(0,colIdx) : [];
						for(cc=0;cc<range.length;cc++){
							if(range[cc]) {
								var prev = range[cc];
								var prevItem = self.getChildByIndex(prev,children);
								if(prevItem.region==item.region && prevItem.tier<item.tier) {
									inrange = true;
									var h = rowIdx;
									while(matrix[h] && matrix[h][cc]===prev) {
										h++;
									}
									updateColCount();
									updateRowCount(h-rowIdx);
									break;
								}
							}
						}
					}
					*/
					/*
					// if overlap not allowed and have height
					if(!inrange && !self.allowOverlap && rowspan>1) {
						// if block after or before me has 1 up
						// and less down than me
						range = matrix[rowIdx] ? matrix[rowIdx].slice(0,maxcols) : [];
						for(cc=0;cc<range.length;cc++){
							if(range[cc]===item.index) continue;
							if(range[cc]) {
								var nxt = range[cc];
								var up = matrix[rowIdx-1] ? matrix[rowIdx-1][cc] : false;
								if(nxt && up && up===nxt) {
									var h = rowIdx;
									while(matrix[h] && matrix[h][cc]===nxt) {
										h++;
									}
									if(h-rowIdx<rowspan) {
										inrange = true;
										updateColCount();
										updateRowCount(h-rowIdx);
										break;
									}
								}
							}
						}
					}
					*/
					if(inrange) {
						return fit();
					} else {
						return true;
					}
				}
				/*
				if(this.allowFill) {
					for(rc=emptyY;rc<maxrows;rc++){
						cc = matrix[rc] ? matrix[rc].indexOf(false) : -1;
						if(cc>-1) {
							emptyY = rc;
							emptyX = cc;
							break;
						}
					}
					colIdx = emptyX;
					rowIdx = emptyY;
				}
				*/
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
				updateRowCount(rowspan-1);
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
			var h = Math.floor(box.h/nRows);
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
						var ih = h * rowspan;
						item._placed = [rc,cc];
						var widget = dom.byId(item.id);
						var box = this.getBox(widget);
						console.log(box)
						domStyle.set(widget, {
							width: (iw - box[1]/2) + "px",
							position: "absolute",
							top: item._placed[0]*h+"px",
							left: item._placed[1]*w+"px",
							height: (ih - box[0]) + "px"
						});
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