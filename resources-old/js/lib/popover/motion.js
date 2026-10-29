import { cleanInlineStyles, set } from 'animejs/utils';
import { waapi } from 'animejs/waapi';

/**
 * @param {unknown} value
 * @param {'from'|'to'} edge
 * @returns {unknown}
 */
function resolveAnimationEdge(value, edge) {
	if (Array.isArray(value) && value.length) {
		return edge === 'from' ? value[0] : value[value.length - 1];
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		if (edge === 'from' && Object.prototype.hasOwnProperty.call(value, 'from')) {
			return value.from;
		}

		if (edge === 'to' && Object.prototype.hasOwnProperty.call(value, 'to')) {
			return value.to;
		}
	}

	return edge === 'to' ? value : undefined;
}

/**
 * @param {HTMLElement} element
 * @returns {{ x: number, y: number, style: CSSStyleDeclaration }}
 */
function readElementTranslation(element) {
	const style = window.getComputedStyle(element);
	const transform = style.transform;

	if (!transform || transform === 'none') {
		return {
			x: 0,
			y: 0,
			style,
		};
	}

	const Matrix = window.DOMMatrixReadOnly || window.DOMMatrix || window.WebKitCSSMatrix;

	if (typeof Matrix !== 'function') {
		return {
			x: 0,
			y: 0,
			style,
		};
	}

	try {
		const matrix = new Matrix(transform);

		return {
			x: Number.isFinite(matrix.m41) ? matrix.m41 : 0,
			y: Number.isFinite(matrix.m42) ? matrix.m42 : 0,
			style,
		};
	} catch {
		return {
			x: 0,
			y: 0,
			style,
		};
	}
}

/**
 * @param {HTMLElement} element
 * @param {CSSStyleDeclaration} [style]
 * @returns {number}
 */
function readElementOpacity(element, style = undefined) {
	const resolvedStyle = style || window.getComputedStyle(element);
	const value = Number.parseFloat(resolvedStyle.opacity);

	return Number.isFinite(value) ? value : 1;
}

/**
 * @param {unknown} value
 * @param {number} size
 * @param {number} fallback
 * @returns {number}
 */
function resolveAxisValue(value, size, fallback) {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : fallback;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();

		if (!trimmed) {
			return fallback;
		}

		if (trimmed.endsWith('%')) {
			const percent = Number.parseFloat(trimmed.slice(0, -1));
			return Number.isFinite(percent) ? (size * percent) / 100 : fallback;
		}

		const numeric = Number.parseFloat(trimmed);
		return Number.isFinite(numeric) ? numeric : fallback;
	}

	return fallback;
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function resolveRawAxisValue(value, fallback) {
	if (typeof value === 'number') {
		return `${value}px`;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed || fallback;
	}

	return fallback;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function resolveOpacityValue(value, fallback) {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : fallback;
	}

	if (typeof value === 'string') {
		const numeric = Number.parseFloat(value);
		return Number.isFinite(numeric) ? numeric : fallback;
	}

	return fallback;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {{ includeZ?: boolean }} [options]
 * @returns {string}
 */
function buildTranslateTransform(x, y, options = {}) {
	const safeX = Number.isFinite(x) ? x : 0;
	const safeY = Number.isFinite(y) ? y : 0;

	if (options.includeZ) {
		return `translate3d(${safeX}px, ${safeY}px, 0px)`;
	}

	return `translate(${safeX}px, ${safeY}px)`;
}

/**
 * @param {string} x
 * @param {string} y
 * @param {{ includeZ?: boolean }} [options]
 * @returns {string}
 */
function buildRawTranslateTransform(x, y, options = {}) {
	if (options.includeZ) {
		return `translate3d(${x}, ${y}, 0px)`;
	}

	return `translate(${x}, ${y})`;
}

/**
 * Resolve the initial inline styles implied by a simple WAAPI config.
 *
 * @param {object} params
 * @param {{ includeZ?: boolean }} [options]
 * @returns {{ transform?: string, opacity?: string }}
 */
function buildAnimationStartStyles(params, options = {}) {
	const styles = {};
	const hasX = Object.prototype.hasOwnProperty.call(params, 'x');
	const hasY = Object.prototype.hasOwnProperty.call(params, 'y');
	const hasOpacity = Object.prototype.hasOwnProperty.call(params, 'opacity');

	if (hasX || hasY) {
		const startX = resolveRawAxisValue(resolveAnimationEdge(params.x, 'from'), '0px');
		const startY = resolveRawAxisValue(resolveAnimationEdge(params.y, 'from'), '0px');

		styles.transform = buildRawTranslateTransform(startX, startY, options);
	}

	if (hasOpacity) {
		const startOpacity = resolveAnimationEdge(params.opacity, 'from');

		if (typeof startOpacity === 'number' || typeof startOpacity === 'string') {
			styles.opacity = String(startOpacity);
		}
	}

	return styles;
}

/**
 * Build WAAPI params that can restart from the current rendered state.
 *
 * @param {HTMLElement} element
 * @param {object} params
 * @param {{ fromCurrent?: boolean, includeZ?: boolean }} [options]
 * @returns {object}
 */
/**
 * Build WAAPI params that can restart from the current rendered state.
 *
 * @param {HTMLElement} element
 * @param {object} params
 * @param {{ fromCurrent?: boolean, includeZ?: boolean }} [options]
 * @returns {object}
 */
function buildStateAwareAnimationParams(element, params, options = {}) {
	const hasX = Object.prototype.hasOwnProperty.call(params, 'x');
	const hasY = Object.prototype.hasOwnProperty.call(params, 'y');
	const hasOpacity = Object.prototype.hasOwnProperty.call(params, 'opacity');

	if (!hasX && !hasY && !hasOpacity) {
		return { ...params };
	}

	const animation = { ...params };

	let current = null;
	let width = 0;
	let height = 0;

	delete animation.x;
	delete animation.y;
	delete animation.opacity;

	if (hasX || hasY) {
		current = readElementTranslation(element);

		const needsWidthMeasurement =
			hasX &&
			(typeof resolveAnimationEdge(params.x, 'from') === 'string' ||
				typeof resolveAnimationEdge(params.x, 'to') === 'string');
		const needsHeightMeasurement =
			hasY &&
			(typeof resolveAnimationEdge(params.y, 'from') === 'string' ||
				typeof resolveAnimationEdge(params.y, 'to') === 'string');

		if (needsWidthMeasurement || needsHeightMeasurement) {
			const rect = element.getBoundingClientRect();

			if (needsWidthMeasurement) {
				width = rect.width;
			}

			if (needsHeightMeasurement) {
				height = rect.height;
			}
		}

		let fromX = current.x;
		let fromY = current.y;

		if (!options.fromCurrent) {
			if (hasX) {
				fromX = resolveAxisValue(resolveAnimationEdge(params.x, 'from'), width, current.x);
			}

			if (hasY) {
				fromY = resolveAxisValue(resolveAnimationEdge(params.y, 'from'), height, current.y);
			}
		}

		const toX = hasX ? resolveAxisValue(resolveAnimationEdge(params.x, 'to'), width, fromX) : fromX;
		const toY = hasY ? resolveAxisValue(resolveAnimationEdge(params.y, 'to'), height, fromY) : fromY;

		animation.transform = [
			buildTranslateTransform(fromX, fromY, { includeZ: options.includeZ }),
			buildTranslateTransform(toX, toY, { includeZ: options.includeZ }),
		];
	}

	if (hasOpacity) {
		const style = current?.style;
		const currentOpacity = readElementOpacity(element, style);
		const fromOpacity = options.fromCurrent
			? currentOpacity
			: resolveOpacityValue(resolveAnimationEdge(params.opacity, 'from'), currentOpacity);
		const toOpacity = resolveOpacityValue(resolveAnimationEdge(params.opacity, 'to'), fromOpacity);

		animation.opacity = [fromOpacity, toOpacity];
	}

	return animation;
}

/**
 * Handles popover animation lifecycle.
 */
class GcPopoverMotion {
	/**
	 * @param {object} options
	 * @param {object} options.openAnimationParams
	 * @param {object} options.closeAnimationParams
	 */
	constructor({ openAnimationParams, closeAnimationParams }) {
		this.openAnimationParams = openAnimationParams;
		this.closeAnimationParams = closeAnimationParams;
		this.animation = null;
		this.preparer = null;
	}

	/**
	 * @param {'open'|'close'} type
	 * @param {HTMLElement} element
	 * @param {{ fromCurrent?: boolean }} [options]
	 * @returns {void}
	 */
	prepare(type, element, options = {}) {
		this.clearPrepared();
		this.setWillChange(element);

		if (options.fromCurrent) {
			return;
		}

		const params = type === 'open' ? this.openAnimationParams : this.closeAnimationParams;
		const startStyles = buildAnimationStartStyles(params);

		if (Object.keys(startStyles).length) {
			this.preparer = set(element, startStyles);
		}
	}

	/**
	 * @param {'open'|'close'} type
	 * @param {HTMLElement} element
	 * @param {{ fromCurrent?: boolean }} [options]
	 * @returns {unknown}
	 */
	run(type, element, options = {}) {
		const params = type === 'open' ? this.openAnimationParams : this.closeAnimationParams;
		const resolvedParams = buildStateAwareAnimationParams(element, params, options);
		const onBegin = resolvedParams.onBegin;
		const onComplete = resolvedParams.onComplete;

		this.animation = waapi.animate(element, {
			...resolvedParams,
			onBegin: (animation) => {
				this.clearPrepared();
				this.setWillChange(element);

				if (typeof onBegin === 'function') {
					onBegin(animation);
				}
			},
			onComplete: (animation) => {
				if (animation) {
					cleanInlineStyles(animation);
				}

				this.clearWillChange(element);

				if (typeof onComplete === 'function') {
					onComplete(animation);
				}
			},
		});

		return this.animation;
	}

	/**
	 * @returns {void}
	 */
	stop() {
		if (!this.animation) {
			return;
		}

		if (typeof this.animation.cancel === 'function') {
			this.animation.cancel();
		} else if (typeof this.animation.pause === 'function') {
			this.animation.pause();
		}

		this.animation = null;
	}

	/**
	 * @returns {Promise<void>}
	 */
	async wait() {
		if (!this.animation) {
			return;
		}

		try {
			await this.animation;
		} catch {
			return;
		}
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.animation = null;
		this.clearPrepared();
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {void}
	 */
	cleanup(element) {
		this.clearPrepared();

		if (this.animation) {
			try {
				cleanInlineStyles(this.animation);
			} catch {
				// Fall through to the direct cleanup below when Anime cannot clean the cancelled animation.
			}
		}

		element.style.transform = '';
		element.style.opacity = '';
		element.style.filter = '';
		this.clearWillChange(element);
		this.animation = null;
	}

	/**
	 * @returns {void}
	 */
	clearPrepared() {
		if (this.preparer && typeof this.preparer.revert === 'function') {
			this.preparer.revert();
		}

		this.preparer = null;
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {void}
	 */
	setWillChange(element) {
		element.style.willChange = 'transform, opacity';
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {void}
	 */
	clearWillChange(element) {
		element.style.willChange = '';
	}
}

export default GcPopoverMotion;
