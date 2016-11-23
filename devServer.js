"use strict";
var path = require('path');
var express = require('express');
var webpack = require('webpack');
var config = require('./webpack.config.js');
var uid = require('uid');
var _ = require('underscore');

var app = express();
var compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.use(express.static(path.join(__dirname, 'app', 'assets')));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

var server = require('http').createServer(app);
var io = require('socket.io')(server);

var players = [];
var turn = 0;

var grid = [];
var resetGrid = function(gridWidth, gridHeight) {
	for (var x = 0; x < gridWidth; x++) {
		grid.push([]);
		for (var y = 0; y < gridHeight; y++) {
			if (y % 2 == 0 || x < gridWidth-1) {
				grid[x].push(-1);
			} else {
				grid.push(undefined);
			}
		}
	}
}
resetGrid(12, 12);

io.on('connection', function(socket){
	var id = uid();
	console.log("user " +id + " connected.");

	var player = -1;
	if (players.length < 2) {
		player = players.length;
		players.push({id, player});
	}

	socket.emit('login', {id, turn, player, players});
	socket.broadcast.emit('create player', id);

	socket.on('move', function(move){
		var id = move.id;
		var x = move.x;
		var y = move.y;
		
		if (typeof(grid[x][y]) !== 'undefined') {
			if (grid[x][y] == -1) {
				grid[x][y] = move.playerID;
				turn = move.playerID == 0 ? 1 : 0;
				socket.broadcast.emit('move', {x, y, playerID: move.playerID, turn});
			} else {
				socket.emit('move_fail', {turn, x, y, msg: 'Square is taken'});
			}
		} else {
			socket.emit('move_fail', {turn, x, y, msg: 'Square is undefined'});
		}
	});
	socket.on('disconnect', function(){
		console.log('user disconnected');
		socket.broadcast.emit('remove player', id);
		players = _.filter(players, (p) => {
			return p.id != id;
		});
	});
});
server.listen(3000, function() {
	console.log("listening on port 3000");
});
