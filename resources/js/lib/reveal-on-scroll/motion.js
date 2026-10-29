import { cleanInlineStyles, stagger } from 'animejs/utils';
import { waapi } from 'animejs/waapi';
import {
	markRevealTargets,
	revertRevealPreparer,
	scheduleRevealWillChangeClear,
} from './state.js';

export const REVEAL_PRESETS = {
	'fade-up': {
		from: { opacity: 0, y: 24 },
		to: { opacity: 1, y: 0 },
	},
	'fade-down': {
		from: { opacity: 0, y: -24 },
		to: { opacity: 1, y: 0 },
	},
	'fade-left': {
		from: { opacity: 0, x: 24 },
		to: { opacity: 1, x: 0 },
	},
	'fade-right': {
		from: { opacity: 0, x: -24 },
		to: { opacity: 1, x: 0 },
	},
	'scale-in': {
		from: { opacity: 0, scale: 0.92 },
		to: { opacity: 1, scale: 1 },
	},
	'scale-up': {
		from: { opacity: 0, scale: 0.85, y: 12 },
		to: { opacity: 1, scale: 1, y: 0 },
	},
};

export const REVEAL_DEFAULTS = {
	preset: 'fade-up',
	from: null,
	to: null,
	duration: 700,
	ease: 'out(3)',
	delay: 0,
	stagger: 120,
	once: true,
	group: false,
	prepare: true,
	target: null,
	respectReducedMotion: true,
	watchReducedMotion: true,
	reducedMotionBehavior: 'show',
	staggerFrom: 0,
};

/**
 * @param {string | Element | NodeList | HTMLCollection | Element[]} targets
 * @returns {Element[]}
 */
export function resolveRevealTargets(targets) {
	if (!targets) {
		return [];
	}

	if (typeof targets === 'string') {
		return Array.from(document.querySelectorAll(targets));
	}

	if (targets instanceof Element) {
		return [targets];
	}

	if (targets instanceof NodeList || targets instanceof HTMLCollection || Array.isArray(targets)) {
		return Array.from(targets).filter((item) => item instanceof Element);
	}

	return [];
}

/**
 * @param {string} key
 * @returns {number | string}
 */
function defaultRevealValueFor(key) {
	if (key === 'opacity') {
		return 1;
	}

	if (key === 'transform') {
		return 'none';
	}

	if (key.startsWith('scale')) {
		return 1;
	}

	return 0;
}

/**
 * @param {object} options
 * @returns {{ from: object, to: object }}
 */
function resolveRevealMotion(options) {
	const preset = REVEAL_PRESETS[options.preset] || REVEAL_PRESETS['fade-up'];

	return {
		from: {
			...preset.from,
			...(options.from || {}),
		},
		to: {
			...preset.to,
			...(options.to || {}),
		},
	};
}

/**
 * @param {object} instance
 * @param {'from'|'to'} edge
 * @returns {object}
 */
export function resolveRevealAppliedValues(instance, edge) {
	const { from, to } = resolveRevealMotion(instance.options);
	const source = edge === 'from' ? from : to;
	const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
	const values = {};

	keys.forEach((key) => {
		values[key] = key in source ? source[key] : defaultRevealValueFor(key);
	});

	return values;
}

/**
 * @param {object} instance
 * @returns {object}
 */
function buildRevealTweenValues(instance) {
	const { from, to } = resolveRevealMotion(instance.options);
	const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
	const params = {};

	keys.forEach((key) => {
		const start = key in from ? from[key] : defaultRevealValueFor(key);
		const end = key in to ? to[key] : defaultRevealValueFor(key);
		params[key] = [start, end];
	});

	return params;
}

/**
 * @param {object} instance
 * @returns {number}
 */
function resolveRevealBaseDelay(instance) {
	if (typeof instance.options.delay === 'function') {
		return Number(instance.options.delay(instance.targets[0], 0)) || 0;
	}

	return Number(instance.options.delay) || 0;
}

/**
 * @param {object} instance
 * @param {Element} element
 * @param {number} index
 * @returns {number}
 */
function resolveRevealSingleDelay(instance, element, index) {
	let delay;

	if (typeof instance.options.delay === 'function') {
		delay = Number(instance.options.delay(element, index)) || 0;
	} else {
		delay = Number(instance.options.delay) || 0;
	}

	if (instance.options.stagger && instance.targets.length > 1) {
		const staggerDelay = stagger(instance.options.stagger, {
			start: delay,
			from: instance.options.staggerFrom,
		});

		return Number(staggerDelay(element, index, instance.targets.length)) || delay;
	}

	return delay;
}

/**
 * @param {object} instance
 * @param {Element[]} targets
 * @returns {(animation?: unknown) => void}
 */
function buildRevealCompleteHandler(instance, targets) {
	return (animation) => {
		if (animation) {
			cleanInlineStyles(animation);
		}

		if (!instance._destroyed) {
			scheduleRevealWillChangeClear(instance, targets);
		}

		markRevealTargets(targets);
	};
}

/**
 * @param {object} instance
 * @param {Element} fallback
 * @returns {Element}
 */
function resolveRevealTriggerTarget(instance, fallback) {
	return instance.options.target instanceof Element ? instance.options.target : fallback;
}

/**
 * @param {object} instance
 * @param {Element} target
 * @param {number} index
 * @returns {object}
 */
export function buildSingleRevealEntry(instance, target, index) {
	return {
		trigger: resolveRevealTriggerTarget(instance, target),
		targets: [target],
		animation: waapi.animate(target, {
			...buildRevealTweenValues(instance),
			duration: instance.options.duration,
			ease: instance.options.ease,
			delay: resolveRevealSingleDelay(instance, target, index),
			onBegin: () => {
				revertRevealPreparer(instance, target);
			},
			onComplete: buildRevealCompleteHandler(instance, [target]),
			autoplay: false,
		}),
		preparerKey: target,
		played: false,
	};
}

/**
 * @param {object} instance
 * @returns {object}
 */
export function buildGroupedRevealEntry(instance) {
	const baseDelay = resolveRevealBaseDelay(instance);
	const staggerDelay =
		instance.targets.length > 1
			? stagger(instance.options.stagger, {
					start: baseDelay,
					from: instance.options.staggerFrom,
				})
			: baseDelay;

	return {
		trigger: resolveRevealTriggerTarget(instance, instance.targets[0]),
		targets: instance.targets,
		animation: waapi.animate(instance.targets, {
			...buildRevealTweenValues(instance),
			duration: instance.options.duration,
			ease: instance.options.ease,
			delay: staggerDelay,
			onBegin: () => {
				revertRevealPreparer(instance, instance.groupPreparerKey);
			},
			onComplete: buildRevealCompleteHandler(instance, instance.targets),
			autoplay: false,
		}),
		preparerKey: instance.groupPreparerKey,
		played: false,
	};
}
