define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojo/Deferred",
	"dojo/request",
	"dojo/keys",
	"dojo/json",
	"dijit/Dialog",
	"dijit/form/Form",
	"dijit/form/ValidationTextBox",
	"dijit/form/Button",
	"dlagua/form/Label",
	"dlagua/x/Aes"
], function(lang, array, domConstruct, Deferred, request, keys, JSON, Dialog, Form, ValidationTextBox, Button, Label, Aes){
	dlagua.c.rpc.auth = function(url,params){
		var d = new Deferred();
		var sessionParam = params.sessionParam;
		var json = true;
		var token;
		var authMsg;
		var authDialog;
		var form;
		
		var doReq = function(req){
			var d = new Deferred();
			request.post(url,{
				failOk:true,
				handleAs:"json",
				rawBody: JSON.stringify(req),
				headers: {
					"Accept":"application/json",
					"Content-Type":"application/json"
				}
			}).then(function(res,io){
				if(io.xhr.getResponseHeader(sessionParam)) {
					d.resolve(res);
				}
			},
			function(res,io) {
				// return here! first process auth then reload
				var err ="The server says: "+io.xhr.statusText+"<br/>Reason given: "+res.message;
				if(res.token) token = res.token;
				d.reject(err);
			});
			return d;
		}
		var doAuth = function() {
			if(!form.validate()) return;
			authMsg.innerHTML = "";
			var data = form.get("value");
			if(token!="") data.passwd = dlagua.x.Aes.Ctr.encrypt(data.passwd, token, 256);
			var req = {
				"id":"call-id",
				"method":"authenticate",
				"user":data.user,
				"password":data.passwd
			};
			doReq(req).then(function(auth){
				authDialog.hide();
				d.callback(auth);
			},function(err){
				authMsg.innerHTML = err;
			});
		}
		
		var createForm = function(){
			authDialog = new Dialog({
				title: "Login",
				style: "width:400px; height:300px;text-align:left;",
				content: "<div style=\"margin-bottom:10px\">Please login</div>"
			});
			form = new form.Form({
				style:"width:100%;height:100%"
			}).placeAt(authDialog.containerNode);
			var user = new ValidationTextBox({
				name:"user",
				placeHolder:"user",
				required:true,
				onKeyPress:function(e) {
					if(e.charOrCode==keys.ENTER) {
						doAuth();
					}
				}
			});
			var l = new Label({
				label:"user:",
				child:user
			}).placeAt(form.domNode);
			var passwd = new ValidationTextBox({
				name:"passwd",
				type:"password",
				placeHolder:"password",
				required:true,
				onKeyPress:function(e) {
					if(e.charOrCode==keys.ENTER) {
						doAuth();
					}
				}
			});
			var l = new Label({
				label:"password:",
				child:passwd
			}).placeAt(form.domNode);
			authMsg = domConstruct.create("div",{
				style:"color:red"
			},form.domNode);
			
			var bt = new Button({
				label:"Login",
				style:"float:right",
				onKeyPress:function(e) {
					if(e.charOrCode==keys.ENTER) {
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
	return dlagua.c.rpc.auth;
});