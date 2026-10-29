import {
	REVEAL_DEFAULTS,
	REVEAL_PRESETS,
	buildGroupedRevealEntry,
	buildSingleRevealEntry,
	resolveRevealAppliedValues,
	resolveRevealTargets,
} from './motion.js';
import {
	applyRevealReducedMotionState,
	clearRevealPreparers,
	clearRevealStaticSetters,
	clearRevealTargets,
	clearRevealWillChange,
	isRevealTargetComplete,
	prepareRevealTargets,
	teardownRevealAnimations,
} from './state.js';

const DEFAULT_ROOT_MARGIN = '0px 0px -5% 0px';
const DEFAULT_OBSERVER_THRESHOLD = 0.01;

/**
 * @typedef {string | Element | NodeList | HTMLCollection | Element[]} RevealTargets
 */

/**
 * @typedef {RevealOnScroll | [RevealTargets, object?] | {targets: RevealTargets, options?: object}} RevealBatchItem
 */

/**
 * @typedef {{
 *   trigger: Element,
 *   targets: Element[],
 *   animation: { play?: () => void, restart?: () => void, revert?: () => void, completed?: boolean } | null,
 *   preparerKey: unknown,
 *   played: boolean,
 * }} RevealEntry
 */

/**
 * Scroll-triggered reveal helper built around viewport entry.
 */
export class RevealOnScroll {
	static instances = new Set();

	/**
	 * @param {Element} target
	 * @returns {boolean}
	 */
	static isTargetRevealed(target) {
		return isRevealTargetComplete(target);
	}

	static presets = REVEAL_PRESETS;

	static defaults = REVEAL_DEFAULTS;

	/**
	 * @returns {void}
	 */
	static refreshAll() {
		for (const instance of RevealOnScroll.instances) {
			instance.refresh();
		}
	}

	/**
	 * @returns {void}
	 */
	static destroyAll() {
		for (const instance of Array.from(RevealOnScroll.instances)) {
			instance.destroy();
		}
	}

	/**
	 * @param {RevealBatchItem[]} items
	 * @returns {{ instances: RevealOnScroll[], refresh: () => object, destroy: () => object }}
	 */
	static batch(items = []) {
		const instances = items
			.map((item) => {
				if (item instanceof RevealOnScroll) {
					return item;
				}

				if (Array.isArray(item)) {
					return new RevealOnScroll(item[0], item[1] || {});
				}

				return new RevealOnScroll(item.targets, item.options || {});
			})
			.filter(Boolean);

		return {
			instances,
			/**
			 * @returns {object}
			 */
			refresh() {
				instances.forEach((instance) => instance.refresh());
				return this;
			},
			/**
			 * @returns {object}
			 */
			destroy() {
				instances.forEach((instance) => instance.destroy());
				return this;
			},
		};
	}

	/**
	 * @param {RevealTargets} targets
	 * @param {object} options
	 */
	constructor(targets, options = {}) {
		this.options = { ...RevealOnScroll.defaults, ...options };
		this.targets = resolveRevealTargets(targets).filter((target) => {
			return !this.options.once || !RevealOnScroll.isTargetRevealed(target);
		});

		this.entries = [];
		this.entriesByTrigger = new Map();
		this.preparers = new Map();
		this.staticSetters = [];
		this.willChangeClearFrames = new Map();
		this.groupPreparerKey = Symbol('group-preparer');
		this.observer = null;

		this._destroyed = false;
		this._initialized = false;
		this._reducedMotionApplied = false;

		this.mediaQuery =
			typeof window !== 'undefined' && 'matchMedia' in window
				? window.matchMedia('(prefers-reduced-motion: reduce)')
				: null;

		this._handleReducedMotionChange = this._handleReducedMotionChange.bind(this);
		this._handleIntersection = this._handleIntersection.bind(this);

		if (this.targets.length) {
			this.init();
			RevealOnScroll.instances.add(this);
		}
	}

	/**
	 * @returns {RevealOnScroll}
	 */
	init() {
		if (this._destroyed || this._initialized || !this.targets.length) {
			return this;
		}

		if (this.options.once) {
			this.targets = this.targets.filter((target) => !RevealOnScroll.isTargetRevealed(target));

			if (!this.targets.length) {
				return this;
			}
		}

		this._initialized = true;

		if (this.options.watchReducedMotion && this.mediaQuery) {
			this._addReducedMotionListener();
		}

		if (this._shouldReduceMotion()) {
			applyRevealReducedMotionState(this, resolveRevealAppliedValues(this, 'to'));
			return this;
		}

		if (this.options.prepare) {
			prepareRevealTargets(this, resolveRevealAppliedValues(this, 'from'));
		}

		this._createEntries();
		this._observeEntries();

		return this;
	}

	/**
	 * @returns {RevealOnScroll}
	 */
	refresh() {
		if (this._destroyed || !this.targets.length) {
			return this;
		}

		if (this._shouldReduceMotion()) {
			applyRevealReducedMotionState(this, resolveRevealAppliedValues(this, 'to'));
			return this;
		}

		if (!this.observer) {
			this._observeEntries();
			return this;
		}

		this.observer.disconnect();
		this._observeEntries();
		return this;
	}

	/**
	 * @returns {RevealOnScroll}
	 */
	destroy() {
		if (this._destroyed) {
			return this;
		}

		this._removeReducedMotionListener();
		this._disconnectObserver();
		teardownRevealAnimations(this);
		clearRevealPreparers(this);
		clearRevealStaticSetters(this);
		clearRevealWillChange(this, this.targets);

		this._destroyed = true;
		this._initialized = false;
		this._reducedMotionApplied = false;

		RevealOnScroll.instances.delete(this);

		return this;
	}

	/**
	 * @returns {RevealOnScroll}
	 */
	rebuild() {
		this._removeReducedMotionListener();
		this._disconnectObserver();
		teardownRevealAnimations(this);
		clearRevealPreparers(this);
		clearRevealStaticSetters(this);
		clearRevealWillChange(this, this.targets);

		if (!this.options.once) {
			clearRevealTargets(this.targets);
		}

		this._destroyed = false;
		this._initialized = false;
		this._reducedMotionApplied = false;

		return this.init();
	}

	/**
	 * @returns {void}
	 */
	_createEntries() {
		this.entries = [];
		this.entriesByTrigger.clear();

		if (this.options.group) {
			this._registerEntry(buildGroupedRevealEntry(this));
			return;
		}

		this.targets.forEach((target, index) => {
			this._registerEntry(buildSingleRevealEntry(this, target, index));
		});
	}

	/**
	 * @param {RevealEntry|null} entry
	 * @returns {void}
	 */
	_registerEntry(entry) {
		if (!entry) {
			return;
		}

		this.entries.push(entry);

		const existingEntries = this.entriesByTrigger.get(entry.trigger) || [];
		existingEntries.push(entry);
		this.entriesByTrigger.set(entry.trigger, existingEntries);
	}

	/**
	 * @returns {void}
	 */
	_observeEntries() {
		if (typeof window === 'undefined' || typeof IntersectionObserver !== 'function' || !this.entries.length) {
			this._playAllImmediately();
			return;
		}

		this._disconnectObserver();

		this.observer = new IntersectionObserver(this._handleIntersection, {
			root: null,
			rootMargin: DEFAULT_ROOT_MARGIN,
			threshold: DEFAULT_OBSERVER_THRESHOLD,
		});

		this.entriesByTrigger.forEach((entries, trigger) => {
			if (!(trigger instanceof Element)) {
				return;
			}

			if (this.options.once && entries.every((entry) => entry.played)) {
				return;
			}

			this.observer?.observe(trigger);
		});
	}

	/**
	 * @param {IntersectionObserverEntry[]} entries
	 * @returns {void}
	 */
	_handleIntersection(entries) {
		entries.forEach((entry) => {
			if (!entry.target || !this.entriesByTrigger.has(entry.target)) {
				return;
			}

			const revealEntries = this.entriesByTrigger.get(entry.target) || [];

			if (!entry.isIntersecting) {
				if (!this.options.once) {
					revealEntries.forEach((revealEntry) => {
						revealEntry.played = false;
					});

					const targets = [];

					revealEntries.forEach((revealEntry) => {
						targets.push(...revealEntry.targets);
					});

					clearRevealTargets(targets);
				}

				return;
			}

			revealEntries.forEach((revealEntry) => {
				this._playEntry(revealEntry);
			});

			if (this.options.once) {
				this.observer?.unobserve(entry.target);
			}
		});
	}

	/**
	 * @param {RevealEntry} entry
	 * @returns {void}
	 */
	_playEntry(entry) {
		if (entry.played && this.options.once) {
			return;
		}

		const animation = entry.animation;

		if (!animation) {
			return;
		}

		entry.played = true;

		if (!this.options.once && animation.completed && typeof animation.restart === 'function') {
			animation.restart();
			return;
		}

		if (typeof animation.play === 'function') {
			animation.play();
		}
	}

	/**
	 * @returns {void}
	 */
	_playAllImmediately() {
		this.entries.forEach((entry) => {
			this._playEntry(entry);
		});
	}

	/**
	 * @returns {boolean}
	 */
	_shouldReduceMotion() {
		return Boolean(this.options.respectReducedMotion && this.mediaQuery && this.mediaQuery.matches);
	}

	/**
	 * @returns {void}
	 */
	_handleReducedMotionChange() {
		this.rebuild();
	}

	/**
	 * @returns {void}
	 */
	_addReducedMotionListener() {
		if (!this.mediaQuery) {
			return;
		}

		if (typeof this.mediaQuery.addEventListener === 'function') {
			this.mediaQuery.addEventListener('change', this._handleReducedMotionChange);
		} else if (typeof this.mediaQuery.addListener === 'function') {
			this.mediaQuery.addListener(this._handleReducedMotionChange);
		}
	}

	/**
	 * @returns {void}
	 */
	_removeReducedMotionListener() {
		if (!this.mediaQuery) {
			return;
		}

		if (typeof this.mediaQuery.removeEventListener === 'function') {
			this.mediaQuery.removeEventListener('change', this._handleReducedMotionChange);
		} else if (typeof this.mediaQuery.removeListener === 'function') {
			this.mediaQuery.removeListener(this._handleReducedMotionChange);
		}
	}

	/**
	 * @returns {void}
	 */
	_disconnectObserver() {
		this.observer?.disconnect();
		this.observer = null;
	}
}
