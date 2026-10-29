/**
 * Creates and configures menu popovers from normalized menu entry models.
 */
import GcPopover from '../../lib/popover/instance.js';
import GcPopoverHoverController from '../../lib/popover/hover-controller.js';
import { composeHooks } from '../../lib/dropdown-utils.js';
import { syncSplitToggleAria } from './menu-item-wiring.js';

/**
 * @param {object} entry
 * @param {string} name
 * @returns {void}
 */
function dispatchEntryEvent(entry, name) {
	entry.item.dispatchEvent(
		new CustomEvent(name, {
			bubbles: false,
			detail: { entry },
		}),
	);
}

/**
 * @param {object} entry
 * @param {object} options
 * @returns {object|null}
 */
function getPopoverOptions(entry, options) {
	if (!entry.usePopover) {
		return null;
	}

	let popoverOptions = { ...options.popover };

	if (entry.kind === 'nested') {
		popoverOptions = {
			...popoverOptions,
			...options.nestedPopover,
		};
	}

	if (entry.kind === 'mega') {
		popoverOptions = {
			...popoverOptions,
			...options.mega.popover,
		};
	}

	return popoverOptions;
}

/**
 * @param {object} entry
 * @param {object} options
 * @returns {object|null}
 */
function getHoverControllerOptions(entry, options) {
	if (entry.triggerMode !== 'hover' && entry.triggerMode !== 'mixed') {
		return null;
	}

	let hoverOptions = { ...options.hover };

	if (entry.kind === 'nested') {
		hoverOptions = {
			...hoverOptions,
			...options.nestedHover,
		};
	}

	if (entry.kind === 'mega') {
		hoverOptions = {
			...hoverOptions,
			...options.mega.hover,
		};
	}

	return {
		hoverTarget: entry.item,
		hoverMediaQuery: hoverOptions.hoverMediaQuery,
		openDelay: hoverOptions.openDelay,
		closeDelay: hoverOptions.closeDelay,
	};
}

/**
 * Creates a popover for one menu entry.
 *
 * @param {object} entry
 * @param {object} options
 * @returns {GcPopover|null}
 */
export function createEntryPopover(entry, options) {
	const popoverOptions = getPopoverOptions(entry, options);

	if (!popoverOptions) {
		return null;
	}

	const popover = new GcPopover(entry.trigger, entry.panel, {
		...popoverOptions,
		hoverTarget: entry.item,
		referenceElement: entry.reference,
		ariaControllerElement: entry.trigger,
		onOpenStart: composeHooks(popoverOptions.onOpenStart, () => {
			dispatchEntryEvent(entry, 'menu:open');
		}),
		onOpenEnd: composeHooks(popoverOptions.onOpenEnd, () => {
			syncSplitToggleAria(entry);
		}),
		onCloseEnd: composeHooks(popoverOptions.onCloseEnd, () => {
			dispatchEntryEvent(entry, 'menu:close');
			syncSplitToggleAria(entry);
		}),
	});

	const hoverOptions = getHoverControllerOptions(entry, options);

	if (hoverOptions) {
		popover.setHoverController(new GcPopoverHoverController(popover, hoverOptions));
	}

	return popover;
}
