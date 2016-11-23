class Maths {
	static clamp(value, min, max) {
		if (value < min) {
			return min;
		} else if (value > max) {
			return max;
		} else {
			return value;
		}
	}

	static towardsValue(value, amount, target) {
		if (value > target) {
			if (value - amount < target) {
				return target;
			} else {
				return value - amount;
			}
		} else if (value < target) {
			if (value + amount > target) {
				return target;
			} else {
				return value + amount;
			}
		} else {
			return value;
		}
	}

	static lerp(value, amount, target) {
		var total = target - value;
		return value + total * amount;
	}
}

export default Maths;