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

var players = {};
var turn = 0;

var connections = [];
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
resetGrid(19, 19);

io.on('connection', function(socket){
	var id = uid();
	console.log("user " +id + " connected.");

	var player = -1;
	if (typeof(players[0]) === 'undefined') {
		player = 0;
		players[0] = ({id, player});
	} else if (typeof(players[1]) === 'undefined') {
		player = 1;
		players[1] = ({id, player});
	} else {
		player = -1;
	}

	console.log(players[0], players[1]);

	socket.emit('login', {id, turn, player, grid, connections, players});
	socket.broadcast.emit('create player', id);

	socket.on('move', function(move){
		var id = move.id;
		var x = move.x;
		var y = move.y;
		
		if (typeof(grid[x][y]) !== 'undefined') {
			if (grid[x][y] == -1) {
				console.log(move.playerID, "moving at", x, y);
				grid[x][y] = move.playerID;
				turn = move.playerID == 0 ? 1 : 0;
				if (move.connected != null) {
					connections.push([
						{x: move.connected.x, y: move.connected.y},
						{x: move.x, y: move.y}
					]);
				}
				socket.broadcast.emit(
					'move', 
					{
						x, 
						y, 
						connected: move.connected, 
						playerID: move.playerID,
						turn
					}
				);
			} else {
				console.log("Square is taken.");
				socket.emit('move_fail', {turn, x, y, msg: 'Square is taken'});
			}
		} else {
			socket.emit('move_fail', {turn, x, y, msg: 'Square is undefined'});
		}
	});
	socket.on('disconnect', function(){
		console.log('user ' + id + ' disconnected');
		socket.broadcast.emit('remove player', id);
		if (typeof(players[0]) !== 'undefined' && players[0].id == id) players[0] = undefined;
		if (typeof(players[1]) !== 'undefined' && players[1].id == id) players[1] = undefined; 
		console.log(players[0], players[1]);
	});
});
server.listen(3000, function() {
	console.log("listening on port 3000");
});
