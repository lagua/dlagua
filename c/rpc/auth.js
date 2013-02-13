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
	lang.getObject("dlagua.c.rpc", true);

	var auth = function(url,params){
		var d = new Deferred();
		var sessionParam = params.sessionParam;
		var json = true;
		var token;
		var authMsg;
		var authDialog;
		var form;
		
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
				if(!d.isFulfilled()){
					if(res && res.user) {
						d.resolve(res);
					} else {
						d.reject();
					}
				}
			},function(err) {
			},function(xhr){
				token = xhr.getHeader("phrase");
				if(xhr.getHeader(sessionParam)) {
					d.resolve();
				} else {
					var msg ="The server says: "+xhr.statusText+"<br/>Reason given: "+xhr.responseText;
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
	dlagua.c.rpc.auth = auth;
	return auth;
});