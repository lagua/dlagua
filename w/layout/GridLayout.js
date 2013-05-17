define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/on",
	"dojo/sniff",
	"dojo/dom",
	"dojo/dom-geometry",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/registry",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dijit/layout/_ContentPaneResizeMixin"
 ], function(declare, lang, array, on, has, dom, domGeometry, domClass, domConstruct, domStyle, registry, _Contained, _Container, _WidgetBase, _ContentPaneResizeMixin){
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
			var viewport = domGeometry.position(this.domNode);
			var gridSize = this.size;
			this.set("cols",Math.floor(viewport.w / gridSize));
			this.set("rows",Math.floor(viewport.h / gridSize));
			this.refresh();
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
			var attrs = ["id","colSpan","rowSpan","minColSpan","minRowSpan","priority","tier","index","region","allowTileSize","preventResize"];
			var widgetProps = {};
			array.forEach(attrs,function(attr){
				if(widget.hasOwnProperty(attr)) widgetProps[attr] = widget[attr];
			});
			widgetProps = lang.mixin({
				index: insertIndex && typeof insertIndex !="string" ? insertIndex : this.gridChildren.length+1,
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
			var p = this.getParent();
			if(p){
				domClass.remove(p.domNode, "mblSimpleDialogDecoration");
			}
			// reset DOM
			this.resetChildren();
			this.regions = {
				leading:null,
				center:null,
				trailing:null
			};
			var children = lang.clone(this.gridChildren);
			var matrix = this.calcMatrix(children);
			if(matrix) {
				this.printMatrix(matrix);
				this.sortChildren(matrix);
				this.matrixToDOM(matrix);
			}
		},
		resizeFit:function(children,nRows,maxCols){
			var matrix = this.calcTier(children,nRows,maxCols);
			if(matrix) return matrix;
			var allResized = false;
			var getChildIndex = function(c){
				for(var i=0;i<children.length;i++) {
					if(children[i].index==c.index) return i;
				}
				return -1;
			}
			while(!matrix) {
				// group by region
				var groups = ["trailing","leading","center"];
				var recalc;
				for(var g=0;g<groups.length;g++) {
					var group = array.filter(children,function(_){ return _.region==groups[g]; });
					for(var i = 0;i<group.length;i++){
						var c = group[i];
						if(c.minColSpan && c.colSpan>c.minColSpan) {
							c.colSpan--;
							recalc = true;
						}
						var index = getChildIndex(c);
						if(index>-1) children[index] = c;
					}
				}
				if(recalc) {
					recalc = false;
					matrix = this.calcTier(children,nRows,maxCols);
				} else {
					break;
				}
			}
			return matrix;
		},
		tileFit:function(children,nRows,maxCols,ignoreTier){
			var i = 0;
			for(;i<children.length;i++){
				var c = children[i];
				if(c.allowTileSize) {
					children[i].colSpan = children[i].rowSpan = this.tileSize;
					children[i].region = "trailing";
					if(ignoreTier) children[i].tier = 1;
				}
			}
			return this.calcTier(children,nRows,maxCols);
		},
		calcMatrix:function(children){
			var rows = 0;
			var matrix, maxCols = this.cols, maxRows = 0;
			for(var i = 0; i < children.length; i++){
				maxCols = Math.max(maxCols,children[i].colSpan);
				maxRows = Math.max(maxRows,children[i].rowSpan);
			}
			this.cols = maxCols;
			this.rows = Math.max(this.rows,maxRows);
			//if(maxRows<=this.rows){
				matrix = this.resizeFit(lang.clone(children),maxRows,maxCols);
				if(matrix) rows += matrix.length;
			//}
			/*if(!matrix) {
				// increase with minRows
				minRows = maxRows;
				for(var i = 0; i < children.length; i++){
					minRows = Math.min(minRows,children[i].rowSpan);
				}
				if(maxRows+minRows<=this.rows) {
					matrix = this.resizeFit(lang.clone(children),maxRows+minRows,maxCols);
				}
				if(matrix) rows += matrix.length;
			}*/
			// if there still is no matrix, see if children may be resized to buttons
			// this means they should be placed in a certain region designated as button container
			var hasTiles = false;
			if(!matrix) {
				matrix = this.tileFit(lang.clone(children),maxRows,maxCols);
				if(!matrix) matrix = this.tileFit(lang.clone(children),maxRows,maxCols,true);
				if(!matrix) matrix = this.tileFit(lang.clone(children),maxRows+this.tileSize,maxCols,true);
				if(matrix) {
					matrix = this.updateMatrixRows(matrix);
					hasTiles = true;
					rows += matrix.length;
				}
			}
			if(matrix) {
				matrix = this.updateMatrixRows(matrix);
				matrix = this.resizeChildren(matrix,lang.clone(children),hasTiles);
				matrix = this.placeCenter(matrix,lang.clone(children));
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
			children = this.sortBy(children,["region","priority","colSpan","rowSpan","index"]);
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
					if(freeBelow[3]>re+1) matrix = this.moveBlock(matrix,freeBelow[0],freeBelow[1],freeBelow[2],freeBelow[3],cs,re+1);
					var col = this.columnFromMatrix(matrix,ce);
				}
			}
			for(var i=0;i<children.length;i++) {
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
		placeCenter:function(matrix,children){
			var center = [];
			var self = this;
			children = this.sortBy(children,["region","priority","colSpan","rowSpan","index"]);
			var nRows = matrix.length;
			var row, cs, rs, ce, re;
			var lmincols = this.cols, lminrows = this.rows, lmaxcols = 0, lmaxrows = 0;
			for(var i = 0;i<children.length;i++) {
				var c = children[i];
				if(c.region=="leading") {
					row = this.getRowByIndex(matrix,c.index);
					if(row.length>0) {
						cs = row[1];
						rs = row[0];
						ce = matrix[rs].lastIndexOf(c.index);
						re = this.columnFromMatrix(matrix,ce).lastIndexOf(c.index);
						lmincols = Math.min(lmincols,cs);
						lminrows = Math.min(lminrows,rs);
						lmaxcols = Math.max(lmaxcols,ce);
						lmaxrows = Math.max(lmaxrows,re);
					}
				}
			}
			matrix = this.moveBlock(matrix,lmincols,lminrows,lmaxcols,lmaxrows,0);
			return matrix;
		},
		updateMatrixRows: function(matrix,rc){
			for(var rc=0;rc<this.rows;rc++) {
				if(matrix[rc]) continue;
				matrix[rc] = [];
				for(var c = 0; c<this.cols; c++) {
					matrix[rc][c] = 0;
				}
			}
			return matrix;
		},
		calcTier: function(children,nRows,maxCols){
			var self = this;
			var colIdx = 0;
			var rowIdx=0;
			var matrix = [];
			var colspan, rowspan;
			var nCols = this.cols;
			var emptyX=0,emptyY=0;
			children = this.sortBy(children,["region","priority","tier","colSpan","rowSpan","index"]);
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
					for(var c = 0; c<nCols; c++) {
						matrix[rc][c] = 0;
					}
				}
			}
			for(rc = 0; rc<nRows;rc++) {
				checkRow(rc);
			}
			// since this calcs only tier, get max of tier
			//maxCols = Math.min(maxCols, nCols);
			updateColCount();
			for(var i = 0; i < children.length; i++){
				var item = children[i];
				colspan = item.colSpan;
				rowspan = item.rowSpan;
				var minCol = self.regions[item.region] ? self.regions[item.region] : 0;
				if(minCol) colIdx = minCol;
				// will it fit?
				var fit = function(){
					// stop trying if no more rows
					// or less columns than max width
					var cc=0, rc=0, range = [], inrange = false;
					if(rowIdx+rowspan>nRows) return;
					if(colIdx+colspan>nCols) {
						updateColCount();
						updateRowCount();
						return fit();
					}
					// just escape when the largest item is placed
					if(colspan==maxCols) return true;
					// check if seat is taken...
					if(!inrange) {
						if(colspan==1 && matrix[rowIdx] && matrix[rowIdx][colIdx]) {
							if(!minCol) {
								updateColCount(1);
							} else {
								updateRowCount(1);
							}
							inrange = true;
						} else {
							range = matrix[rowIdx].slice(colIdx,colIdx+colspan);
							range = array.filter(range,function(cc){
								return cc!==0;
							});
							if(range.length>0) {
								if(!minCol) {
									updateColCount(range.length);
								} else {
									updateRowCount(1);
								}
								inrange = true;
							}
						}
					}
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
									if(!minCol) updateColCount();
									updateRowCount(h-rowIdx);
									break;
								}
							}
						}
					}
					/*
					// if overlap not allowed and have height
					if(!inrange && !self.allowOverlap && rowspan>1) {
						// if block after or before me has 1 up
						// and less down than me
						range = matrix[rowIdx] ? matrix[rowIdx].slice(0,nCols) : [];
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
										if(!minCol) updateColCount();
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
						self.regions[item.region] = colIdx;
						return true;
					}
				}
				/*
				if(this.allowFill) {
					for(rc=emptyY;rc<nRows;rc++){
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
				if(colIdx>=nCols) {
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