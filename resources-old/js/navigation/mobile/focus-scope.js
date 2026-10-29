/**
 * Focus-scope helper for the mobile dialog menu so only the active branch stays tabbable.
 */
const MANAGED_FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]',
	'[contenteditable="true"]',
].join(',');

const TABBABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]',
].join(',');

/** @typedef {import('../../lib/popover/instance.js').default} GcPopover */

/**
 * Manages focus scope and tab order inside a mobile navigation dialog.
 *
 * The goal is simple:
 * - header/footer controls stay tabbable
 * - only the latest open submenu panel stays tabbable inside the nav body
 * - explicitly hidden ancestors remove descendants from the active tab sequence
 */
class MobileMenuFocusScope {
	/**
	 * @param {HTMLDialogElement} root
	 * @param {{ bodySelector?: string }} [options]
	 */
	constructor(root, { bodySelector = '.mobile-nav-body' } = {}) {
		this.root = root;
		this.bodySelector = bodySelector;
		this.openPopoverStack = [];
		this.tabIndexCache = new WeakMap();
		this.managedTabIndexElements = new Set();
		this.cachedBody = null;
	}

	/**
	 * @param {GcPopover} popover
	 * @returns {void}
	 */
	trackOpen(popover) {
		this.openPopoverStack = this.openPopoverStack.filter((item) => item !== popover);
		this.openPopoverStack.push(popover);
	}

	/**
	 * @param {GcPopover} popover
	 * @returns {void}
	 */
	trackClose(popover) {
		this.openPopoverStack = this.openPopoverStack.filter((item) => item !== popover);
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.openPopoverStack = [];
		this.restoreAllTabIndexes();
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	getBody() {
		if (this.cachedBody instanceof HTMLElement && this.cachedBody.isConnected) {
			return this.cachedBody;
		}

		const body = this.root.querySelector(this.bodySelector);
		this.cachedBody = body instanceof HTMLElement ? body : null;

		return this.cachedBody;
	}

	/**
	 * @returns {GcPopover|null}
	 */
	getLatestPopover() {
		this.openPopoverStack = this.openPopoverStack.filter(
			(popover) => popover?.panel instanceof HTMLElement && popover.panel.isConnected,
		);

		return this.openPopoverStack.at(-1) || null;
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	getLatestPanel() {
		return this.getLatestPopover()?.panel ?? null;
	}

	/**
	 * @returns {boolean}
	 */
	hasOpenPanels() {
		return !!this.getLatestPopover();
	}

	/**
	 * Cheap explicit-hidden check.
	 *
	 * This intentionally avoids getComputedStyle() because that was the hot path.
	 * If your menu relies on CSS-only hiding without hidden/inert/aria-hidden,
	 * you may need to add a class/attribute based check here instead.
	 *
	 * @param {HTMLElement} element
	 * @param {HTMLElement|null} stopAt
	 * @returns {boolean}
	 */
	hasExplicitlyHiddenAncestor(element, stopAt) {
		let current = element;

		while (current && current !== stopAt) {
			if (!(current instanceof HTMLElement)) {
				return true;
			}

			if (current.hidden || current.inert || current.getAttribute('aria-hidden') === 'true') {
				return true;
			}

			current = current.parentElement;
		}

		return false;
	}

	/**
	 * @param {HTMLElement} element
	 * @param {HTMLElement|null} latestOpenPanel
	 * @param {HTMLElement|null} mobileNavBody
	 * @returns {boolean}
	 */
	shouldBeTabbable(element, latestOpenPanel, mobileNavBody) {
		if (!(mobileNavBody instanceof HTMLElement) || !mobileNavBody.contains(element)) {
			return false;
		}

		if (this.hasExplicitlyHiddenAncestor(element, mobileNavBody)) {
			return false;
		}

		if (!(latestOpenPanel instanceof HTMLElement)) {
			return true;
		}

		if (!latestOpenPanel.contains(element)) {
			return false;
		}

		return !this.hasExplicitlyHiddenAncestor(element, latestOpenPanel);
	}

	/**
	 * @returns {HTMLElement[]}
	 */
	getManagedFocusableElements() {
		const body = this.getBody();

		if (!(body instanceof HTMLElement)) {
			return [];
		}

		return Array.from(body.querySelectorAll(MANAGED_FOCUSABLE_SELECTOR)).filter(
			(element) => element instanceof HTMLElement,
		);
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {void}
	 */
	disableTabbing(element) {
		if (!this.tabIndexCache.has(element)) {
			this.tabIndexCache.set(element, element.getAttribute('tabindex'));
		}

		this.managedTabIndexElements.add(element);

		if (element.getAttribute('tabindex') !== '-1') {
			element.setAttribute('tabindex', '-1');
		}
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {void}
	 */
	restoreTabbing(element) {
		if (!this.tabIndexCache.has(element)) {
			return;
		}

		const originalTabIndex = this.tabIndexCache.get(element);

		if (originalTabIndex === null) {
			element.removeAttribute('tabindex');
		} else if (element.getAttribute('tabindex') !== originalTabIndex) {
			element.setAttribute('tabindex', originalTabIndex);
		}

		this.tabIndexCache.delete(element);
		this.managedTabIndexElements.delete(element);
	}

	/**
	 * @returns {void}
	 */
	restoreAllTabIndexes() {
		for (const element of Array.from(this.managedTabIndexElements)) {
			if (element instanceof HTMLElement) {
				this.restoreTabbing(element);
			}
		}
	}

	/**
	 * @returns {void}
	 */
	sync() {
		const mobileNavBody = this.getBody();

		if (!(mobileNavBody instanceof HTMLElement)) {
			return;
		}

		const latestOpenPanel = this.getLatestPanel();
		const focusableElements = this.getManagedFocusableElements();

		for (const element of focusableElements) {
			if (this.shouldBeTabbable(element, latestOpenPanel, mobileNavBody)) {
				this.restoreTabbing(element);
			} else {
				this.disableTabbing(element);
			}
		}
	}

	/**
	 * @returns {void}
	 */
	focusInitial() {
		const latestOpenPanel = this.getLatestPanel();

		if (latestOpenPanel instanceof HTMLElement) {
			this.focusLatestPanel();
			return;
		}

		const firstFocusable = Array.from(this.root.querySelectorAll(TABBABLE_SELECTOR)).find(
			(element) => element instanceof HTMLElement,
		);

		if (firstFocusable instanceof HTMLElement) {
			firstFocusable.focus();
			return;
		}

		if (!this.root.hasAttribute('tabindex')) {
			this.root.setAttribute('tabindex', '-1');
		}

		this.root.focus();
	}

	/**
	 * @returns {void}
	 */
	focusLatestPanel() {
		const panel = this.getLatestPanel();
		const mobileNavBody = this.getBody();

		if (!(panel instanceof HTMLElement)) {
			return;
		}

		const activeElement = document.activeElement;

		if (
			activeElement instanceof HTMLElement &&
			panel.contains(activeElement) &&
			this.shouldBeTabbable(activeElement, panel, mobileNavBody)
		) {
			return;
		}

		const firstFocusable = Array.from(panel.querySelectorAll(TABBABLE_SELECTOR)).find(
			(element) => element instanceof HTMLElement && this.shouldBeTabbable(element, panel, mobileNavBody),
		);

		if (firstFocusable instanceof HTMLElement) {
			firstFocusable.focus();
			return;
		}

		if (!panel.hasAttribute('tabindex')) {
			panel.setAttribute('tabindex', '-1');
		}

		panel.focus();
	}
}

export default MobileMenuFocusScope;
