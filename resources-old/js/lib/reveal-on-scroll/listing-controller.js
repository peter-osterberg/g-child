import { RevealOnScroll } from './index.js';
import {
	DEFAULT_ITEM_SELECTOR,
	DEFAULT_ROW_OFFSET_TOLERANCE,
	groupRevealItemsByRow,
	resolveRevealItemsWrapper,
	resolveRevealListing,
} from './rules.js';

/**
 * Dynamic reveal controller for JS-driven listing items.
 */
class ListingRevealController {
	/**
	 * @param {HTMLElement} container
	 * @param {object} rule
	 * @param {object} revealOptions
	 * @param {WeakSet<HTMLElement>} claimedTargets
	 */
	constructor(container, rule, revealOptions, claimedTargets) {
		this.container = container;
		this.rule = rule;
		this.revealOptions = revealOptions;
		this.claimedTargets = claimedTargets;
		this.instances = [];
		this.items = new WeakSet();
		this.scheduled = false;
		this.pendingItems = new Set();

		this.listing = resolveRevealListing(container, rule);
		this.itemsWrapper = this.listing instanceof HTMLElement ? resolveRevealItemsWrapper(this.listing, rule) : null;

		this.mutationObserver =
			this.itemsWrapper instanceof HTMLElement
				? new MutationObserver((mutations) => {
						this.collectMutatedItems(mutations);
						this.scheduleReveal();
					})
				: null;
	}

	/**
	 * @returns {ListingRevealController}
	 */
	init() {
		if (!(this.itemsWrapper instanceof HTMLElement) || !(this.mutationObserver instanceof MutationObserver)) {
			return this;
		}

		this.mutationObserver.observe(this.itemsWrapper, {
			childList: true,
			subtree: true,
		});

		this.collectInitialItems();
		this.scheduleReveal();

		return this;
	}

	/**
	 * @param {MutationRecord[]} mutations
	 * @returns {void}
	 */
	collectMutatedItems(mutations) {
		if (!(this.itemsWrapper instanceof HTMLElement)) {
			return;
		}

		const itemSelector =
			typeof this.rule.itemSelector === 'string' && this.rule.itemSelector.trim()
				? this.rule.itemSelector
				: DEFAULT_ITEM_SELECTOR;

		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (!(node instanceof HTMLElement)) {
					return;
				}

				if (node.matches(itemSelector)) {
					this.pendingItems.add(node);
				}

				node.querySelectorAll?.(itemSelector).forEach((item) => {
					if (item instanceof HTMLElement) {
						this.pendingItems.add(item);
					}
				});
			});
		});
	}

	/**
	 * @returns {void}
	 */
	collectInitialItems() {
		if (!(this.itemsWrapper instanceof HTMLElement)) {
			return;
		}

		const itemSelector =
			typeof this.rule.itemSelector === 'string' && this.rule.itemSelector.trim()
				? this.rule.itemSelector
				: DEFAULT_ITEM_SELECTOR;

		this.itemsWrapper.querySelectorAll(itemSelector).forEach((item) => {
			if (item instanceof HTMLElement) {
				this.pendingItems.add(item);
			}
		});
	}

	/**
	 * @returns {void}
	 */
	scheduleReveal() {
		if (this.scheduled) {
			return;
		}

		this.scheduled = true;

		requestAnimationFrame(() => {
			this.scheduled = false;
			this.revealPendingItems();
		});
	}

	/**
	 * @returns {void}
	 */
	revealPendingItems() {
		if (!this.pendingItems.size) {
			return;
		}

		const rowOffsetTolerance = Number.isFinite(this.rule.rowOffsetTolerance)
			? this.rule.rowOffsetTolerance
			: DEFAULT_ROW_OFFSET_TOLERANCE;
		const once = typeof this.revealOptions.once === 'boolean' ? this.revealOptions.once : RevealOnScroll.defaults.once;

		const nextItems = Array.from(this.pendingItems).filter((item) => {
			return (
				item instanceof HTMLElement &&
				!this.items.has(item) &&
				!this.claimedTargets.has(item) &&
				(!once || !RevealOnScroll.isTargetRevealed(item))
			);
		});

		this.pendingItems.clear();

		if (!nextItems.length) {
			return;
		}

		nextItems.forEach((item) => {
			this.items.add(item);
			this.claimedTargets.add(item);
		});

		groupRevealItemsByRow(nextItems, rowOffsetTolerance).forEach((rowItems) => {
			const instance = new RevealOnScroll(rowItems, {
				...this.revealOptions,
				target: rowItems[0],
				group: rowItems.length > 1,
				stagger: rowItems.length > 1 ? this.revealOptions.stagger : 0,
			});

			if (instance.targets.length) {
				this.instances.push(instance);
			}
		});
	}

	/**
	 * @returns {void}
	 */
	refresh() {
		this.instances.forEach((instance) => instance.refresh());
	}

	/**
	 * @returns {void}
	 */
	destroy() {
		this.mutationObserver?.disconnect();
		this.pendingItems.clear();
		this.instances.forEach((instance) => instance.destroy());
	}
}

export default ListingRevealController;
