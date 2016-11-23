import Vector from './Vector';

class Node {
	constructor(x, y, pos) {
		this.x = x;
		this.y = y;
		this.pos = pos;
		this.claimed = false;
		this.playerID = -1;
	}

	select(playerID) {
		if (!this.claimed) {
			this.claimed = true;
			this.playerID = playerID;
			return true;
		} else {
			return false;
		}
	}
}

export default Node;