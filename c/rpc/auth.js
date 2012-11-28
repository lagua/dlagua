dojo.provide("dlagua.c.rpc.auth");

dojo.require("dijit.Dialog");
dojo.require("dijit.form.Form");
dojo.require("dijit.form.ValidationTextBox");
dojo.require("dijit.form.Button");
dojo.require("dforma.Label");
dojo.require("dlagua.x.Aes");

dlagua.c.rpc.auth = function(url,params){
	var d = new dojo.Deferred();
	var sessionParam = params.sessionParam;
	var json = true;
	var token;
	var authMsg;
	var authDialog;
	var form;
	
	var doReq = function(req){
		var d = new dojo.Deferred();
		dojo.xhrPost({
			url:url,
			failOk:true,
			handleAs:"json",
			rawBody: dojo.toJson(req),
			headers: {
				"Accept":"application/json",
				"Content-Type":"application/json"
			},
			load:function(res,io){
				if(io.xhr.getResponseHeader(sessionParam) || (res && res.user)) {
					d.callback(res);
				} else {
					token = io.xhr.getResponseHeader("phrase");
					d.errback();
				}
			},
			error:function(res,io){
				// return here! first process auth then reload
				token = io.xhr.getResponseHeader("phrase");
				var err ="The server says: "+io.xhr.statusText+"<br/>Reason given: "+res.message;
				d.errback(err);
			}
		});
		return d;
	}
	var doAuth = function() {
		if(!form.validate() || !token) return;
		authMsg.innerHTML = "";
		var data = form.get("value");
		var passwd = dlagua.x.Aes.Ctr.encrypt(data.passwd,token,256);//CryptoJS.AES.encrypt(data.passwd, token).toString();
		var req = {
			"id":"call-id",
			"method":"authenticate",
			"user":data.user,
			"password":passwd
		};
		doReq(req).then(function(auth){
			authDialog.hide();
			d.callback(auth);
		},function(err){
			authMsg.innerHTML = err;
		});
	}
	
	var createForm = function(){
		authDialog = new dijit.Dialog({
			title: "Login",
			style: "width:400px; height:300px;text-align:left;",
			content: "<div style=\"margin-bottom:10px\">Please login</div>"
		});
		form = new dijit.form.Form({
			style:"width:100%;height:100%"
		}).placeAt(authDialog.containerNode);
		var user = new dijit.form.ValidationTextBox({
			name:"user",
			placeHolder:"user",
			required:true,
			onKeyPress:function(e) {
				if(e.charOrCode==dojo.keys.ENTER) {
					doAuth();
				}
			}
		});
		var l = new dforma.Label({
			label:"user:",
			child:user
		}).placeAt(form.domNode);
		var passwd = new dijit.form.ValidationTextBox({
			name:"passwd",
			type:"password",
			placeHolder:"password",
			required:true,
			onKeyPress:function(e) {
				if(e.charOrCode==dojo.keys.ENTER) {
					doAuth();
				}
			}
		});
		var l = new dforma.Label({
			label:"password:",
			child:passwd
		}).placeAt(form.domNode);
		authMsg = dojo.create("div",{
			style:"color:red"
		},form.domNode);
		
		var bt = new dijit.form.Button({
			label:"Login",
			style:"float:right",
			onKeyPress:function(e) {
				if(e.charOrCode==dojo.keys.ENTER) {
					doAuth();
				}
			},
			onClick:function(){
				doAuth();
			}
		}).placeAt(form.domNode);
		// default here
		authDialog.show();
	}
	
	var req = {
		"id":"call-id",
		"method":"verify"
	};
	
	doReq(req).then(function(auth){
		d.callback(auth);
	},function(err){
		createForm();
	});
	
	return d;
};