/**
 * Front-end bootstrap for the global header, navigation, popovers, and page-level integrations.
 */
import { MenuController, MobileMenu } from './navigation/index.js';
import AutoHideHeader from './header/header-scroll-visibility.js';
import initLayoutCssVars from './header/viewport-layout-vars.js';
import MegaMenuInnerWrapper from './header/mega-menu-content-wrapper.js';
import MenuLabelNormalizer from './header/menu-label-inert-links.js';
import { initGravityForms } from './integrations/gravity-forms-ui.js';
import initPolylangWcag from './integrations/polylang-accessibility.js';
import initRemoveNoscript from './integrations/noscript-cleanup.js';
import initWpA11y from './integrations/wordpress-a11y-shim.js';
import initScrollToTopButton from './integrations/scroll-to-top.js';
import initRevealOnScroll from './lib/reveal-on-scroll/init.js';
import { initDeclarativePopovers } from './lib/popover/index.js';
import ListingFilterDropdown from './listing/listing-filter-popover.js';
import {
	SITE_HEADER_OPTIONS,
	SITE_MOBILE_MENU_OPTIONS,
	SITE_POPOVER_OPTIONS,
	SITE_REVEAL_ENABLED,
	SITE_REVEAL_OPTIONS,
	SITE_SELECTORS,
} from './site-config.js';

/**
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
function queryElement(selector) {
	const element = document.querySelector(selector);
	return element instanceof HTMLElement ? element : null;
}

/**
 * @param {string} selector
 * @returns {HTMLDialogElement|null}
 */
function queryDialog(selector) {
	const element = document.querySelector(selector);
	return element instanceof HTMLDialogElement ? element : null;
}

/**
 * Initialize the desktop header behaviors when the header exists.
 *
 * @returns {void}
 */
function initHeaderFeatures() {
	new MenuLabelNormalizer(document).init();

	const header = queryElement(SITE_SELECTORS.mainHeader);

	if (!(header instanceof HTMLElement)) {
		return;
	}

	new MegaMenuInnerWrapper(header).init();
	new AutoHideHeader(header, SITE_HEADER_OPTIONS.autoHide).init();
	new MenuController(header, SITE_HEADER_OPTIONS.menu).init();
}

/**
 * Initialize the mobile dialog navigation when the dialog exists.
 *
 * @returns {void}
 */
function initMobileNavigation() {
	const mobileMenu = queryDialog(SITE_SELECTORS.mobileMenu);

	if (!(mobileMenu instanceof HTMLDialogElement)) {
		return;
	}

	new MobileMenu(mobileMenu, SITE_MOBILE_MENU_OPTIONS).init();
}

/**
 * Initialize the optional reveal-on-scroll feature only when the site config enables it.
 *
 * @returns {void}
 */
function initRevealOnScrollFeature() {
	if (!SITE_REVEAL_ENABLED) {
		return;
	}

	initRevealOnScroll(document, SITE_REVEAL_OPTIONS);
}

/**
 * Initialize independent page features outside the main header/menu wiring.
 *
 * @returns {void}
 */
function initStandaloneFeatures() {
	initWpA11y();
	initRemoveNoscript();
	initPolylangWcag();
	new ListingFilterDropdown().init();
	initGravityForms();
	initDeclarativePopovers(document, SITE_POPOVER_OPTIONS.headerSearch);
	initDeclarativePopovers();
	initRevealOnScrollFeature();
	initScrollToTopButton();
}

/**
 * Bootstrap all front-end behaviors once the DOM is ready.
 *
 * @returns {void}
 */
function initGchild() {
	initHeaderFeatures();
	initMobileNavigation();
	initStandaloneFeatures();
	initLayoutCssVars(SITE_SELECTORS.mainHeader);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initGchild);
} else {
	initGchild();
}

if (import.meta.env.DEV) {
	import('./dev-tools/debug.js');
}
