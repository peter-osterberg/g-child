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
 * @param {HTMLDialogElement} element
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
 * @param {HTMLDialogElement} element
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
 * @returns {string}
 */
function buildTranslateTransform(x, y) {
	const safeX = Number.isFinite(x) ? x : 0;
	const safeY = Number.isFinite(y) ? y : 0;

	return `translate3d(${safeX}px, ${safeY}px, 0px)`;
}

/**
 * @param {string} x
 * @param {string} y
 * @returns {string}
 */
function buildRawTranslateTransform(x, y) {
	return `translate3d(${x}, ${y}, 0px)`;
}

/**
 * @param {object} params
 * @returns {{ transform?: string, opacity?: string }}
 */
function buildAnimationStartStyles(params) {
	const styles = {};
	const hasX = Object.prototype.hasOwnProperty.call(params, 'x');
	const hasY = Object.prototype.hasOwnProperty.call(params, 'y');
	const hasOpacity = Object.prototype.hasOwnProperty.call(params, 'opacity');

	if (hasX || hasY) {
		const startX = resolveRawAxisValue(resolveAnimationEdge(params.x, 'from'), '0px');
		const startY = resolveRawAxisValue(resolveAnimationEdge(params.y, 'from'), '0px');

		styles.transform = buildRawTranslateTransform(startX, startY);
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
 * @param {HTMLDialogElement} element
 * @param {object} params
 * @param {{ fromCurrent?: boolean }} [options]
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
	const current = readElementTranslation(element);
	const size = element.getBoundingClientRect();
	const width = size.width || element.offsetWidth || 0;
	const height = size.height || element.offsetHeight || 0;

	delete animation.x;
	delete animation.y;
	delete animation.opacity;

	if (hasX || hasY) {
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

		animation.transform = [buildTranslateTransform(fromX, fromY), buildTranslateTransform(toX, toY)];
	}

	if (hasOpacity) {
		const currentOpacity = readElementOpacity(element, current.style);
		const fromOpacity = options.fromCurrent
			? currentOpacity
			: resolveOpacityValue(resolveAnimationEdge(params.opacity, 'from'), currentOpacity);
		const toOpacity = resolveOpacityValue(resolveAnimationEdge(params.opacity, 'to'), fromOpacity);

		animation.opacity = [fromOpacity, toOpacity];
	}

	return animation;
}

/**
 * Handles the mobile menu dialog shell motion.
 */
class MobileMenuDialogMotion {
	/**
	 * @param {HTMLDialogElement} element
	 * @param {{ open?: object, close?: object }} [animations]
	 */
	constructor(element, animations = {}) {
		this.element = element;
		this.openAnimationParams = animations.open || {};
		this.closeAnimationParams = animations.close || {};
		this.animation = null;
		this.preparer = null;
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
		}

		this.animation = null;
	}

	/**
	 * @returns {void}
	 */
	clear() {
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
	 * @returns {void}
	 */
	cleanup() {
		this.clearPrepared();

		if (this.animation) {
			try {
				cleanInlineStyles(this.animation);
			} catch {
				// Ignore Anime cleanup failures after cancelled dialog motion.
			}
		}

		this.element.style.opacity = '';
		this.element.style.transform = '';
		this.element.style.willChange = '';
		this.animation = null;
	}

	/**
	 * @returns {void}
	 */
	prepareOpen() {
		const startStyles = buildAnimationStartStyles(this.openAnimationParams);

		this.clearPrepared();

		if (Object.keys(startStyles).length) {
			this.preparer = set(this.element, startStyles);
		}

		this.element.style.willChange = 'transform, opacity';
	}

	/**
	 * @param {'open'|'close'} type
	 * @param {{ fromCurrent?: boolean }} [options]
	 * @returns {unknown}
	 */
	run(type, options = {}) {
		this.stop();

		const params = type === 'open' ? this.openAnimationParams : this.closeAnimationParams;
		const resolvedParams = buildStateAwareAnimationParams(this.element, params, {
			fromCurrent: typeof options.fromCurrent === 'boolean' ? options.fromCurrent : type === 'close',
		});
		const onBegin = resolvedParams.onBegin;
		const onComplete = resolvedParams.onComplete;

		this.element.style.willChange = 'transform, opacity';
		this.animation = waapi.animate(this.element, {
			...resolvedParams,
			onBegin: (animation) => {
				this.clearPrepared();
				this.element.style.willChange = 'transform, opacity';

				if (typeof onBegin === 'function') {
					onBegin(animation);
				}
			},
			onComplete: (animation) => {
				if (animation) {
					cleanInlineStyles(animation);
				}

				this.element.style.willChange = '';

				if (typeof onComplete === 'function') {
					onComplete(animation);
				}
			},
		});

		return this.animation;
	}
}

export default MobileMenuDialogMotion;
