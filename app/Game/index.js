import Canvas from './Canvas';
import Vector from './Vector';
import Node from './Node';
import io from 'socket.io-client/socket.io';
import _ from 'underscore';
import Maths from './Maths';
import uid from 'uid';

class Game {
	constructor(parent) {
		this.windowFrameLooping = false;
		this.windowFrameCallbacks = {};
		this.windowFrameCallbackCount = 0;
		this.windowFrameCallbackIDs = [];
		this.connections = [];

		this.parent = parent;
		this.gamePadding = 64;
		this.gameWidth = 1024;
		this.gameHeight = 1024;
		
		this.id = null;
		this.playerID = null;
		this.turn = null;
		this.players = [];
		this.playerColours = ['#773344', '#C6B2F4'];

		this.socket = io();

		this.socket.on('login', (data) => {
			this.turn = data.turn;
			this.id = data.id;
			this.playerID = data.player;
			this.players = data.players;

			console.log(data.grid);

			for (var x = 0; x < data.grid.length; x++) {
				if (data.grid[x] != null) {
					for (var y = 0; y < data.grid[0].length; y++) {
						if (typeof(data.grid[x][y]) !== 'undefined') {
							if (data.grid[x][y] > -1) {
								console.log(data.grid[x][y]);
								this.placeStone(x, y, data.grid[x][y]);
							}
						}
					}
				}
			}

			for (var i = 0; i < data.connections.length; i++) {
				var c = data.connections[i];
				var s0 = data.connections[i][0];
				var s1 = data.connections[i][1];
				this.connectStones(
					this.grid[s0.x][s0.y],
					this.grid[s1.x][s1.y]
				);
			}

			console.log("MY PLAYER ID IS " + this.playerID);
		})

		this.socket.on('move', (data) => {
			console.log("Just got a move.");
			console.log(data);
			this.turn = data.turn;
			this.placeStone(data.x, data.y, data.playerID);
			if (data.connected != null) {
				this.connectStones(
					this.grid[data.connected.x][data.connected.y], 
					this.grid[data.x][data.y]
				);
			}
		})

		this.socket.on('move_fail', (data) => {
			console.log("move error", data);
			this.turn = data.turn;
		})

		this.drawingLine = false;
		this.selected = null;
		this.canvases = [];
		window.onresize = this.resizeCanvases.bind(this);
		document.onmouseover = this.onmousemove.bind(this);
		document.onmousemove = this.onmousemove.bind(this);
		document.onclick = this.onmouseclick.bind(this);
		document.onmousedown = this.onmousedown.bind(this);
		document.onmouseup = this.onmouseup.bind(this);
		this.canvasIndex = 0;
		this.backgroundCanvas = this.createCanvas('background');
		this.gridCanvas = this.createCanvas('grid');
		this.stoneCanvas = this.createCanvas('stone');
		this.tempCanvas = this.createCanvas('temp');
		this.uiCanvas = this.createCanvas('ui');
		this.drawBackground();

		this.columnWidth = 1;
		this.rowHeight = 1;

		this.gridWidth = 19;
		this.gridHeight = 19;
		this.grid = null;
		this.resetGrid();
	}

	subscribeToWindowFrame(callback) {
		var id = uid();
		this.windowFrameCallbacks[id] = callback;
		this.windowFrameCallbackIDs.push(id);
		this.windowFrameCallbackCount++;
		if (!this.windowFrameLooping) {
			this.windowFrameLooping = true;
			this.windowFrameLoop();
		}

		return id;
	}

	unsubscribeFromWindowFrame(id) {
		this.windowFrameCallbacks[id] = undefined;
		this.windowFrameCallbackIDs = _.filter(this.windowFrameCallbackIDs, function(_id) {
			return _id != id;
		});
		this.windowFrameCallbacks--;
		if (this.windowFrameCallbacks == 0) {
			this.windowFrameLooping = false;
		}
	}

	windowFrameLoop() {
		_.each(this.windowFrameCallbackIDs, function(id) {
			this.windowFrameCallbacks[id]();
		}.bind(this));

		window.requestAnimationFrame(this.windowFrameLoop.bind(this));
	}

	forEachNode(callback) {
		for (var x = 0; x < this.gridWidth; x++) {
			for (var y = 0; y < this.gridHeight; y++) {
				var node = this.grid[x][y];
				if (typeof(node) !== 'undefined') {
					callback(node, x, y);
				}
			}
		}
	}

	getTotalStones(playerID) {
		var total = 0;
		this.forEachNode(function(node, x, y) {
			if (node.playerID == playerID) {
				total++;
			}
		}.bind(this));
		return total;
	}

	onmousemove(e) {
		this.tempCanvas.clear();
		var gamePosition = new Vector(e.clientX, e.clientY).minus(this.gridCanvas.topLeft).divide(this.gridCanvas.scale);

		if (this.playerID != null && this.turn != null && this.playerID == this.turn) {
			//it's my turn.
			var y = Math.round(gamePosition.y / this.rowHeight);
			y = Maths.clamp(y, 0, this.gridHeight-1);
			var closest = this.grid[0][y];
			var dist = closest.pos.distance(gamePosition);
			var selected_x = -1;
			var selected_y = -1;
			for (var x = 0; x < this.gridWidth; x++) {
				var node = this.grid[x][y];
				if (typeof(node) !== 'undefined') {
					var d = node.pos.distance(gamePosition);
					if (d < dist) {
						dist = d;
						closest = node;
						selected_x = x;
						selected_y = y;
					}
				}
			}

			if (typeof(closest) !== 'undefined' && 
				dist < (this.columnWidth) / this.tempCanvas.scale) {
				if (this.getTotalStones(this.playerID) == 0 && !closest.claimed) {
					if (!this.drawingLine) {
						this.selected = closest;
						this.tempCanvas.fillCircle(
							closest.pos, 
							this.columnWidth*0.45, 
							this.playerColours[this.playerID], 
							1
						);
					}
				} else if (!this.drawingLine && closest.claimed && closest.playerID == this.playerID) {
					this.hovering = closest;
				} else {
					if (this.drawingLine && !closest.claimed) {
						this.lineEnd = closest;
						var connected = this.isConnected(this.lineEnd, this.hovering);
						this.tempCanvas.fillCircle(
							closest.pos, 
							this.columnWidth*0.45, 
							this.playerColours[this.playerID], 
							connected ? 1 : 0.25
						);
						if (connected) {
							this.tempCanvas.drawLine(
								this.hovering.pos.x,
								this.hovering.pos.y,
								this.lineEnd.pos.x,
								this.lineEnd.pos.y,
								this.playerColours[this.playerID],
								1
							)
						}
					} else {
						if (!this.drawingLine) {
							this.hovering = null;
						}
					}
				}
			} else {
				this.selected = null;
				if (!this.drawingLine) {
					this.hovering = null;
				}
			}
		} else {
			this.selected = null;
			if (!this.drawingLine) {
				this.hovering = null;
			}
		}
	}

	isConnected(p1, p2) {
		var x = Math.abs(p1.pos.x - p2.pos.x);
		var y = Math.abs(p1.pos.y - p2.pos.y);

		return (Math.abs(x * 2 - y) < 1 || p1.y == p2.y);
	}
   
	onmousedown() {
		if (this.getTotalStones(this.playerID) > 0 && this.hovering != null) {
			this.drawingLine = true;
		}
	}

	connectStones(s1, s2) {
		this.connections.push([s1, s2]);
		this.stoneCanvas.drawLine(
			s1.pos.x,
			s1.pos.y,
			s2.pos.x,
			s2.pos.y,
			this.playerColours[s1.playerID],
			1
		);
	}

	onmouseup() {
		if (this.drawingLine && 
			this.lineEnd != null && 
			this.hovering != null && 
			this.turn != null &&
			this.isConnected(this.lineEnd, this.hovering)
		) {
			// Try and connect the two stones.
			// If connected, and not a taken spot.
			console.log("trying to connect");
			this.placeStone(this.lineEnd.x, this.lineEnd.y, this.playerID);
			this.connectStones(this.lineEnd, this.hovering);
			this.socket.emit(
				'move', 
				{
					id: this.id, 
					connected: this.hovering,
					playerID: this.playerID,
					x: this.lineEnd.x, 
					y: this.lineEnd.y
				}
			);
			this.turn = null;
			this.drawingLine = false;
			this.lineEnd = null;
			this.hovering = null;
			this.selected = null;
		}
	}

	onmouseclick() {
		console.log(this.selected, this.drawingLine);
		if (this.selected != null && !this.drawingLine) {
			console.log("making a move!");
			this.placeStone(this.selected.x, this.selected.y, this.playerID);
			this.socket.emit('move', {id: this.id, connected: null, playerID: this.playerID, x: this.selected.x, y: this.selected.y});
			this.turn = null;
		}
	}

	placeStone(x, y, playerID) {
		if (this.grid[x][y].select(playerID)) {
			var node = this.grid[x][y];
			this.stoneCanvas.fillCircle(
				node.pos, 
				this.columnWidth*0.45, 
				this.playerColours[playerID], 
				1
			);
		}
	}

	drawBackground() {
		this.backgroundCanvas.ctx.fillStyle = '#15142D';
		this.backgroundCanvas.ctx.fillRect(0, 0, this.backgroundCanvas.canvas.width, this.backgroundCanvas.canvas.height);
		// this.gridCanvas.fillRect(0, 0, this.gameWidth, this.gameHeight, '#C2FCF7', 0.1);
	}

	createPlayer(id) {
		this.players.push({id});
	}

	resetGrid() {
		this.grid = [];

		this.columnWidth = this.gameWidth / (this.gridWidth-1);
		this.rowHeight = this.gameHeight / (this.gridHeight-1);

		for (var x = 0; x < this.gridWidth; x++) {
			this.grid.push([]);
			for (var y = 0; y < this.gridHeight; y++) {
				if (y % 2 == 0 || x < this.gridWidth-1) {
					var pos = new Vector(x*this.columnWidth, y*this.rowHeight);
					if (y % 2 != 0) {
						pos.x += this.columnWidth * 0.5;
					}
					this.grid[x].push(new Node(x, y, pos));
				} else {
					this.grid.push(undefined);
				}
			}
		}

		this.renderGrid();
	}

	renderGrid() {
		for (var x = 0; x < this.gridWidth; x++) {
			for (var y = 0; y < this.gridHeight; y++) {
				if (typeof(this.grid[x][y]) !== 'undefined') {
					var pos = this.grid[x][y].pos;
					this.gridCanvas.fillRect(pos.x-2, pos.y-2, 4, 4, '#D8FDF9', 1);
				}
			}
		}
	}

	redrawStones() {
		for (var x = 0; x < this.gridWidth; x++) {
			for (var y = 0; y < this.gridHeight; y++) {
				if (typeof(this.grid[x][y]) !== 'undefined' && this.grid[x][y].claimed) {
					var pos = this.grid[x][y].pos;
					var node = this.grid[x][y];
					this.stoneCanvas.fillCircle(
						node.pos, 
						this.columnWidth*0.45, 
						this.playerColours[node.playerID], 
						1
					);
				}
			}
		}
	}

	createCanvas(key) {
		var canvas = new Canvas(this.parent, this.canvasIndex, 'canvas_' + key, this.gamePadding, this.gameWidth, this.gameHeight);
		this.canvasIndex++;
		this.canvases.push(canvas);
		return canvas;
	}

	resizeCanvases() {
		_.each(this.canvases, function(c) {
			c.resize();
		});
		this.drawBackground();
		this.renderGrid();
		this.redrawStones();
	}
}

export default Game;