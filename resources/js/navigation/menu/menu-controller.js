import { resolveOptionalElement } from '../../lib/dropdown-utils.js';
import { bindEntry, unbindEntry } from './menu-item-wiring.js';
import { mergeMenuOptions } from './menu-options.js';
import { buildMenuEntry } from './menu-item-model.js';
import { createEntryPopover } from './menu-item-popover.js';

const menuControllerRegistry = new WeakMap();

/**
 * Menu controller that wires dropdown popovers to hierarchical menu items.
 */
class MenuController {
	/**
	 * @param {HTMLElement|string|null|undefined} root
	 * @param {object} [options]
	 */
	constructor(root, options = {}) {
		this.root = resolveOptionalElement(root);
		this.options = mergeMenuOptions(options);

		this.entries = [];
		this.entryMap = new Map();
		this.isInitialized = false;

		this.handleBranchOpen = this.handleBranchOpen.bind(this);
		this.handleBranchClose = this.handleBranchClose.bind(this);
	}

	/**
	 * @param {HTMLElement} item
	 * @returns {void}
	 */
	closeSiblingBranches(item) {
		const current = this.entryMap.get(item);

		if (!current) {
			return;
		}

		for (const entry of this.entries) {
			if (!entry.popover) continue;
			if (entry.item === item) continue;
			if (entry.parentItem !== current.parentItem) continue;

			void entry.popover.close({ immediate: true });
		}
	}

	/**
	 * @param {HTMLElement} item
	 * @returns {void}
	 */
	closeDescendants(item) {
		for (const entry of this.entries) {
			if (!entry.popover) continue;
			if (entry.item === item) continue;
			if (!item.contains(entry.item)) continue;

			void entry.popover.close({ immediate: true });
		}
	}

	/**
	 * @param {CustomEvent} event
	 * @returns {void}
	 */
	handleBranchOpen(event) {
		const item = /** @type {HTMLElement|null} */ (event.currentTarget);

		if (!(item instanceof HTMLElement)) {
			return;
		}

		this.closeSiblingBranches(item);
	}

	/**
	 * @param {CustomEvent} event
	 * @returns {void}
	 */
	handleBranchClose(event) {
		const item = /** @type {HTMLElement|null} */ (event.currentTarget);

		if (!(item instanceof HTMLElement)) {
			return;
		}

		this.closeDescendants(item);
	}

	/**
	 * @returns {MenuController}
	 */
	init() {
		if (!(this.root instanceof HTMLElement)) {
			return this;
		}

		if (this.isInitialized) {
			return this;
		}

		const existingController = menuControllerRegistry.get(this.root);

		if (existingController instanceof MenuController && existingController !== this && existingController.isInitialized) {
			return existingController;
		}

		menuControllerRegistry.set(this.root, this);

		const items = this.root.querySelectorAll(this.options.selectors.item);

		for (const item of items) {
			if (!(item instanceof HTMLElement) || this.entryMap.has(item)) {
				continue;
			}

			const entry = buildMenuEntry(item, this.options);

			if (!entry) {
				continue;
			}

			entry.popover = createEntryPopover(entry, this.options);

			this.entries.push(entry);
			this.entryMap.set(item, entry);

			bindEntry(entry, this.options);

			if (!entry.popover) {
				continue;
			}

			entry.item.addEventListener('menu:open', this.handleBranchOpen);
			entry.item.addEventListener('menu:close', this.handleBranchClose);
		}

		this.isInitialized = true;
		return this;
	}

	/**
	 * @param {HTMLElement} item
	 * @returns {object|null}
	 */
	getItem(item) {
		return this.entryMap.get(item) || null;
	}

	/**
	 * @returns {void}
	 */
	closeAll() {
		for (const entry of this.entries) {
			if (!entry.popover) {
				continue;
			}

			void entry.popover.close();
		}
	}

	/**
	 * @returns {void}
	 */
	destroy() {
		if (!this.isInitialized) {
			return;
		}

		for (const entry of this.entries) {
			unbindEntry(entry);

			if (!entry.popover) {
				continue;
			}

			entry.item.removeEventListener('menu:open', this.handleBranchOpen);
			entry.item.removeEventListener('menu:close', this.handleBranchClose);
			entry.popover.destroy();
		}

		this.entries = [];
		this.entryMap.clear();
		this.isInitialized = false;

		if (menuControllerRegistry.get(this.root) === this) {
			menuControllerRegistry.delete(this.root);
		}
	}
}
export default MenuController;
