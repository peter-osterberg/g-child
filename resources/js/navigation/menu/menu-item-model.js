/**
 * Builds a normalized model for one menu item so the controller can resolve trigger, panel, and behavior.
 */
/**
 * @param {HTMLElement} item
 * @param {object} options
 * @returns {number}
 */
function getDepth(item, options) {
	let depth = 0;
	let current = item.parentElement?.closest(options.selectors.item);

	while (current) {
		depth += 1;
		current = current.parentElement?.closest(options.selectors.item);
	}

	return depth;
}

/**
 * @param {HTMLElement} item
 * @param {object} options
 * @returns {HTMLElement|null}
 */
function getParentItem(item, options) {
	return item.parentElement?.closest(options.selectors.item) || null;
}

/**
 * @param {HTMLElement} item
 * @param {object} options
 * @returns {boolean}
 */
function isMegaMenu(item, options) {
	return options.mega.enabled && item.classList.contains('mega-menu');
}

/**
 * @param {HTMLElement} item
 * @returns {boolean}
 */
function isInsideMegaMenuPanel(item) {
	const megaPanel = item.closest('.mega-menu > .sub-menu');

	if (!(megaPanel instanceof HTMLElement)) {
		return false;
	}

	const megaRoot = megaPanel.parentElement;
	return megaRoot instanceof HTMLElement && megaRoot !== item;
}

/**
 * @param {HTMLElement} item
 * @param {object} options
 * @returns {{ kind: 'topLevel'|'nested'|'mega', depth: number, parentItem: HTMLElement|null, usePopover: boolean }}
 */
function classifyItem(item, options) {
	const depth = getDepth(item, options);
	const parentItem = getParentItem(item, options);
	const mega = isMegaMenu(item, options);
	const insideMegaPanel = isInsideMegaMenuPanel(item);

	return {
		kind: mega ? 'mega' : depth > 0 ? 'nested' : 'topLevel',
		depth,
		parentItem,
		usePopover: mega || !insideMegaPanel,
	};
}

/**
 * @param {HTMLElement} item
 * @param {string|HTMLElement|null} reference
 * @returns {HTMLElement|null}
 */
function resolveReferenceTarget(item, reference) {
	if (!reference) {
		return null;
	}

	if (reference instanceof HTMLElement) {
		return reference;
	}

	if (reference === ':scope') {
		return item;
	}

	if (typeof reference === 'string') {
		const scoped = item.querySelector(reference);

		if (scoped instanceof HTMLElement) {
			return scoped;
		}

		const doc = item.ownerDocument || document;
		const global = doc.querySelector(reference);

		if (global instanceof HTMLElement) {
			return global;
		}
	}

	return null;
}

/**
 * @param {'topLevel'|'nested'|'mega'} kind
 * @param {object} options
 * @returns {'hover'|'click'|'mixed'|'click-toggle'|null}
 */
function getResolvedTriggerMode(kind, options) {
	if (kind === 'nested') {
		return options.nestedTriggerMode ?? options.triggerMode;
	}

	if (kind === 'mega') {
		return options.megaTriggerMode ?? options.triggerMode;
	}

	return options.triggerMode;
}

/**
 * @param {HTMLElement} item
 * @param {'topLevel'|'nested'|'mega'} kind
 * @param {object} options
 * @returns {HTMLElement}
 */
function getReferenceElement(item, kind, options) {
	if (kind === 'mega') {
		const megaReference =
			resolveReferenceTarget(item, options.mega.reference) ||
			resolveReferenceTarget(item, options.selectors.megaReference) ||
			resolveReferenceTarget(item, options.selectors.reference);

		return megaReference || item;
	}

	const reference = resolveReferenceTarget(item, options.selectors.reference);

	return reference || item;
}

/**
 * Builds a menu entry model from one menu item.
 *
 * @param {HTMLElement} item
 * @param {object} options
 * @returns {object|null}
 */
export function buildMenuEntry(item, options) {
	const link = item.querySelector(options.selectors.link);
	const toggle = item.querySelector(options.selectors.toggle);
	const panel = item.querySelector(options.selectors.panel);

	if (!(link instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
		return null;
	}

	const classification = classifyItem(item, options);
	const triggerMode = getResolvedTriggerMode(classification.kind, options);
	const toggleButton = toggle instanceof HTMLButtonElement ? toggle : null;

	let useSplitToggle =
		options.splitToggle.enabled &&
		!!toggleButton &&
		(triggerMode === 'hover' || triggerMode === 'mixed' || triggerMode === 'click-toggle');

	let trigger = useSplitToggle ? toggleButton : link;

	if (!classification.usePopover) {
		useSplitToggle = false;
		trigger = link;
	}

	return {
		item,
		link,
		toggle: toggleButton,
		trigger,
		triggerMode,
		useSplitToggle,
		panel,
		reference: getReferenceElement(item, classification.kind, options),
		popover: null,
		cleanup: [],
		...classification,
	};
}
