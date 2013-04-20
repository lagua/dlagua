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
"dojox/mobile/IconMenu"
 ], function(declare, lang, array, on, has, dom, domGeometry, domClass, domConstruct, domStyle, IconMenu){
	return declare("dlagua.x.mobile.GridLayout",IconMenu,{
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
		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			this.initRows = this.rows;
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
		getChildByIndex:function(index){
			var children = this.gridChildren;
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
		centerWidget:function(widget) {
			this.resetChildren();
			var children = lang.clone(this.gridChildren);
			var selected = this.getChildById(widget.id);
			var centerIdx, selIdx;
			for(var i=0;i<children.length;i++) {
				var c = children[i];
				if(c.id === widget.id) selIdx = i;
				if(c.hAlign === "center" && c.tier===selected.tier) centerIdx = i;
				if(selIdx && centerIdx) break;
			}
			if(selIdx===centerIdx) return;
			var center = lang.mixin({},children[centerIdx]);
			children[centerIdx].index = children[selIdx].index;
			children[centerIdx].id = children[selIdx].id;
			children[selIdx].index = center.index;
			children[selIdx].id = center.id;
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
			if(!this.gridTiers) this.gridTiers = [];
			var attrs = ["id","tier","colSpan","rowSpan","minColSpan","minRowSpan","priority","index","hAlign","allowTileSize"];
			var widgetProps = {};
			array.forEach(attrs,function(attr){
				if(widget.hasOwnProperty(attr)) widgetProps[attr] = widget[attr];
			});
			widgetProps = lang.mixin({
				index: insertIndex ? insertIndex : this.gridChildren.length+1,
				colSpan: 1,
				rowSpan: 1,
				priority:999,
				hAlign:"trailing"
			},widgetProps);
			if(widgetProps.tier && array.indexOf(this.gridTiers,widgetProps.tier)===-1) this.gridTiers.push(widgetProps.tier);
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
			var children = lang.clone(this.gridChildren);
			var matrix = this.calcMatrix(children);
			if(matrix) {
				this.printMatrix(matrix);
				this.sortChildren(matrix);
				this.matrixToDOM(matrix);
			}
		},
		resizeFitTier:function(children,nRows,maxCols){
			var matrix = this.calcTier(children,nRows,maxCols);
			if(matrix) return matrix;
			var allResized = false;
			while(!allResized && !matrix) {
				children = this.sortBy(children,["-priority","-hAlign"]);
				var i = 0;
				for(;i<children.length;i++){
					var c = children[i];
					if(c.minColSpan && c.colSpan>c.minColSpan) {
						children[i].colSpan--;
						break;
					}
				}
				matrix = this.calcTier(children,nRows,maxCols);
				if(i==children.length) allResized = true;
			}
			return matrix;
		},
		tileFitTier:function(children,nRows,maxCols){
			var i = 0;
			for(;i<children.length;i++){
				var c = children[i];
				if(c.allowTileSize) {
					children[i].colSpan = children[i].rowSpan = this.tileSize;
					children[i].hAlign = "trailing";
				}
			}
			return this.calcTier(children,nRows,maxCols);
		},
		calcMatrix:function(children){
			var tierMatrices = [];
			// process tiers
			var rows = 0;
			array.forEach(this.gridTiers,function(tier){
				children = array.filter(children,function(c){
					return c.tier == tier;
				});
				var matrix, maxCols = 1, maxRows = 1, minRows = 1;
				for(var i = 0; i < children.length; i++){
					maxCols = Math.max(maxCols,children[i].colSpan);
					maxRows = Math.max(maxRows,children[i].rowSpan);
				}
				if(maxRows<=this.rows){
					matrix = this.resizeFitTier(lang.clone(children),maxRows,maxCols);
					if(matrix) rows += matrix.length;
				}
				if(!matrix) {
					// increase with minRows
					minRows = maxRows;
					for(var i = 0; i < children.length; i++){
						minRows = Math.min(minRows,children[i].rowSpan);
					}
					if(maxRows+minRows<=this.rows) {
						matrix = this.resizeFitTier(lang.clone(children),maxRows+minRows,maxCols);
					}
					if(matrix) rows += matrix.length;
				}
				// if there still is no matrix, see if children may be resized to buttons
				// this means they should be placed in a certain region designated as button container
				var hasTiles = false;
				if(!matrix) {
					matrix = this.tileFitTier(lang.clone(children),maxRows,maxCols);
					if(!matrix && maxRows+this.tileSize<=this.rows) matrix = this.tileFitTier(lang.clone(children),maxRows+this.tileSize,maxCols);
					if(matrix) {
						hasTiles = true;
						rows += matrix.length;
					}
				}
				if(matrix) matrix = this.placeCenter(lang.clone(matrix),lang.clone(children),hasTiles);
				if(matrix) tierMatrices.push(matrix);
			},this);
			// are there rows to fill?
			if(tierMatrices[0] && rows<this.rows) {
				// FIXME: just using tier 1 for testing
				var center = this.filterBy(children,"center",tierMatrices[0])[0];
				// this means there is space below,
				// but center is not last
				var free = this.rows-rows;
				if(center._box[3]!=rows-1) {
					for(var i=0;i<free;i++) {
						tierMatrices[0].splice(center._box[3]+1,0,null);
					}
				}
				var lastRow = center._box[3]+free;
				tierMatrices[0] = this.fillEmpty(tierMatrices[0],center._box[0],center._box[3]+1,center._box[2],lastRow,center.index);
			}
			if(tierMatrices[0]) {
				var center = this.filterBy(children,"center",tierMatrices[0])[0];
				var free = this.getFree(tierMatrices[0]);
				console.log(free)
			}
			return Array.prototype.concat.apply([],tierMatrices);
		},
		getFree:function(matrix){
			var freeCols = 0, freeRows = 0;
			for(var rc = 0; rc<matrix.length; rc++){
				var free = array.filter(matrix[0],function(c){
					return c.index === 0;
				});
				freeCols += free.length;
			}
		},
		filterBy:function(children,region,matrix) {
			var self = this;
			return array.filter(lang.clone(children),function(c){
				if(c.hAlign==region) {
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
		moveBlock: function(matrix,firstCol,firstRow,lastCol,lastRow, newCol) {
			for(var rc = firstRow; rc<=lastRow; rc++) {
				var row = matrix[rc];
				var args = [newCol<=firstCol ? newCol : newCol-lastCol, 0].concat(row.splice(firstCol,lastCol-firstCol+1));
				Array.prototype.splice.apply(row, args);
				matrix[rc] = row;
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
		placeCenter:function(matrix,children,hasTiles){
			var center = [];
			var self = this;
			children = this.sortBy(children,["hAlign","priority","colSpan","rowSpan","index"]);
			var nRows = matrix.length;
			for(var rc = 0; rc<nRows; rc++) {
				if(!matrix[rc]) continue;
				var nCols = matrix[rc].length;
				for(var cc = 0; cc<nCols; cc++) {
					var row = matrix[rc];
					var index = row[cc];
					var c = array.filter(children,function(c){ return c.index===index; })[0];
					if(c && c.hAlign=="center") {
						// get center block
						var lastCol = row.lastIndexOf(index);
						var col = this.columnFromMatrix(matrix,cc);
						var lastRow = col.lastIndexOf(index);
						// see if there is space to fill up
						var empty = this.getEmpty(matrix,lastCol,rc,nCols-1,lastRow);
						if(empty>0) {
							matrix = this.fillEmpty(matrix,nCols-empty,rc,nCols-1,lastRow,index);
							matrix = this.moveBlock(matrix,nCols-empty,rc,nCols-1,lastRow,lastCol+1);
							row = matrix[rc];
						}
						if(!hasTiles) {
							var leadingInRow = array.filter(children,function(c){
								return c.hAlign=="leading" && row.indexOf(c.index) > -1;
							});
							if(leadingInRow.length){
								var lastLeadingInRow = leadingInRow.pop();
								var lastl = array.lastIndexOf(row,lastLeadingInRow.index);
								matrix = this.moveBlock(matrix,cc,rc,lastCol+empty,lastRow,lastl);
								cc = lastCol+1;
							}
						}
						row = matrix[rc];
						lastCol = row.lastIndexOf(index);
						col = this.columnFromMatrix(matrix,cc);
						lastRow = col.lastIndexOf(index);
						var emptyBelow = this.getEmpty(matrix,cc,lastRow+1,lastCol,nRows-1);
						if(emptyBelow===lastCol-cc) {
							matrix = this.fillEmpty(matrix,cc,lastRow+1,lastCol,nRows-1,index);
						}
						rc = lastRow+1;
						if(rc>=nRows) break;
					}
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
			children = this.sortBy(children,["hAlign","priority","colSpan","rowSpan","index"]);
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
			maxCols = Math.min(maxCols, nCols)
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
					// if overlap and fill not allowed and have height
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
										updateColCount();
										updateRowCount(h-rowIdx);
										break;
									}
								}
							}
						}
					}
					if(inrange) {
						return fit();
					} else {
						return true;
					}
				}
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
					console.log("sorted")
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
		matrixToDOM:function(matrix){
			var nCols = this.cols;
			var nRows = this.rows;
			var self = this;
			var box = domGeometry.position(this.domNode);
			var w = Math.floor(box.w/nCols);
			var h = Math.floor(box.h/nRows);
			var children = [];
			console.log(box.w,nCols,w)
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
						domStyle.set(widget, {
							width: iw + "px",
							position: "absolute",
							top: item._placed[0]*h+"px",
							left: item._placed[1]*w+"px",
							height: ih + "px"
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