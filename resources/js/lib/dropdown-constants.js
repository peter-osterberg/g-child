/**
 * Shared selectors and input-type registries used by dropdown, popover, and mobile-menu focus helpers.
 */
export const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]',
].join(',');

export const NON_TEXT_INPUT_TYPES = new Set([
	'hidden',
	'button',
	'submit',
	'reset',
	'checkbox',
	'radio',
	'range',
	'file',
	'color',
	'image',
]);
