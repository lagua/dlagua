define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/dom-construct",
	"dojo/io-query",
	"dojo/Deferred",
	"dojo/request",
	"dojo/keys",
	"dojo/json",
	"dijit/Dialog",
	"dforma/Builder",
	"dlagua/x/Aes"
], function(lang, array, domConstruct, ioQuery,Deferred, request, keys, JSON, Dialog, Builder, Aes){

	var auth = function(url,params){
		params = params || {};
		var d = new Deferred();
		var sessionParam = params.sessionParam;
		var method = params.method || "post";
		var json = params.json;
		var userPrefix = params.userPrefix || "";
		var duration = params.duration;
		var token;
		var authDialog;
		var form;
		var hasSessParam;
		
		var doReq = function(data){
			var d = new Deferred();
			if(method=="get") {
				requrl = url+"?"+ioQuery.objectToQuery(data);
			}
			var req = request[method](requrl,{
				failOk:true,
				handleAs:"json",
				data: json ? JSON.stringify(data) : data,
				headers: json ? {
					"Accept":"application/json",
					"Content-Type":"application/json"
				} : {}
			});
			req.then(function(res){
				if(res && (res.user || hasSessParam)) {
					d.resolve(res);
				} else {
					if(!d.isFulfilled()) d.reject(res);
				}
			},function(err) {
				token = err.response.getHeader("phrase");
				var msg = err.response.xhr.responseText;
				d.reject(msg);
			},function(io){
				token = io.getHeader("phrase");
				if(io.getHeader(sessionParam)) {
					hasSessParam = true;
				}
			});
			return d;
		};
		var doAuth = function(data) {
			form.set("message","");
			var password = token ? Aes.Ctr.encrypt(data.password, token, 256) : data.password;
			var req = {
				"user":userPrefix+data.user,
				"password":password
			};
			if(json) {
				lang.mixin(req,{
					"id":"call-id",
					"method":"authenticate"
				});
			}
			if(duration) req.duration = duration;
			doReq(req).then(function(auth){
				authDialog.hide();
				d.resolve(auth);
			},function(err){
				form.set("message",err);
			});
		};
		
		var createForm = function(errmsg){
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
						name:"password",
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
			if(errmsg) form.set("message",errmsg);
		};
		
		var req = json ? {
			"id":"call-id",
			"method":"verify"
		} : {};
		
		doReq(req).then(function(auth){
			d.resolve(auth);
		},function(errmsg){
			createForm(params.errorMessage);
		});
		
		return d;
	};
	
	lang.getObject("dlagua.c.rpc", true);
	dlagua.c.rpc.auth = auth;
	
	return auth;
});