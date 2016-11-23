import Canvas from './Canvas';
import Vector from './Vector';
import Node from './Node';
import io from 'socket.io-client/socket.io';
import _ from 'underscore';
import Maths from './Maths';

class Game {
	constructor(parent) {
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

			console.log("MY PLAYER ID IS " + this.playerID);
		})

		this.socket.on('move', (data) => {
			console.log("Just got a move.");
			console.log(data);
			this.turn = data.turn;
			this.placeStone(data.x, data.y, data.playerID);
		})

		this.socket.on('move_error', (data) => {

		})

		this.selected = null;
		this.canvases = [];
		window.onresize = this.resizeCanvases.bind(this);
		document.onmouseover = this.onmousemove.bind(this);
		document.onmousemove = this.onmousemove.bind(this);
		document.onclick = this.onmouseclick.bind(this);
		this.canvasIndex = 0;
		this.backgroundCanvas = this.createCanvas('background');
		this.gridCanvas = this.createCanvas('grid');
		this.stoneCanvas = this.createCanvas('stone');
		this.tempCanvas = this.createCanvas('temp');
		this.uiCanvas = this.createCanvas('ui');
		this.drawBackground();

		this.columnWidth = 1;
		this.rowHeight = 1;

		this.gridWidth = 12;
		this.gridHeight = 12;
		this.grid = null;
		this.resetGrid();
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
				dist < (this.columnWidth * 0.45) / this.tempCanvas.scale &&
				!closest.placed
			) {
				this.selected = closest;
				this.tempCanvas.fillCircle(
					closest.pos, 
					this.columnWidth*0.45, 
					this.playerColours[this.playerID], 
					1
				);
			} else {
				this.selected = null;
			}
		} else {
			this.selected = null;
		}
	}

	onmouseclick() {
		if (this.selected != null) {
			console.log("making a move!");
			this.placeStone(this.selected.x, this.selected.y, this.playerID);
			this.socket.emit('move', {id: this.id, playerID: this.playerID, x: this.selected.x, y: this.selected.y});
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
					this.gridCanvas.fillRect(pos.x-4, pos.y-4, 8, 8, '#C2FCF7', 1);
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