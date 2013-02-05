define(["dojo/_base/declare","dojo/_base/lang","dojo/dnd/Source","dijit/layout/BorderContainer"],function(declare,lang,Source,BorderContainer){
	return declare("dlagua.x.layout.DnDContainer",[BorderContainer],{
		dndController:Source,
		dndParams:["onDndDrop", "itemCreator", "onDndCancel", "checkAcceptance", "checkItemAcceptance", "dragThreshold", "betweenThreshold"],
		postCreate: function(){
			this.inherited(arguments);
			if(this.dndController){
				this.node = this.domNode;
				var params = {};
				for(var i = 0; i < this.dndParams.length; i++){
					if(this[this.dndParams[i]]){
						params[this.dndParams[i]] = this[this.dndParams[i]];
					}
				}
				this.dndController = new this.dndController(this.domNode, params);
			}
		},
		onDndDrop: function(source, nodes, copy, target){
			// summary:
			//		topic event processor for /dnd/drop, called to finish the DnD operation
			// source: Object
			//		the source which provides items
			// nodes: Array
			//		the list of transferred items
			// copy: Boolean
			//		copy items, if true, move items otherwise
			// target: Object
			//		the target which accepts items
			if(this == target){
				// this one is for us => move nodes!
				this.onDrop(source, nodes, copy);
			}
			this.onDndCancel();
		},
		checkAcceptance: function(source, nodes){
			// summary:
			//		checks if the target can accept nodes from this source
			// source: Object
			//		the source which provides items
			// nodes: Array
			//		the list of transferred items
			if(this == source){
				return !this.copyOnly || this.selfAccept;
			}
			for(var i = 0; i < nodes.length; ++i){
				var type = source.getItem(nodes[i].id).type;
				// type instanceof Array
				var flag = false;
				for(var j = 0; j < type.length; ++j){
					if(type[j] in this.accept){
						flag = true;
						break;
					}
				}
				if(!flag){
					return false;	// Boolean
				}
			}
			return true;	// Boolean
		}
	});
});