/**
 * Shared default configuration and deep-merge helpers for the menu controller.
 */
import GC_POPOVER_DEFAULTS from '../../lib/popover/options.js';
import GC_POPOVER_HOVER_DEFAULTS from '../../lib/popover/hover-options.js';
import { isPlainObject, mergeObject } from '../../lib/object-utils.js';

const MENU_CONTROLLER_DEFAULTS = {
	triggerMode: 'hover',
	nestedTriggerMode: null,
	megaTriggerMode: null,

	selectors: {
		item: '.menu-item-has-children',
		link: ':scope > a, :scope > button:not(.sub-menu-toggle)',
		toggle: ':scope > .sub-menu-toggle',
		panel: ':scope > .sub-menu',
		reference: null,
		megaReference: null,
	},

	popover: {
		...GC_POPOVER_DEFAULTS,
		closeSiblings: false,
		preventLinkNavigation: false,
	},

	hover: {
		hoverMediaQuery: GC_POPOVER_HOVER_DEFAULTS.hoverMediaQuery,
		openDelay: 70,
		closeDelay: 240,
	},

	nestedPopover: {
		placement: 'right-start',
		offset: 4,
	},

	nestedHover: {
		openDelay: 110,
		closeDelay: 300,
	},

	mega: {
		enabled: true,
		reference: null,
		popover: {},
		hover: {},
	},

	splitToggle: {
		enabled: true,
	},

	preventHashOnlyLinkNavigation: true,
};

/**
 * @param {object} [options]
 * @returns {object}
 */
export function mergeMenuOptions(options = {}) {
	return {
		...MENU_CONTROLLER_DEFAULTS,
		...options,
		selectors: mergeObject(MENU_CONTROLLER_DEFAULTS.selectors, options.selectors),
		popover: mergeObject(MENU_CONTROLLER_DEFAULTS.popover, options.popover),
		hover: mergeObject(MENU_CONTROLLER_DEFAULTS.hover, options.hover),
		nestedPopover: mergeObject(MENU_CONTROLLER_DEFAULTS.nestedPopover, options.nestedPopover),
		nestedHover: mergeObject(MENU_CONTROLLER_DEFAULTS.nestedHover, options.nestedHover),
		mega: {
			...MENU_CONTROLLER_DEFAULTS.mega,
			...(isPlainObject(options.mega) ? options.mega : {}),
			popover: mergeObject(MENU_CONTROLLER_DEFAULTS.mega.popover, options.mega?.popover),
			hover: mergeObject(MENU_CONTROLLER_DEFAULTS.mega.hover, options.mega?.hover),
		},
		splitToggle: mergeObject(MENU_CONTROLLER_DEFAULTS.splitToggle, options.splitToggle),
	};
}
