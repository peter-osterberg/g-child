import { set } from 'animejs/utils';

/**
 * Shared DOM state helpers for the reveal-on-scroll subsystem.
 */

export const REVEAL_COMPLETE_CLASS = 'is-revealed';
export const REVEAL_COMPLETE_ATTRIBUTE = 'data-gc-reveal-complete';

/**
 * @param {Element} target
 * @returns {boolean}
 */
export function isRevealTargetComplete(target) {
	return (
		target instanceof HTMLElement &&
		(target.classList.contains(REVEAL_COMPLETE_CLASS) ||
			target.getAttribute(REVEAL_COMPLETE_ATTRIBUTE) === 'true')
	);
}

/**
 * @param {Element[]|Element} targets
 * @returns {Element[]}
 */
function resolveRevealTargetList(targets) {
	return Array.isArray(targets) ? targets : [targets];
}

/**
 * @param {unknown} revertible
 * @returns {void}
 */
export function revertRevealSideEffect(revertible) {
	if (revertible && typeof revertible.revert === 'function') {
		revertible.revert();
	}
}

/**
 * @param {object} instance
 * @param {unknown} key
 * @param {unknown} preparer
 * @returns {void}
 */
export function registerRevealPreparer(instance, key, preparer) {
	if (preparer) {
		instance.preparers.set(key, preparer);
	}
}

/**
 * @param {object} instance
 * @param {unknown} key
 * @returns {void}
 */
export function revertRevealPreparer(instance, key) {
	if (!instance.preparers.has(key)) {
		return;
	}

	revertRevealSideEffect(instance.preparers.get(key));
	instance.preparers.delete(key);
}

/**
 * @param {object} instance
 * @returns {void}
 */
export function clearRevealPreparers(instance) {
	instance.preparers.forEach((preparer) => {
		revertRevealSideEffect(preparer);
	});

	instance.preparers.clear();
}

/**
 * @param {object} instance
 * @returns {void}
 */
export function clearRevealStaticSetters(instance) {
	instance.staticSetters.forEach((setter) => {
		revertRevealSideEffect(setter);
	});

	instance.staticSetters = [];
}

/**
 * @param {object} instance
 * @returns {void}
 */
export function teardownRevealAnimations(instance) {
	instance.entries.forEach((entry) => {
		revertRevealSideEffect(entry.animation);
	});
}

/**
 * @param {Element[]|Element} targets
 * @returns {void}
 */
export function markRevealTargets(targets) {
	resolveRevealTargetList(targets).forEach((target) => {
		if (target instanceof HTMLElement) {
			target.classList.add(REVEAL_COMPLETE_CLASS);
			target.setAttribute(REVEAL_COMPLETE_ATTRIBUTE, 'true');
		}
	});
}

/**
 * @param {Element[]|Element} targets
 * @returns {void}
 */
export function clearRevealTargets(targets) {
	resolveRevealTargetList(targets).forEach((target) => {
		if (target instanceof HTMLElement) {
			target.classList.remove(REVEAL_COMPLETE_CLASS);
			target.removeAttribute(REVEAL_COMPLETE_ATTRIBUTE);
		}
	});
}

/**
 * @param {object} instance
 * @param {Element[]|Element} targets
 * @returns {void}
 */
export function cancelRevealWillChangeClear(instance, targets) {
	resolveRevealTargetList(targets).forEach((target) => {
		if (!(target instanceof HTMLElement)) {
			return;
		}

		const rafId = instance.willChangeClearFrames.get(target);

		if (
			typeof rafId === 'number' &&
			typeof window !== 'undefined' &&
			typeof window.cancelAnimationFrame === 'function'
		) {
			window.cancelAnimationFrame(rafId);
		}

		instance.willChangeClearFrames.delete(target);
	});
}

/**
 * @param {object} instance
 * @param {Element[]|Element} targets
 * @returns {void}
 */
export function setRevealWillChange(instance, targets) {
	resolveRevealTargetList(targets).forEach((target) => {
		if (target instanceof HTMLElement) {
			cancelRevealWillChangeClear(instance, target);
			target.style.willChange = 'opacity, transform';
		}
	});
}

/**
 * @param {object} instance
 * @param {Element[]|Element} targets
 * @param {number} [frames]
 * @returns {void}
 */
export function scheduleRevealWillChangeClear(instance, targets, frames = 2) {
	const frameCount = Math.max(1, Number(frames) || 1);

	resolveRevealTargetList(targets).forEach((target) => {
		if (!(target instanceof HTMLElement)) {
			return;
		}

		cancelRevealWillChangeClear(instance, target);

		if (
			typeof window === 'undefined' ||
			typeof window.requestAnimationFrame !== 'function' ||
			typeof window.cancelAnimationFrame !== 'function'
		) {
			target.style.willChange = '';
			return;
		}

		let remainingFrames = frameCount;
		const step = () => {
			if (!instance.willChangeClearFrames.has(target)) {
				return;
			}

			remainingFrames -= 1;

			if (remainingFrames <= 0) {
				instance.willChangeClearFrames.delete(target);

				if (!instance._destroyed) {
					target.style.willChange = '';
				}

				return;
			}

			const rafId = window.requestAnimationFrame(step);
			instance.willChangeClearFrames.set(target, rafId);
		};

		const rafId = window.requestAnimationFrame(step);
		instance.willChangeClearFrames.set(target, rafId);
	});
}

/**
 * @param {object} instance
 * @param {Element[]|Element} targets
 * @returns {void}
 */
export function clearRevealWillChange(instance, targets) {
	resolveRevealTargetList(targets).forEach((target) => {
		if (target instanceof HTMLElement) {
			cancelRevealWillChangeClear(instance, target);
			target.style.willChange = '';
		}
	});
}

/**
 * @param {object} instance
 * @param {object} fromValues
 * @returns {void}
 */
export function prepareRevealTargets(instance, fromValues) {
	clearRevealTargets(instance.targets);

	if (instance.options.group) {
		registerRevealPreparer(instance, instance.groupPreparerKey, set(instance.targets, fromValues));
		setRevealWillChange(instance, instance.targets);
		return;
	}

	instance.targets.forEach((target) => {
		registerRevealPreparer(instance, target, set(target, fromValues));
		setRevealWillChange(instance, [target]);
	});
}

/**
 * @param {object} instance
 * @param {object} toValues
 * @returns {void}
 */
export function applyRevealReducedMotionState(instance, toValues) {
	if (instance._reducedMotionApplied) {
		return;
	}

	instance._disconnectObserver();
	teardownRevealAnimations(instance);
	clearRevealPreparers(instance);
	clearRevealStaticSetters(instance);

	if (instance.options.reducedMotionBehavior === 'show') {
		instance.staticSetters.push(set(instance.targets, toValues));
		markRevealTargets(instance.targets);
		clearRevealWillChange(instance, instance.targets);
	}

	instance._reducedMotionApplied = true;
}
