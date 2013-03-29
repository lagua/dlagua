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
		getChildByIndex:function(children,index){
			for(var i=0,z=children.length;i<z;i++) {
				if(children[i].index==index) return children[i];
			}
			return null;
		},
		addChild:function(widget,insertIndex){
			this.inherited(arguments);
			if(!this.gridChildren) this.gridChildren = [];
			if(!this.gridTiers) this.gridTiers = [];
			var attrs = ["id","tier","colSpan","rowSpan","minColSpan","minRowSpan","priority","index","hAlign"];
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
				domStyle.set(item.domNode, {
					width: "auto",
					marginLeft: 0,
					height: "auto",
					marginBottom: 0
				});
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
				this.sortChildren(matrix,children);
				this.matrixToDOM(matrix,children);
			}
		},
		calcMatrix:function(children){
			var tierMatrices = [];
			// process tiers
			array.forEach(this.gridTiers,function(tier){
				children = array.filter(children,function(c){
					return c.tier == tier;
				});
				var matrix = this.calcTier(children);
				var allResized = false;
				while(!allResized && !matrix) {
					children = this.sortBy(children,["-priority","-region","-hAlign"]);
					var i = 0;
					for(;i<children.length;i++){
						var c = children[i];
						if(c.minColSpan && c.colSpan>c.minColSpan) {
							children[i].colSpan--;
							break;
						}
					}
					matrix = this.calcTier(children);
					if(i==children.length) allResized = true;
				}
				// if there still is no matrix, see if children may be resized to buttons
				// this means they should be placed in a certain region designated as button container
				if(matrix) matrix = this.placeCenter(lang.clone(matrix),children);
				if(matrix) tierMatrices = tierMatrices.concat(matrix);
			},this);
			return tierMatrices;
		},
		placeCenter:function(matrix,children){
			var center = [], leading = [];
			array.forEach(children,function(c){
				if(c.hAlign=="center" && center.indexOf(c.index)===-1) center.push(c.index);
				if(c.hAlign=="leading" && leading.indexOf(c.index)===-1) leading.push(c.index);
			});
			array.forEach(matrix,function(row,rc){
				array.forEach(center,function(c){
					var firstc = row.indexOf(c);
					if(firstc>-1) {
						// find last leading
						var lastl = -1;
						array.forEach(leading,function(l){
							var index = array.lastIndexOf(row,l);
							if(index>lastl) lastl = index;
						});
						if(lastl>-1) {
							var lastc = array.lastIndexOf(row,c);
							var args = [lastl-lastc, 0].concat(row.splice(firstc,lastc-firstc+1));
							Array.prototype.splice.apply(row, args);
							matrix[rc] = row;
						}
					}
				});
			});
			return matrix;
		},
		calcTier: function(children){
			var self = this;
			var colIdx = 0;
			var rowIdx=0;
			var matrix = [];
			var colspan, rowspan;
			var nRows = 1;
			var nCols = this.cols;
			var emptyX=0,emptyY=0;
			children = this.sortBy(children,["priority","hAlign","colSpan","rowSpan","index"]);
			var rc,cc;
			var maxCols = 1;
			var updateRowCount = function(h) {
				if(!h) h = 1;
				rowIdx+=h;
			}
			var updateColCount = function(w){
				if(w===undefined) {
					// reset
					colIdx = 0;
				} else {
					colIdx+=w;
				}
			}
			// since this calcs only tier, get max of tier
			for(var i = 0; i < children.length; i++){
				maxCols = Math.max(maxCols,children[i].colSpan);
				nRows = Math.max(nRows,children[i].rowSpan);
			}
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
					if(colspan==maxCols) return true;
					if(colIdx+colspan>nCols) {
						updateColCount();
						updateRowCount();
						return fit();
					}
					if(!inrange) {
						// check if:
						// - trailing before center
						// - same hAlign but lower prio
						range = matrix[rowIdx].slice(colIdx+colspan,nCols);
						for(cc=0;cc<range.length;cc++){
							if(range[cc]!==false) {
								var c = self.getChildByIndex(children,range[cc]);
								if(c && item.hAlign==c.hAlign && item.priority>c.priority) {
									updateColCount(1);
									inrange = true;
									break;
								}
							}
						}
						//if(inrange) console.log("trailing before or same prio")
					}
					// check if seat is taken...
					if(!inrange) {
						if(colspan==1 && matrix[rowIdx] && matrix[rowIdx][colIdx]!==false) {
							updateColCount(1);
							inrange = true;
						} else {
							range = matrix[rowIdx].slice(colIdx,colIdx+colspan);
							range = array.filter(range,function(cc){
								return cc!==false;
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
							if(range[cc]!==false) {
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
				if(oldRow!=rowIdx ||!fits) return ;
				// update matrix
				var checkRow = function(rc){
					if(!matrix[rc]) {
						matrix[rc] = [];
						for(var c = 0; c<nCols; c++) {
							matrix[rc][c] = false;
						}
					}
				}
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
		sortChildren:function(matrix,children){
			var order = [];
			for(var rc = 0; rc<this.rows;rc++) {
				order = order.concat(matrix[rc]);
			}
			var childrenSorted = [];
			for(var i=0; i<order.length;i++) {
				var c = order[i];
				if(c!==false && c!=undefined && childrenSorted.indexOf(c)===-1) childrenSorted.push(c);
			}
			var domChildren = this.getChildren();
			var prevId;
			for(var i=0;i<childrenSorted.length;i++){
				var child = this.getChildByIndex(children,childrenSorted[i]);
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
					var p = n!==false && n < 10 ? "0" + n : n;
					s += "["+(n!==false ? p : "--") + "]";
				}
				console.log(s);
			}
		},
		matrixToDOM:function(matrix,children){
			var nCols = this.cols;
			var nRows = this.rows;
			var self = this;
			children = this.sortBy(children,["index"]);
			var box = domGeometry.position(this.containerNode);
			var size = box.w/nCols;			
			var w = Math.floor(size/nCols);
			var _w = size - w*nCols;
			var h = Math.floor(size / nRows);
			var _h = size - h*nRows;
			if(has("ie")){
				_w--;
				_h--;
			}
			for(var rc = 0;rc<nRows;rc++){
				if(!matrix[rc]) continue;
				for(var cc = 0;cc<nCols;cc++){
					var n = matrix[rc][cc];
					var item = n!== false ? this.getChildByIndex(children,n) : null;
					if(item && !item._placed) {
						var first = cc == 0;
						var last = cc == nCols-1;
						var colspan = item.colSpan;
						var rowspan = item.rowSpan;
						var iw = w*colspan;
						var ih = h*rowspan;
						iw = size * colspan;
						ih = size * rowspan;
						item._placed = [rc,cc];
						/*
						var range = [];
						var before = false;
						var inline = false;
						
						if(rowspan>1) {
							// look in next row if there's anything
							range = matrix[rc+1] ? matrix[rc+1].slice(0,nCols) : [];
							for(var j=0;j<range.length;j++) {
								if(range[j]!==false) {
									before = j<cc;
									inline = rowspan-1;
									break;
								}
							}
							// if nothing before me, check if there is anything after me
							if(inline && !before) {
								var smaller = [];
								var bigger = [];
								range = matrix[rc] ? matrix[rc].slice(cc+colspan,nCols) : [];
								for(var j=0;j<range.length;j++) {
									if(range[j]!==false) {
										// ignore blocks of my size and larger
										var nxt = range[j];
										var nxtc = this.getChildByIndex(children,nxt);
										if(nxtc.rowSpan<rowspan) {
											smaller.push(nxt);
										} else {
											bigger.push(nxt);
										}
									}
								}
								// no equal or larger blocks after me
								if(!smaller.length) {
									inline = false;
									// check if there is anything starting below (overlapping)
									for(var i=0;i<rowspan;i++){
										range = matrix[rc+i] ? matrix[rc+i].slice(cc+colspan,nCols) : [];
										for(var j=0;j<range.length;j++) {
											// skip items in same row
											if(bigger.indexOf(range[j])>-1) continue;
											if(range[j]!==false) {
												// ignore blocks already placed
												var c = this.getChildByIndex(children,range[j]);
												if(!c._placed) {
													inline = rowspan-i;
													break;
												}
											}
										}
										if(inline!==false) break;
									}
								}
							}
						}
						var colsTaken = 0;
						// block was before, I'm on its nth row
						var blockBefore = function(cc){
							if(cc<1) return;
							var prev = matrix[rc][cc-1];
							var prevItem = self.getChildByIndex(children,prev);
							var prevcolspan = prevItem.colSpan;
							if(prevItem && prevcolspan) {
								if(matrix[rc-1] && matrix[rc-1][cc-1]===prev) {
									// if prev is first, make this first
									if(matrix[rc][0]===prev) first = true;
									colsTaken += prevcolspan;
									blockBefore(cc-prevcolspan);
								}
							} else if(prev===false) {
								colsTaken++;
								if(cc==1) first = true;
								blockBefore(cc-1);
							}
						}
						blockBefore(cc);
						// empty before?
						if(!colsTaken && cc>0) {
							var j = cc-1;
							while(matrix[rc] && matrix[rc][j]===false){
								colsTaken++;
								j--;
								if(j==0) {
									first = true;
									break;
								}
							}
						}*/
						var widget = dom.byId(item.id);
						domStyle.set(widget, {
							width: iw + "px",
							position: "absolute",
							top: item._placed[0]*size+"px",
							left: item._placed[1]*size+"px",
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