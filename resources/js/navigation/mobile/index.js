import MenuController from '../menu/menu-controller.js';
import { resolveOptionalElement } from '../../lib/dropdown-utils.js';
import { mergeObject } from '../../lib/object-utils.js';
import MOBILE_MENU_DEFAULTS from './options.js';
import {
	bindMobileMenuBackButton,
	bindMobileMenuDialogEvents,
	bindMobileMenuToggles,
	syncMobileMenuBackButtonState,
	syncMobileMenuToggleState,
	unbindMobileMenuBackButton,
	unbindMobileMenuDialogEvents,
	unbindMobileMenuToggles,
} from './bindings.js';
import {
	animateMobileMenuDialog,
	cancelMobileMenuDialogAnimation,
	closeAllMobileMenuPopovers,
	closeMobileMenu,
	openMobileMenu,
	prepareMobileMenuForOpen,
	resetMobileMenuDialogAnimationStyles,
	restoreDraggedMobileMenu,
	toggleMobileMenu,
} from './dialog.js';
import MobileMenuDialogMotion from './dialog-motion.js';
import {
	createMobileMenuExtraPopovers,
	createMobileMenuPopoverOptions,
	handleMobileMenuPopoverClose,
	handleMobileMenuPopoverOpen,
	mergeMobileMenuPopoverOptions,
} from './popovers.js';
import {
	applyMobileMenuDraggedDialogState,
	handleMobileMenuDialogPointerCancel,
	handleMobileMenuDialogPointerDown,
	handleMobileMenuDialogPointerMove,
	handleMobileMenuDialogPointerUp,
	isMobileMenuSwipeGestureTargetAllowed,
	prepareMobileMenuDraggedDialogState,
	resetMobileMenuSwipeGesture,
} from './swipe.js';
import MobileMenuFocusScope from './focus-scope.js';

/**
 * Dialog shell for a mobile navigation menu.
 *
 * Responsibilities:
 * - open/close the dialog
 * - create click-mode menu branches through MenuController
 * - wire extra non-menu panels like search
 * - delegate body tab scope to MobileMenuFocusScope
 * - optionally close the latest open branch from a Back button
 */
class MobileMenu {
	/**
	 * @param {HTMLDialogElement|string|null|undefined} element
	 * @param {object} [options]
	 */
	constructor(element, options = {}) {
		const resolved = resolveOptionalElement(element);

		this.mobileMenu = resolved instanceof HTMLDialogElement ? resolved : null;
		this.options = {
			...MOBILE_MENU_DEFAULTS,
			...options,
			extraPanels: Array.isArray(options.extraPanels) ? options.extraPanels : [],
			mobileMenuAnimation: mergeObject(MOBILE_MENU_DEFAULTS.mobileMenuAnimation, options.mobileMenuAnimation),
			popover: mergeMobileMenuPopoverOptions(MOBILE_MENU_DEFAULTS.popover, options.popover),
		};

		this.menuController = null;
		this.extraPopovers = [];
		this.mobileToggles = [];
		this.lastActiveToggle = null;
		this.dialogMotion =
			this.mobileMenu instanceof HTMLDialogElement
				? new MobileMenuDialogMotion(this.mobileMenu, this.options.mobileMenuAnimation)
				: null;
		this.isClosingMenu = false;
		this.isTransitioningMenu = false;
		this.isInitialized = false;
		this.suppressNextDialogClick = false;
		this.skipAutoFocusLatestPanelOnClose = false;
		this.shouldAutoFocusOnOpen = true;
		this.menuAnimationToken = 0;
		this.swipeGesture = {
			active: false,
			dragging: false,
			pointerId: null,
			startX: 0,
			startY: 0,
			lastX: 0,
			lastTime: 0,
			deltaX: 0,
			velocityX: 0,
			width: 0,
		};

		this.focusScope =
			this.mobileMenu instanceof HTMLDialogElement
				? new MobileMenuFocusScope(this.mobileMenu, {
						bodySelector: this.options.bodySelector,
					})
				: null;

		this.backButton =
			this.mobileMenu instanceof HTMLDialogElement
				? this.resolveOptionalElement(this.options.backButtonSelector)
				: null;

		this.handleMobileToggleClick = this.handleMobileToggleClick.bind(this);
		this.handleBackButtonClick = this.handleBackButtonClick.bind(this);
		this.handleDialogClick = this.handleDialogClick.bind(this);
		this.handleDialogCancel = this.handleDialogCancel.bind(this);
		this.handleDialogClose = this.handleDialogClose.bind(this);
		this.handleDialogPointerDown = this.handleDialogPointerDown.bind(this);
		this.handleDialogPointerMove = this.handleDialogPointerMove.bind(this);
		this.handleDialogPointerUp = this.handleDialogPointerUp.bind(this);
		this.handleDialogPointerCancel = this.handleDialogPointerCancel.bind(this);
	}

	/**
	 * @param {HTMLElement|string|null|undefined} value
	 * @returns {HTMLElement|null}
	 */
	resolveOptionalElement(value) {
		if (!(this.mobileMenu instanceof HTMLDialogElement)) {
			return null;
		}

		if (!value) {
			return null;
		}

		if (value instanceof HTMLElement) {
			return value;
		}

		if (typeof value === 'string') {
			const element = this.mobileMenu.querySelector(value);
			return element instanceof HTMLElement ? element : null;
		}

		return null;
	}

	/**
	 * @returns {MobileMenu}
	 */
	init() {
		if (
			this.isInitialized ||
			!(this.mobileMenu instanceof HTMLDialogElement) ||
			!(this.focusScope instanceof MobileMenuFocusScope)
		) {
			return this;
		}

		const popoverOptions = this.createPopoverOptions();

		this.menuController = new MenuController(this.mobileMenu, {
			triggerMode: this.options.triggerMode,
			popover: popoverOptions,
			mega: {
				enabled: false,
			},
		}).init();

		this.createExtraPopovers(popoverOptions);
		this.bindMobileToggles();
		this.bindBackButton();
		this.bindDialogEvents();
		this.syncToggleState();
		this.syncBackButtonState();
		this.focusScope.sync();

		this.isInitialized = true;
		return this;
	}

	/**
	 * @returns {MobileMenu}
	 */
	destroy() {
		if (!this.isInitialized) {
			return this;
		}

		this.unbindMobileToggles();
		this.unbindBackButton();
		this.unbindDialogEvents();
		this.cancelDialogAnimation();

		for (const popover of this.extraPopovers) {
			popover?.destroy?.();
		}

		this.menuController?.destroy?.();

		if (this.mobileMenu.open) {
			this.mobileMenu.close();
		}

		this.focusScope.clear();
		this.extraPopovers = [];
		this.mobileToggles = [];
		this.menuController = null;
		this.lastActiveToggle = null;
		this.isClosingMenu = false;
		this.isTransitioningMenu = false;
		this.isInitialized = false;
		this.suppressNextDialogClick = false;
		this.skipAutoFocusLatestPanelOnClose = false;
		this.shouldAutoFocusOnOpen = true;
		this.menuAnimationToken = 0;

		this.resetSwipeGesture();
		this.mobileMenu.classList.remove('is-popover-open', 'is-open');
		this.resetDialogAnimationStyles();
		this.syncBackButtonState();

		return this;
	}

	/**
	 * @returns {object}
	 */
	createPopoverOptions() {
		return createMobileMenuPopoverOptions(this);
	}

	/**
	 * @param {object} popover
	 * @returns {void}
	 */
	handlePopoverOpen(popover) {
		handleMobileMenuPopoverOpen(this, popover);
	}

	/**
	 * @param {object} popover
	 * @returns {void}
	 */
	handlePopoverClose(popover) {
		handleMobileMenuPopoverClose(this, popover);
	}

	/**
	 * @param {object} basePopoverOptions
	 * @returns {void}
	 */
	createExtraPopovers(basePopoverOptions) {
		this.extraPopovers = createMobileMenuExtraPopovers(this, basePopoverOptions);
	}

	/**
	 * @returns {void}
	 */
	bindMobileToggles() {
		bindMobileMenuToggles(this);
	}

	/**
	 * @returns {void}
	 */
	unbindMobileToggles() {
		unbindMobileMenuToggles(this);
	}

	/**
	 * @returns {void}
	 */
	bindBackButton() {
		bindMobileMenuBackButton(this);
	}

	/**
	 * @returns {void}
	 */
	unbindBackButton() {
		unbindMobileMenuBackButton(this);
	}

	/**
	 * @returns {void}
	 */
	bindDialogEvents() {
		bindMobileMenuDialogEvents(this);
	}
	/**
	 * @returns {void}
	 */
	unbindDialogEvents() {
		unbindMobileMenuDialogEvents(this);
	}

	/**
	 * @param {EventTarget|null} target
	 * @returns {boolean}
	 */
	isSwipeGestureTargetAllowed(target) {
		return isMobileMenuSwipeGestureTargetAllowed(target);
	}

	/**
	 * @returns {void}
	 */
	resetSwipeGesture() {
		resetMobileMenuSwipeGesture(this);
	}

	/**
	 * @returns {void}
	 */
	prepareDraggedDialogState() {
		prepareMobileMenuDraggedDialogState(this);
	}

	/**
	 * @param {number} offsetX
	 * @returns {void}
	 */
	applyDraggedDialogState(offsetX) {
		applyMobileMenuDraggedDialogState(this, offsetX);
	}

	/**
	 * @returns {Promise<void>}
	 */
	async restoreDraggedMenu() {
		await restoreDraggedMobileMenu(this);
	}

	/**
	 * @returns {void}
	 */
	syncToggleState() {
		syncMobileMenuToggleState(this);
	}

	/**
	 * @returns {void}
	 */
	syncBackButtonState() {
		syncMobileMenuBackButtonState(this);
	}

	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	handleMobileToggleClick(event) {
		event.preventDefault();

		if (this.isTransitioningMenu) {
			return;
		}

		if (event.currentTarget instanceof HTMLElement) {
			this.lastActiveToggle = event.currentTarget;
		}

		if (!this.mobileMenu.open) {
			this.shouldAutoFocusOnOpen = event.detail === 0;
		}

		this.toggleMenu();
	}

	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	handleBackButtonClick(event) {
		event.preventDefault();

		if (this.isTransitioningMenu) {
			return;
		}

		const latestPopover = this.focusScope.getLatestPopover();

		if (latestPopover?.close) {
			this.skipAutoFocusLatestPanelOnClose = true;
			void latestPopover.close({ focusTrigger: true });
			return;
		}

		if (this.options.closeMenuOnBackAtRoot) {
			void this.closeMenu();
		}
	}

	/**
	 * @param {Event} event
	 * @returns {void}
	 */
	handleDialogCancel(event) {
		event.preventDefault();

		if (this.isTransitioningMenu) {
			return;
		}

		void this.closeMenu();
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleDialogPointerDown(event) {
		handleMobileMenuDialogPointerDown(this, event);
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleDialogPointerMove(event) {
		handleMobileMenuDialogPointerMove(this, event);
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleDialogPointerUp(event) {
		handleMobileMenuDialogPointerUp(this, event);
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleDialogPointerCancel(event) {
		handleMobileMenuDialogPointerCancel(this, event);
	}

	/**
	 * @returns {void}
	 */
	handleDialogClose() {
		this.resetSwipeGesture();
		this.suppressNextDialogClick = false;
		this.closeAllPopovers();
		this.focusScope.clear();
		this.mobileMenu.classList.remove('is-popover-open');
		this.isClosingMenu = false;
		this.isTransitioningMenu = false;
		this.skipAutoFocusLatestPanelOnClose = false;
		this.resetDialogAnimationStyles();
		this.syncToggleState();
		this.syncBackButtonState();

		if (this.lastActiveToggle instanceof HTMLElement) {
			this.lastActiveToggle.focus();
		}
	}

	/**
	 * Close the whole menu when clicking the native dialog backdrop.
	 * For <dialog>, backdrop clicks come through as clicks on the dialog itself.
	 *
	 * Clicks inside the dialog content will target descendants instead.
	 *
	 * @param {MouseEvent} event
	  @returns {void}
	 */
	handleDialogClick(event) {
		if (this.suppressNextDialogClick) {
			event.preventDefault();
			event.stopPropagation();
			this.suppressNextDialogClick = false;
			return;
		}

		if (this.isTransitioningMenu) {
			return;
		}

		if (event.target !== this.mobileMenu) {
			return;
		}

		void this.closeMenu();
	}

	/**
	 * @returns {void}
	 */
	cancelDialogAnimation() {
		cancelMobileMenuDialogAnimation(this);
	}

	/**
	 * @returns {void}
	 */
	resetDialogAnimationStyles() {
		resetMobileMenuDialogAnimationStyles(this);
	}

	/**
	 * Prime the dialog with its off-canvas open start state before `showModal()`.
	 *
	 * Without this, the `[open]` CSS resting transform can paint for a frame
	 * before the WAAPI animation starts, which looks like a flicker.
	 *
	 * @returns {void}
	 */
	prepareDialogForOpen() {
		prepareMobileMenuForOpen(this);
	}

	/**
	 * @param {'open'|'close'} type
	 * @param {{ fromCurrent?: boolean }} [options]
	 * @returns {unknown}
	 */
	animateDialog(type, options = {}) {
		return animateMobileMenuDialog(this, type, options);
	}

	/**
	 * @returns {Promise<void>}
	 */
	async openMenu() {
		await openMobileMenu(this);
	}

	/**
	 * @returns {Promise<void>}
	 */
	async closeMenu() {
		await closeMobileMenu(this);
	}

	/**
	 * @returns {void}
	 */
	toggleMenu() {
		toggleMobileMenu(this);
	}

	/**
	 * @returns {void}
	 */
	closeAllPopovers() {
		closeAllMobileMenuPopovers(this);
	}
}
export default MobileMenu;
