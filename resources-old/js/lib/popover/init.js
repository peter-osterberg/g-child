import GcPopover from './instance.js';
import GcPopoverRegistry from './registry.js';
import { resolveTriggerPanelReference } from './panel.js';

const DEFAULT_TRIGGER_SELECTOR = '[data-gc-toggle]';

/**
 * @param {Document|HTMLElement|string|null|undefined} root
 * @returns {Document|HTMLElement}
 */
function resolveRoot(root) {
	if (root instanceof Document || root instanceof HTMLElement) {
		return root;
	}

	if (typeof root === 'string') {
		const element = document.querySelector(root);

		if (element instanceof HTMLElement) {
			return element;
		}
	}

	return document;
}

/**
 * @param {Document|HTMLElement} root
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
function collectTriggers(root, selector) {
	const triggers = [];

	if (root instanceof HTMLElement && root.matches(selector)) {
		triggers.push(root);
	}

	root.querySelectorAll(selector).forEach((element) => {
		if (element instanceof HTMLElement) {
			triggers.push(element);
		}
	});

	return triggers;
}

/**
 * @param {HTMLElement} trigger
 * @returns {boolean}
 */
function hasExistingPopover(trigger) {
	const panel = resolveTriggerPanelReference(trigger);

	return !!GcPopoverRegistry.findByElement(trigger) || !!GcPopoverRegistry.findByElement(panel);
}

/**
 * Initialize declarative popovers based on `data-gc-toggle`.
 *
 * Existing menu/listing popovers are skipped if they have already
 * been registered through another initializer.
 *
 * @param {Document|HTMLElement|string} [root]
 * @param {object} [options]
 * @param {string} [options.triggerSelector]
 * @param {object} [options.popover]
 * @returns {GcPopover[]}
 */
export default function initDeclarativePopovers(root = document, options = {}) {
	const scope = resolveRoot(root);
	const triggerSelector = typeof options.triggerSelector === 'string' ? options.triggerSelector : DEFAULT_TRIGGER_SELECTOR;
	const popoverOptions =
		options.popover && typeof options.popover === 'object' && !Array.isArray(options.popover) ? options.popover : {};
	const popovers = [];

	for (const trigger of collectTriggers(scope, triggerSelector)) {
		if (hasExistingPopover(trigger)) {
			continue;
		}

		try {
			popovers.push(new GcPopover(trigger, popoverOptions));
		} catch (error) {
			console.warn('Failed to initialize declarative popover.', trigger, error);
		}
	}

	return popovers;
}
