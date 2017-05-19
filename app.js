var mongojs = require('mongojs');
var db = mongojs('localhost:27017/myGame', ['account', 'progress']);

require('./Entity');
require('./client/Inventory');

var express = require('express');
var app = express();
var server = require('http').Server(app);

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

server.listen(3000);
console.log('Server online');

var SOCKET_LIST = {};

var DEBUG = false;

var isValidPassword = function(data, cb) {
	db.account.find({username:data.username, password:data.password}, function(err, res){
		if(res.length > 0)
		cb(true);
		else
		cb(false);
	});
}

var isUsernameTaken = function(data, cb) {
	db.account.find({username:data.username}, function(err, res){
		if(res.length > 0)
		cb(true);
		else
		cb(false);
	});
}

var addUser = function(data, cb) {
	db.account.insert({username:data.username, password:data.password}, function(err){
		cb();
	});
}

var io = require('socket.io')(server, {});
io.sockets.on('connection', function(socket){

	socket.id = Math.random();

	SOCKET_LIST[socket.id] = socket;

	console.log('Socket connection');

	socket.on('signUp', function (data) {

		isUsernameTaken(data, function(res) {
			if(res) {
				socket.emit('signUpResponse', {sucess: false});
			} else {
				addUser(data, function() {
					socket.emit('signUpResponse', {sucess: true});
				});
			}
		});

	});

	socket.on('signIn', function (data) {

		isValidPassword(data, function (res) {
			if(res) {
				Player.onConnect(socket, data.username);
				socket.emit('signInResponse', {sucess: true});
			} else {
				socket.emit('signInResponse', {sucess: false});
			}
		});

	});

	socket.on('disconnect', function () {

		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);

	});

	socket.on('evalServer', function (data) {
		if(!DEBUG)
		return;

		var res = eval(data);
		socket.emit('evalAnswer', res);

	});

});

setInterval(function() {

	var packs = Entity.getFrameUpdateData();

	for(var i in SOCKET_LIST){

		var socket = SOCKET_LIST[i];
		socket.emit('init', packs.initPack);
		socket.emit('update', packs.updatePack);
		socket.emit('remove', packs.removePack);

	}

}, 1000/25);
