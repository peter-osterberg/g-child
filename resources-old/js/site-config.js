/**
 * Site-level runtime config consumed by the front-end bootstrap.
 *
 * Component/library defaults still live with their owners. This file only
 * captures the site-specific selectors and overrides that were previously
 * defined inline in app.js.
 */
export const SITE_SELECTORS = {
	mainHeader: '#main-header',
	mobileMenu: '#mobile-menu',
};

export const SITE_HEADER_OPTIONS = {
	autoHide: {
		// Sticky mode starts after this point. The controller derives the near-top
		// handoff zone from the live header height so the sticky surface can hide
		// before the default hero header is shown again.
		offset: 200,
		threshold: 12,
	},
	menu: {
		triggerMode: 'hover',
		popover: {
			offset: 0,
			padding: 16,
		},
		nestedPopover: {
			offset: {
				mainAxis: 10,
				crossAxis: -8,
			},
		},
		mega: {
			popover: {
				placement: 'bottom',
			},
		},
	},
};

export const SITE_MOBILE_MENU_OPTIONS = {
	mobileToggleSelector: '.mobile-toggle',
	backButtonSelector: '#mobile-menu-back',
	bodySelector: '.mobile-nav-body',
	extraPanels: [
		{
			trigger: '.search-toggle',
			panel: '.module-search',
		},
	],
};

export const SITE_POPOVER_OPTIONS = {
	headerSearch: {
		triggerSelector: '#main-header [data-gc-toggle="search-popover"]',
		popover: {
			strategy: 'fixed',
			placement: 'bottom-end',
			offset: 0,
			padding: 16,
			closeOnReferenceHidden: true,
			syncTextEntryFocusOnOpen: false,
		},
	},
};

export const SITE_REVEAL_ENABLED = false;

export const SITE_REVEAL_OPTIONS = {
	enabled: SITE_REVEAL_ENABLED,
	rules: [
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
		{
			containerSelector: '.animate-text',
			targetSelector: '.module-text > :not(ul):not(ol), .module-text > ul > li, .module-text > ol > li',
		},
		{
			id: 'listing-rows',
			mode: 'listing-rows',
			containerSelector: '.animate-list',
			targetSelector: '.listing-post',
			listingSelector: '.module-listing',
			itemsWrapperSelector: '.listing-items-wrapper',
			itemSelector: '.listing-post',
			rowOffsetTolerance: 4,
			reveal: {
				once: true,
				delay: 0,
				stagger: 120,
			},
		},
	],
};
