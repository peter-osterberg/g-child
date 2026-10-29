import { createHeaderScrollState, resolveHeaderScrollUpdate } from './header-scroll-state.js';

/**
 * @typedef {object} AutoHideHeaderOptions
 * @property {number} [offset] Scroll amount required before sticky mode starts.
 * @property {number} [threshold] Distance required before hide/show toggles.
 * @property {string} [hiddenClass] CSS class applied while the header is hidden.
 * @property {string} [scrolledClass] CSS class applied while sticky/scrolled mode is active.
 * @property {string} [solidClass] CSS class applied while the sticky header uses the solid surface.
 */

const MANAGED_CLASS = 'auto-hide-header-managed';
const NO_TRANSITION_CLASS = 'auto-hide-header-no-transition';
const SWAPPING_STATE_CLASS = 'is-swapping-scroll-state';

const DEFAULT_OPTIONS = {
	offset: 500,
	threshold: 12,
	hiddenClass: 'is-hidden',
	scrolledClass: 'is-scrolled',
	solidClass: 'is-solid',
};

/**
 *
 */
export default class AutoHideHeader {
	/**
	 * @param {HTMLElement|string} target
	 * @param {AutoHideHeaderOptions} [options]
	 */
	constructor(target, options = {}) {
		this.element = this.#resolveElement(target);
		this.options = this.#normalizeOptions(options);

		this.currentY = 0;
		this.lastY = 0;
		this.anchorY = 0;
		this.direction = 0;
		this.isHidden = false;
		this.isScrolled = false;
		this.ticking = false;
		this.rafId = null;
		this.stateSwapFrameId = null;
		this.noTransitionFrameId = null;
		this.noTransitionRestoreFrameId = null;
		this.viewportWidth = 0;
		this.revealGuard = 48;
		this.revealGuardFrameId = null;
		this.resizeObserver = null;
		this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

		this.onScroll = this.onScroll.bind(this);
		this.onResize = this.onResize.bind(this);
	}

	/**
	 * @returns {AutoHideHeader}
	 */
	init() {
		if (!(this.element instanceof HTMLElement)) {
			return this;
		}

		const y = this.#getScrollY();
		this.#setScrollState(createHeaderScrollState(y, { isScrolled: y > this.options.offset }));
		this.viewportWidth = window.innerWidth;

		this.element.classList.add(MANAGED_CLASS);
		this.#observeRevealGuard();
		this.#syncState(false, false);

		window.addEventListener('scroll', this.onScroll, { passive: true });
		window.addEventListener('resize', this.onResize, { passive: true });
		window.addEventListener('orientationchange', this.onResize);

		return this;
	}

	/**
	 * @returns {void}
	 */
	destroy() {
		if (!(this.element instanceof HTMLElement)) {
			return;
		}

		window.removeEventListener('scroll', this.onScroll);
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('orientationchange', this.onResize);

		if (this.rafId) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		if (this.stateSwapFrameId) {
			cancelAnimationFrame(this.stateSwapFrameId);
			this.stateSwapFrameId = null;
		}

		if (this.noTransitionFrameId) {
			cancelAnimationFrame(this.noTransitionFrameId);
			this.noTransitionFrameId = null;
		}

		if (this.noTransitionRestoreFrameId) {
			cancelAnimationFrame(this.noTransitionRestoreFrameId);
			this.noTransitionRestoreFrameId = null;
		}

		if (this.revealGuardFrameId) {
			cancelAnimationFrame(this.revealGuardFrameId);
			this.revealGuardFrameId = null;
		}

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;

		this.ticking = false;
		this.direction = 0;
		this.isHidden = false;
		this.isScrolled = false;

		this.element.classList.remove(
			MANAGED_CLASS,
			NO_TRANSITION_CLASS,
			SWAPPING_STATE_CLASS,
			this.options.hiddenClass,
			this.options.scrolledClass,
			this.options.solidClass,
		);

		this.element.removeAttribute('data-hidden');
		this.element.removeAttribute('data-scrolled');
		this.element.removeAttribute('data-solid');
	}

	/**
	 * @returns {void}
	 */
	onResize() {
		const y = this.#getScrollY();
		const nextViewportWidth = window.innerWidth;
		const widthChanged = nextViewportWidth !== this.viewportWidth;

		this.currentY = y;
		this.lastY = y;
		this.anchorY = y;
		this.direction = 0;
		this.viewportWidth = nextViewportWidth;

		if (!this.resizeObserver) {
			this.#scheduleRevealGuardMeasure();
		}

		if (widthChanged && y <= this.options.offset) {
			this.#setScrollState(createHeaderScrollState(y));
			this.#syncState(false, false);
			return;
		}

		this.#handleScroll();
	}

	/**
	 * @returns {void}
	 */
	onScroll() {
		this.currentY = this.#getScrollY();

		if (this.ticking) {
			return;
		}

		this.ticking = true;

		this.rafId = requestAnimationFrame(() => {
			this.#handleScroll();
			this.ticking = false;
			this.rafId = null;
		});
	}

	/**
	 * @returns {void}
	 */
	#handleScroll() {
		const update = resolveHeaderScrollUpdate(this.#getScrollState(), {
			offset: this.options.offset,
			threshold: this.options.threshold,
			revealGuard: this.revealGuard,
		});

		this.#setScrollState(update.state);

		if (update.useSwap) {
			this.#swapToDefaultState();
			return;
		}

		this.#syncState(update.hidden, update.animate);
	}

	/**
	 * Hide the element for one frame while removing the scrolled state so
	 * the visual theme swap never becomes visible.
	 *
	 * @returns {void}
	 */
	#swapToDefaultState() {
		if (!(this.element instanceof HTMLElement)) {
			return;
		}

		if (this.stateSwapFrameId) {
			cancelAnimationFrame(this.stateSwapFrameId);
			this.stateSwapFrameId = null;
		}

		this.element.classList.add(SWAPPING_STATE_CLASS);
		this.#syncState(false, false);

		this.stateSwapFrameId = requestAnimationFrame(() => {
			this.element?.classList.remove(SWAPPING_STATE_CLASS);
			this.stateSwapFrameId = null;
		});
	}

	/**
	 * @param {boolean} hidden
	 * @param {boolean} [animate]
	 * @returns {void}
	 */
	#syncState(hidden, animate = !this.reduceMotion.matches) {
		const instant = !animate || this.reduceMotion.matches;
		const wasHidden = this.element.classList.contains(this.options.hiddenClass);
		const solid = this.#shouldUseSolidSurface();

		if (instant) {
			this.element.classList.add(NO_TRANSITION_CLASS);
		} else {
			this.#clearPendingNoTransitionReset();
			this.element.classList.remove(NO_TRANSITION_CLASS);
		}

		this.element.classList.toggle(this.options.scrolledClass, this.isScrolled);
		this.element.classList.toggle(this.options.solidClass, solid);
		this.element.classList.toggle(this.options.hiddenClass, hidden);

		this.isHidden = hidden;
		this.element.setAttribute('data-scrolled', String(this.isScrolled));
		this.element.setAttribute('data-solid', String(solid));
		this.element.setAttribute('data-hidden', String(hidden));

		if (instant) {
			this.#scheduleNoTransitionReset();
		}

		if (wasHidden !== hidden) {
			this.element.dispatchEvent(
				new CustomEvent(hidden ? 'headerhide' : 'headershow', {
					detail: { hidden },
				}),
			);
		}
	}

	/**
	 * @param {AutoHideHeaderOptions} options
	 * @returns {AutoHideHeaderOptions & { offset: number }}
	 */
	#normalizeOptions(options) {
		const normalizedOptions = { ...DEFAULT_OPTIONS, ...options };
		const offset = this.#parseOffset(options.offset, DEFAULT_OPTIONS.offset);

		return {
			...normalizedOptions,
			offset,
		};
	}

	/**
	 * @param {number|undefined|null} value
	 * @param {number|null} fallback
	 * @returns {number|null}
	 */
	#parseOffset(value, fallback) {
		const parsed = Number(value);

		if (Number.isFinite(parsed) && parsed >= 0) {
			return parsed;
		}

		return fallback;
	}

	/**
	 * Keep the solid sticky surface attached to the sticky state itself.
	 * It should only drop once the header has been swapped back to the
	 * default state while hidden.
	 *
	 * @returns {boolean}
	 */
	#shouldUseSolidSurface() {
		return this.isScrolled;
	}

	/**
	 * @returns {void}
	 */
	#clearPendingNoTransitionReset() {
		if (this.noTransitionFrameId) {
			cancelAnimationFrame(this.noTransitionFrameId);
			this.noTransitionFrameId = null;
		}

		if (this.noTransitionRestoreFrameId) {
			cancelAnimationFrame(this.noTransitionRestoreFrameId);
			this.noTransitionRestoreFrameId = null;
		}
	}

	/**
	 * @returns {void}
	 */
	#scheduleNoTransitionReset() {
		this.#clearPendingNoTransitionReset();

		this.noTransitionFrameId = requestAnimationFrame(() => {
			this.noTransitionFrameId = null;

			this.noTransitionRestoreFrameId = requestAnimationFrame(() => {
				this.element?.classList.remove(NO_TRANSITION_CLASS);
				this.noTransitionRestoreFrameId = null;
			});
		});
	}

	/**
	 * @returns {void}
	 */
	#observeRevealGuard() {
		if (!(this.element instanceof HTMLElement)) {
			return;
		}

		if (typeof ResizeObserver !== 'function') {
			this.#scheduleRevealGuardMeasure();
			return;
		}

		this.resizeObserver?.disconnect();
		this.resizeObserver = new ResizeObserver((entries) => {
			const nextRevealGuard = this.#resolveObservedHeight(entries[0]);

			if (nextRevealGuard === null) {
				this.#scheduleRevealGuardMeasure();
				return;
			}

			this.revealGuard = Math.max(nextRevealGuard, 48);
		});

		this.resizeObserver.observe(this.element);
	}

	/**
	 * @returns {void}
	 */
	#scheduleRevealGuardMeasure() {
		if (this.revealGuardFrameId !== null) {
			return;
		}

		this.revealGuardFrameId = requestAnimationFrame(() => {
			this.revealGuardFrameId = null;

			if (!(this.element instanceof HTMLElement)) {
				return;
			}

			this.revealGuard = Math.max(this.element.offsetHeight || 0, 48);
		});
	}

	/**
	 * @param {ResizeObserverEntry|undefined} entry
	 * @returns {number|null}
	 */
	#resolveObservedHeight(entry) {
		if (!entry) {
			return null;
		}

		const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize;
		const nextHeight = borderBoxSize?.blockSize ?? entry.contentRect?.height ?? null;

		return Number.isFinite(nextHeight) ? nextHeight : null;
	}

	/**
	 * @returns {number}
	 */
	#getScrollY() {
		return Math.max(window.scrollY || window.pageYOffset || 0, 0);
	}

	/**
	 * @returns {{
	 *   currentY: number,
	 *   lastY: number,
	 *   anchorY: number,
	 *   direction: number,
	 *   isHidden: boolean,
	 *   isScrolled: boolean,
	 * }}
	 */
	#getScrollState() {
		return {
			currentY: this.currentY,
			lastY: this.lastY,
			anchorY: this.anchorY,
			direction: this.direction,
			isHidden: this.isHidden,
			isScrolled: this.isScrolled,
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
	 * @returns {void}
	 */
	#setScrollState(state) {
		this.currentY = state.currentY;
		this.lastY = state.lastY;
		this.anchorY = state.anchorY;
		this.direction = state.direction;
		this.isHidden = state.isHidden;
		this.isScrolled = state.isScrolled;
	}

	/**
	 * @param {HTMLElement|string} target
	 * @returns {HTMLElement|null}
	 */
	#resolveElement(target) {
		if (target instanceof HTMLElement) {
			return target;
		}

		if (typeof target === 'string') {
			const element = document.querySelector(target);
			return element instanceof HTMLElement ? element : null;
		}

		return null;
	}
}
