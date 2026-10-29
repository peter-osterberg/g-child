import { WAAPI_EASING_IN, WAAPI_EASING_OUT } from '../../lib/motion-utils.js';

/**
 * Shared default configuration for the mobile dialog menu shell and its nested panels.
 */
const MOBILE_MENU_DEFAULTS = {
	triggerMode: 'click-toggle',
	mobileToggleSelector: '.mobile-toggle',
	backButtonSelector: '#mobile-menu-back',
	bodySelector: '.mobile-nav-body',
	closeMenuOnBackAtRoot: true,
	closeOnOutsideClick: false,
	extraPanels: [],

	mobileMenuAnimation: {
		open: {
			duration: 360,
			ease: WAAPI_EASING_OUT,
			opacity: [1, 1],
			x: ['100%', '0%'],
		},
		close: {
			duration: 300,
			ease: WAAPI_EASING_IN,
			opacity: [1, 1],
			x: ['0%', '100%'],
		},
	},

	popover: {
		enablePositioning: false,
		focusTextEntryOnTriggerClick: true,
		syncTextEntryFocusOnOpen: true,
		strategy: 'fixed',
		offset: 0,
		padding: 0,
		openAnimationParams: {
			duration: 280,
			ease: WAAPI_EASING_OUT,
			opacity: [0, 1],
			x: ['18%', 0],
			y: 0,
		},
		closeAnimationParams: {
			duration: 220,
			ease: WAAPI_EASING_IN,
			opacity: [1, 0],
			x: [0, '14%'],
			y: 0,
		},
	},
};

export default MOBILE_MENU_DEFAULTS;
