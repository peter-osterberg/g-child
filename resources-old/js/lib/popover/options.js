import { WAAPI_EASING_IN, WAAPI_EASING_OUT } from '../motion-utils.js';

/**
 * Shared default options for G-child popovers.
 *
 * @type {Readonly<object>}
 */
const GC_POPOVER_DEFAULTS = Object.freeze({
	placement: 'bottom-start',
	strategy: 'absolute',
	offset: 0,
	padding: 0,
	enablePositioning: true,
	closeOnReferenceHidden: false,
	closeOnOutsideClick: true,
	closeOnEscape: true,
	closeOnTriggerClick: true,
	closeSiblings: true,
	preventLinkNavigation: true,
	focusTextEntryOnTriggerClick: true,
	syncTextEntryFocusOnOpen: true,
	openClass: 'is-open',
	activeClass: 'is-active',
	useHidden: true,
	openAnimationParams: {
		duration: 220,
		ease: WAAPI_EASING_OUT,
		opacity: [0, 1],
		y: [-10, 0],
	},
	closeAnimationParams: {
		duration: 180,
		ease: WAAPI_EASING_IN,
		opacity: [1, 0],
		y: [0, -6],
	},
	hoverTarget: null,
	referenceElement: null,
	ariaControllerElement: null,
	hoverController: null,
	onOpenStart: null,
	onOpenEnd: null,
	onCloseStart: null,
	onCloseEnd: null,
	outsideClickBoundary: null,
});

export default GC_POPOVER_DEFAULTS;
