/**
 * Wires listing filter labels and panels into the shared popover system.
 */
import { GcPopover, GcPopoverRegistry } from '../lib/popover/index.js';

const DEFAULT_DROPDOWN_SELECTOR = '.filter-dropdown';
const DEFAULT_TRIGGER_SELECTOR = '.dropdown-label';

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
 * Standalone dropdown wiring for listing filter controls.
 */
class ListingFilterDropdown {
	/**
	 * @param {Document|HTMLElement|string} [root]
	 * @param {object} [options]
	 * @param {string} [options.dropdownSelector]
	 * @param {string} [options.triggerSelector]
	 * @param {object} [options.popover]
	 */
	constructor(root = document, options = {}) {
		const popoverOptions =
			options.popover && typeof options.popover === 'object' && !Array.isArray(options.popover) ? options.popover : {};

		this.root = resolveRoot(root);
		this.options = {
			dropdownSelector: DEFAULT_DROPDOWN_SELECTOR,
			triggerSelector: DEFAULT_TRIGGER_SELECTOR,
			...options,
			popover: {
				closeOnReferenceHidden: true,
				...popoverOptions,
			},
		};
		this.popovers = [];
		this.isInitialized = false;
	}

	/**
	 * @returns {ListingFilterDropdown}
	 */
	init() {
		if (this.isInitialized) {
			return this;
		}

		const { dropdownSelector, triggerSelector, popover } = this.options;

		this.root.querySelectorAll(dropdownSelector).forEach((panel) => {
			const trigger = panel.previousElementSibling;

			if (!(panel instanceof HTMLElement) || !(trigger instanceof HTMLElement)) {
				return;
			}

			if (!trigger.matches(triggerSelector)) {
				return;
			}

			if (GcPopoverRegistry.findByElement(trigger) || GcPopoverRegistry.findByElement(panel)) {
				return;
			}

			this.popovers.push(new GcPopover(trigger, panel, popover));
		});

		this.isInitialized = true;
		return this;
	}

	/**
	 * @returns {ListingFilterDropdown}
	 */
	destroy() {
		if (!this.isInitialized) {
			return this;
		}

		this.popovers.forEach((popover) => popover?.destroy?.());
		this.popovers = [];
		this.isInitialized = false;
		return this;
	}
}

export default ListingFilterDropdown;
