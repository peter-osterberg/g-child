/**
 * @param {number} y
 * @param {{ isScrolled?: boolean, isHidden?: boolean, direction?: number }} [options]
 * @returns {{
 *   currentY: number,
 *   lastY: number,
 *   anchorY: number,
 *   direction: number,
 *   isHidden: boolean,
 *   isScrolled: boolean,
 * }}
 */
export function createHeaderScrollState(y = 0, { isScrolled = false, isHidden = false, direction = 0 } = {}) {
	return {
		currentY: y,
		lastY: y,
		anchorY: y,
		direction,
		isHidden,
		isScrolled,
	};
}

/**
 * @param {{
 *   currentY: number,
 *   lastY: number,
 *   anchorY: number,
 *   direction: number,
 *   isHidden: boolean,
 *   isScrolled: boolean,
 * }} state
 * @param {{ offset: number, threshold: number, revealGuard: number }} options
 * @returns {{
 *   state: {
 *     currentY: number,
 *     lastY: number,
 *     anchorY: number,
 *     direction: number,
 *     isHidden: boolean,
 *     isScrolled: boolean,
 *   },
 *   hidden: boolean,
 *   animate: boolean,
 *   useSwap: boolean,
 * }}
 */
export function resolveHeaderScrollUpdate(state, options) {
	const { currentY, lastY, anchorY, direction, isHidden, isScrolled } = state;
	const { offset, threshold, revealGuard } = options;
	const delta = currentY - lastY;

	if (currentY <= offset) {
		return {
			state: createHeaderScrollState(currentY),
			hidden: false,
			animate: false,
			useSwap: isScrolled,
		};
	}

	if (!isScrolled) {
		const nextHidden = delta >= 0;

		return {
			state: {
				currentY,
				lastY: currentY,
				anchorY: currentY,
				direction: delta > 0 ? 1 : 0,
				isHidden: nextHidden,
				isScrolled: true,
			},
			hidden: nextHidden,
			animate: false,
			useSwap: false,
		};
	}

	if (delta === 0) {
		return {
			state: {
				...state,
				currentY,
			},
			hidden: isHidden,
			animate: true,
			useSwap: false,
		};
	}

	const nextDirection = delta > 0 ? 1 : -1;
	let nextAnchorY = anchorY;

	if (nextDirection !== direction) {
		nextAnchorY = lastY;
	}

	if (currentY <= offset + revealGuard) {
		if (!isHidden) {
			nextAnchorY = currentY;
		}

		return {
			state: {
				currentY,
				lastY: currentY,
				anchorY: nextAnchorY,
				direction: -1,
				isHidden: true,
				isScrolled: true,
			},
			hidden: true,
			animate: true,
			useSwap: false,
		};
	}

	let nextHidden = isHidden;
	const distance = Math.abs(currentY - nextAnchorY);

	if (distance >= threshold) {
		if (nextDirection === 1 && !isHidden) {
			nextHidden = true;
			nextAnchorY = currentY;
		} else if (nextDirection === -1 && isHidden) {
			nextHidden = false;
			nextAnchorY = currentY;
		}
	}

	return {
		state: {
			currentY,
			lastY: currentY,
			anchorY: nextAnchorY,
			direction: nextDirection,
			isHidden: nextHidden,
			isScrolled: true,
		},
		hidden: nextHidden,
		animate: true,
		useSwap: false,
	};
}
