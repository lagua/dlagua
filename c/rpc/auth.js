define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojo/Deferred",
	"dojo/request",
	"dojo/keys",
	"dojo/json",
	"dijit/Dialog",
	"dforma/Builder",
	"dlagua/x/Aes"
], function(lang, array, domConstruct, Deferred, request, keys, JSON, Dialog, Builder, Aes){

	var auth = function(url,params){
		var d = new Deferred();
		var sessionParam = params.sessionParam;
		var json = true;
		var token;
		var authMsg;
		var authDialog;
		var form;
		var hasSessParam;
		
		var doReq = function(data){
			var d = new Deferred();
			var req = request.post(url,{
				failOk:true,
				handleAs:"json",
				data: JSON.stringify(data),
				headers: {
					"Accept":"application/json",
					"Content-Type":"application/json"
				}
			});
			req.then(function(res){
				if(res && (res.user || hasSessParam)) {
					d.resolve(res);
				} else {
					if(!d.isFulfilled()) d.reject();
				}
			},function(err) {
				d.reject();
			},function(io){
				token = io.getHeader("phrase");
				if(io.getHeader(sessionParam)) {
					hasSessParam = true;
				} else {
					var msg ="The server says: "+io.xhr.statusText+"<br/>Reason given: "+io.xhr.responseText;
					d.reject(msg);
				}
			});
			return d;
		};
		var doAuth = function(data) {
			authMsg.innerHTML = "";
			var passwd = Aes.Ctr.encrypt(data.passwd, token, 256);
			var req = {
				"id":"call-id",
				"method":"authenticate",
				"user":data.user,
				"password":passwd
			};
			doReq(req).then(function(auth){
				authDialog.hide();
				d.resolve(auth);
			},function(err){
				authMsg.innerHTML = err;
			});
		};
		
		var createForm = function(){
			authDialog = new Dialog({
				title: "Login",
				style: "text-align:left;",
				content: "<div style=\"margin-bottom:10px\">Please login</div>"
			});
			form = new Builder({
				style:"max-height:300px;width:400px;overflow:auto",
				cancel: function(){
					editDlg.hide();
				},
				submit: function(){
					if(!this.validate()) return;
					var data = this.get("value");
					doAuth(data);
				},
				data:{
					controls:[{
						type:"input",
						name:"user",
						required:true,
						onKeyPress:function(e) {
							if(e.charOrCode==keys.ENTER) {
								form.submit();
							}
						}
					},{
						label:"password",
						name:"passwd",
						type:"password",
						required:true,
						onKeyPress:function(e) {
							if(e.charOrCode==keys.ENTER) {
								form.submit();
							}
						}
					}]
				}
			}).placeAt(authDialog.containerNode);
			authDialog.show();
			var fc = form.getChildren();
			var maingroup = fc.length ? fc[0] : null;
			authMsg = maingroup.messageNode;
		};
		
		var req = {
			"id":"call-id",
			"method":"verify"
		};
		
		doReq(req).then(function(auth){
			d.resolve(auth);
		},function(err){
			createForm();
		});
		
		return d;
	};
	
	lang.getObject("dlagua.c.rpc", true);
	dlagua.c.rpc.auth = auth;
	
	return auth;
});