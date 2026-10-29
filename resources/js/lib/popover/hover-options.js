/**
 * Frozen to prevent accidental runtime mutation of global defaults.
 *
 * @type {Readonly<object>}
 */
const GC_POPOVER_HOVER_DEFAULTS = Object.freeze({
	hoverMediaQuery: '(hover: hover) and (pointer: fine)',
	openDelay: 60,
	closeDelay: 120,
});

export default GC_POPOVER_HOVER_DEFAULTS;
