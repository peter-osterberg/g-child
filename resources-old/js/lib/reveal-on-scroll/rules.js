import { RevealOnScroll } from './index.js';

export const DEFAULT_REVEAL_RULES = [
	{
		containerSelector: '.animate-this',
		targetSelector: 'self',
	},
	{
		containerSelector: '.animate-row',
		targetSelector: '.row',
	},
	{
		containerSelector: '.animate-module, .animate-mod',
		targetSelector: '[class*="module-"]',
	},
];

const SELF_TARGET = 'self';
const CHILDREN_TARGET = 'children';

export const LISTING_ROWS_MODE = 'listing-rows';
export const DEFAULT_LISTING_SELECTOR = '.module-listing';
export const DEFAULT_ITEMS_WRAPPER_SELECTOR = '.listing-items-wrapper';
export const DEFAULT_ITEM_SELECTOR = '.listing-post';
export const DEFAULT_ROW_OFFSET_TOLERANCE = 4;

/**
 * @param {Document|HTMLElement|string|null|undefined} root
 * @returns {Document|HTMLElement}
 */
export function resolveRevealRoot(root) {
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
export function collectRevealContainers(root, selector) {
	const containers = [];
	const seen = new Set();

	const addContainer = (element) => {
		if (!(element instanceof HTMLElement) || seen.has(element)) {
			return;
		}

		seen.add(element);
		containers.push(element);
	};

	if (root instanceof HTMLElement) {
		try {
			if (root.matches(selector)) {
				addContainer(root);
			}
		} catch (error) {
			console.warn('Invalid reveal container selector.', selector, error);
			return containers;
		}
	}

	try {
		root.querySelectorAll(selector).forEach((element) => {
			addContainer(element);
		});
	} catch (error) {
		console.warn('Invalid reveal container selector.', selector, error);
	}

	return containers;
}

/**
 * @param {HTMLElement} element
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
function collectScopedRevealTargets(element, selector) {
	const targets = [];

	if (selector.charAt(0) !== '>') {
		try {
			if (element.matches(selector)) {
				targets.push(element);
			}
		} catch (error) {
			console.warn('Invalid reveal target selector.', selector, error);
			return targets;
		}
	}

	const scopedSelector = selector.charAt(0) === '>' ? `:scope ${selector}` : selector;

	try {
		element.querySelectorAll(scopedSelector).forEach((target) => {
			if (target instanceof HTMLElement) {
				targets.push(target);
			}
		});
	} catch (error) {
		console.warn('Invalid reveal target selector.', selector, error);
	}

	return targets;
}

/**
 * @param {HTMLElement} container
 * @param {string} targetSelector
 * @returns {HTMLElement[]}
 */
export function resolveRevealRuleTargets(container, targetSelector) {
	const normalized = typeof targetSelector === 'string' ? targetSelector.trim() : '';

	if (!normalized) {
		return [];
	}

	if (normalized === SELF_TARGET) {
		return [container];
	}

	if (normalized === CHILDREN_TARGET) {
		return Array.from(container.children).filter((child) => child instanceof HTMLElement);
	}

	return collectScopedRevealTargets(container, normalized);
}

/**
 * @param {object} rule
 * @param {number} index
 * @returns {string}
 */
export function resolveRevealRuleKey(rule, index) {
	if (typeof rule.id === 'string' && rule.id.trim()) {
		return rule.id.trim();
	}

	return `${index}:${rule.containerSelector}:${rule.targetSelector}`;
}

/**
 * @param {object} rule
 * @param {object} baseRevealOptions
 * @param {HTMLElement} container
 * @returns {object}
 */
export function buildRevealRuleOptions(rule, baseRevealOptions, container) {
	const ruleReveal = rule.reveal && typeof rule.reveal === 'object' && !Array.isArray(rule.reveal) ? rule.reveal : {};
	const shouldGroup = typeof rule.group === 'boolean' ? rule.group : false;
	const options = {
		...baseRevealOptions,
		...ruleReveal,
		group: shouldGroup,
	};

	if (shouldGroup && !(options.target instanceof Element)) {
		options.target = container;
	}

	return options;
}

/**
 * @param {HTMLElement[]} targets
 * @param {object} options
 * @returns {HTMLElement[]}
 */
export function filterPendingRevealTargets(targets, options) {
	const once = typeof options.once === 'boolean' ? options.once : RevealOnScroll.defaults.once;

	if (!once) {
		return targets;
	}

	return targets.filter((target) => !RevealOnScroll.isTargetRevealed(target));
}

/**
 * @param {HTMLElement} container
 * @param {object} rule
 * @returns {HTMLElement|null}
 */
export function resolveRevealListing(container, rule) {
	const listingSelector =
		typeof rule.listingSelector === 'string' && rule.listingSelector.trim()
			? rule.listingSelector
			: DEFAULT_LISTING_SELECTOR;

	if (container.matches(listingSelector)) {
		return container;
	}

	const listing = container.querySelector(listingSelector);
	return listing instanceof HTMLElement ? listing : null;
}

/**
 * @param {HTMLElement} listing
 * @param {object} rule
 * @returns {HTMLElement|null}
 */
export function resolveRevealItemsWrapper(listing, rule) {
	const itemsWrapperSelector =
		typeof rule.itemsWrapperSelector === 'string' && rule.itemsWrapperSelector.trim()
			? rule.itemsWrapperSelector
			: DEFAULT_ITEMS_WRAPPER_SELECTOR;
	const itemsWrapper = listing.querySelector(itemsWrapperSelector);

	return itemsWrapper instanceof HTMLElement ? itemsWrapper : null;
}

/**
 * Groups items into visual rows using a single measurement pass.
 *
 * Notes:
 * - Layout reads are still required to determine visual rows.
 * - We keep them to one pass, then sort and group in linear scans.
 *
 * @param {HTMLElement[]} items
 * @param {number} tolerance
 * @returns {HTMLElement[][]}
 */
export function groupRevealItemsByRow(items, tolerance) {
	if (!Array.isArray(items) || !items.length) {
		return [];
	}

	const measuredItems = items
		.filter((item) => item instanceof HTMLElement)
		.map((item) => ({
			item,
			top: item.getBoundingClientRect().top,
			left: item.getBoundingClientRect().left,
		}))
		.sort((a, b) => {
			const topDiff = a.top - b.top;

			if (Math.abs(topDiff) > tolerance) {
				return topDiff;
			}

			return a.left - b.left;
		});

	/** @type {{top: number, items: HTMLElement[]}[]} */
	const rows = [];

	measuredItems.forEach(({ item, top }) => {
		const lastRow = rows[rows.length - 1];

		if (lastRow && Math.abs(lastRow.top - top) <= tolerance) {
			lastRow.items.push(item);
			return;
		}

		rows.push({
			top,
			items: [item],
		});
	});

	return rows.map(({ items: rowItems }) => rowItems);
}
