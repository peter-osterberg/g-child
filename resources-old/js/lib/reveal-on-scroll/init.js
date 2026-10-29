import { RevealOnScroll } from './index.js';
import ListingRevealController from './listing-controller.js';
import {
	getRegisteredRevealController,
	getRegisteredRevealInstances,
	registerRevealController,
	registerRevealInstances,
	unregisterRevealController,
	unregisterRevealInstances,
} from './registry.js';
import {
	DEFAULT_REVEAL_RULES,
	LISTING_ROWS_MODE,
	buildRevealRuleOptions,
	collectRevealContainers,
	filterPendingRevealTargets,
	resolveRevealRoot,
	resolveRevealRuleKey,
	resolveRevealRuleTargets,
} from './rules.js';

/**
 * Initialize scroll reveals from CSS helper classes configured in JS.
 *
 * @param {Document|HTMLElement|string} [root]
 * @param {object} [options]
 * @param {object} [options.reveal]
 * @param {object[]} [options.rules]
 * @returns {{ instances: RevealOnScroll[], refresh: () => unknown, destroy: () => unknown }}
 */
export default function initRevealOnScroll(root = document, options = {}) {
	const scope = resolveRevealRoot(root);
	const baseRevealOptions =
		options.reveal && typeof options.reveal === 'object' && !Array.isArray(options.reveal) ? options.reveal : {};
	const rules = Array.isArray(options.rules) && options.rules.length ? options.rules : DEFAULT_REVEAL_RULES;
	const claimedTargets = new WeakSet();
	const instances = [];
	const controllers = [];
	const ownedRegistrations = [];

	rules.forEach((rule, index) => {
		if (
			!rule ||
			typeof rule.containerSelector !== 'string' ||
			!rule.containerSelector.trim() ||
			typeof rule.targetSelector !== 'string' ||
			!rule.targetSelector.trim()
		) {
			return;
		}

		const containers = collectRevealContainers(scope, rule.containerSelector).reverse();
		const ruleKey = resolveRevealRuleKey(rule, index);

		containers.forEach((container) => {
			if (rule.mode === LISTING_ROWS_MODE) {
				const existingController = getRegisteredRevealController(container, ruleKey);

				if (existingController) {
					return;
				}

				const controller = new ListingRevealController(
					container,
					rule,
					buildRevealRuleOptions(rule, baseRevealOptions, container),
					claimedTargets,
				).init();

				if (!(controller.itemsWrapper instanceof HTMLElement)) {
					return;
				}

				controllers.push(controller);
				registerRevealController(container, ruleKey, controller);
				ownedRegistrations.push({
					type: 'controller',
					container,
					ruleKey,
					value: controller,
				});
				return;
			}

			const existingInstances = getRegisteredRevealInstances(container, ruleKey);

			if (Array.isArray(existingInstances) && existingInstances.length) {
				existingInstances.forEach((instance) => {
					instance.targets.forEach((target) => claimedTargets.add(target));
				});
				return;
			}

			const targets = resolveRevealRuleTargets(container, rule.targetSelector).filter(
				(target) => !claimedTargets.has(target),
			);
			const resolvedOptions = buildRevealRuleOptions(rule, baseRevealOptions, container);
			const pendingTargets = filterPendingRevealTargets(targets, resolvedOptions);

			if (!pendingTargets.length) {
				return;
			}

			const nextInstances = [];

			if (resolvedOptions.group) {
				const instance = new RevealOnScroll(pendingTargets, resolvedOptions);

				if (instance.targets.length) {
					nextInstances.push(instance);
				}
			} else {
				pendingTargets.forEach((target) => {
					const instance = new RevealOnScroll(target, {
						...resolvedOptions,
						group: false,
					});

					if (instance.targets.length) {
						nextInstances.push(instance);
					}
				});
			}

			if (!nextInstances.length) {
				return;
			}

			nextInstances.forEach((instance) => {
				instance.targets.forEach((target) => claimedTargets.add(target));
				instances.push(instance);
			});

			registerRevealInstances(container, ruleKey, nextInstances);
			ownedRegistrations.push({
				type: 'instances',
				container,
				ruleKey,
				value: nextInstances,
			});
		});
	});

	return {
		instances,
		controllers,
		destroyed: false,
		/**
		 * @returns {object}
		 */
		refresh() {
			instances.forEach((instance) => instance.refresh());
			controllers.forEach((controller) => controller.refresh?.());
			return this;
		},
		/**
		 * @returns {object}
		 */
		destroy() {
			if (this.destroyed) {
				return this;
			}

			this.destroyed = true;

			ownedRegistrations.forEach((registration) => {
				if (registration.type === 'controller') {
					unregisterRevealController(registration.container, registration.ruleKey, registration.value);
					return;
				}

				unregisterRevealInstances(registration.container, registration.ruleKey, registration.value);
			});

			instances.forEach((instance) => instance.destroy());
			controllers.forEach((controller) => controller.destroy?.());
			return this;
		},
	};
}
