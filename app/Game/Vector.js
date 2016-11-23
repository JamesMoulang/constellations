class Vector {
	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	random() {
		return new Vector(
			Math.random() - 0.5,
			Math.random() - 0.5
		).normalised();
	}

	angleTo(v2) {
		return Math.atan2(v2.y - this.y, v2.x - this.x);
	}

	add(v2) {
		return new Vector(this.x + v2.x, this.y + v2.y);
	}

	minus(v2) {
		return new Vector(this.x - v2.x, this.y - v2.y);
	}

	times(s) {
		return new Vector(this.x * s, this.y * s);
	}

	divide(s) {
		return new Vector(this.x / s, this.y / s);
	}

	magnitude() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	distance(v2) {
		return this.minus(v2).magnitude();
	}

	lerp(v2, t) {
		var direction = v2.minus(this);
		var distance = direction.magnitude() * t;
		return this.add(direction.normalised().times(distance));
	}

	normalised() {
		var mag = this.magnitude();
		if (mag == 0) {
			return new Vector();
		} else {
			return this.divide(this.magnitude());
		}
	}
}

export default Vector;