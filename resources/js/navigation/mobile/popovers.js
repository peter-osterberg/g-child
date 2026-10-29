import GcPopover from '../../lib/popover/instance.js';
import { composeHooks } from '../../lib/dropdown-utils.js';
import { mergeObject } from '../../lib/object-utils.js';
import { syncMobileMenuBackButtonState } from './bindings.js';

/**
 * Merge popover options while preserving nested animation objects.
 *
 * @param {object|undefined|null} base
 * @param {object|undefined|null} overrides
 * @returns {object}
 */
export function mergeMobileMenuPopoverOptions(base, overrides) {
	const safeBase = base && typeof base === 'object' ? base : {};
	const safeOverrides = overrides && typeof overrides === 'object' ? overrides : {};

	return {
		...safeBase,
		...safeOverrides,
		openAnimationParams: mergeObject(safeBase.openAnimationParams, safeOverrides.openAnimationParams),
		closeAnimationParams: mergeObject(safeBase.closeAnimationParams, safeOverrides.closeAnimationParams),
	};
}

/**
 * @param {object} menu
 * @param {object} popover
 * @returns {void}
 */
export function handleMobileMenuPopoverOpen(menu, popover) {
	menu.mobileMenu.classList.add('is-popover-open');
	menu.focusScope.trackOpen(popover);
	menu.focusScope.sync();
	syncMobileMenuBackButtonState(menu);
}

/**
 * @param {object} menu
 * @param {object} popover
 * @returns {void}
 */
export function handleMobileMenuPopoverClose(menu, popover) {
	menu.focusScope.trackClose(popover);
	menu.focusScope.sync();

	if (!menu.focusScope.getLatestPanel()) {
		menu.mobileMenu.classList.remove('is-popover-open');
	}

	syncMobileMenuBackButtonState(menu);
}

/**
 * @param {object} menu
 * @returns {object}
 */
export function createMobileMenuPopoverOptions(menu) {
	return {
		...menu.options.popover,
		outsideClickBoundary: menu.mobileMenu,
		onOpenStart: composeHooks(menu.options.popover.onOpenStart, ({ popover }) => {
			handleMobileMenuPopoverOpen(menu, popover);
		}),
		onOpenEnd: composeHooks(menu.options.popover.onOpenEnd, ({ popover, focusFirst }) => {
			handleMobileMenuPopoverOpen(menu, popover);

			if (focusFirst) {
				requestAnimationFrame(() => menu.focusScope.focusLatestPanel());
			}
		}),
		onCloseStart: composeHooks(menu.options.popover.onCloseStart, ({ popover }) => {
			handleMobileMenuPopoverClose(menu, popover);
		}),
		onCloseEnd: composeHooks(menu.options.popover.onCloseEnd, ({ popover }) => {
			handleMobileMenuPopoverClose(menu, popover);

			if (menu.skipAutoFocusLatestPanelOnClose) {
				menu.skipAutoFocusLatestPanelOnClose = false;
				return;
			}

			if (menu.focusScope.getLatestPanel()) {
				requestAnimationFrame(() => menu.focusScope.focusLatestPanel());
			}
		}),
	};
}

/**
 * @param {object} menu
 * @param {object} basePopoverOptions
 * @returns {GcPopover[]}
 */
export function createMobileMenuExtraPopovers(menu, basePopoverOptions) {
	return menu.options.extraPanels.reduce((popovers, entry) => {
		const triggerEl = menu.mobileMenu.querySelector(entry.trigger);
		const panelEl = menu.mobileMenu.querySelector(entry.panel);

		if (!(triggerEl instanceof HTMLElement) || !(panelEl instanceof HTMLElement)) {
			return popovers;
		}

		popovers.push(
			new GcPopover(triggerEl, panelEl, mergeMobileMenuPopoverOptions(basePopoverOptions, entry.options)),
		);

		return popovers;
	}, []);
}
