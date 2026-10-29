import { FOCUSABLE_SELECTOR, NON_TEXT_INPUT_TYPES } from '../dropdown-constants.js';

/**
 * Handles focus lookup and deferred focus requests for a popover panel.
 */
class GcPopoverFocus {
	/**
	 * @param {HTMLElement} panel
	 */
	constructor(panel) {
		this.panel = panel;
		this.pending = null;
	}

	/**
	 * Cheap explicit-hidden check.
	 *
	 * This avoids getComputedStyle() in the hot path.
	 * If a branch is hidden, prefer marking it with hidden/inert/aria-hidden.
	 *
	 * @param {HTMLElement} element
	 * @returns {boolean}
	 */
	isVisibleCandidate(element) {
		let current = element;

		while (current instanceof HTMLElement) {
			if (current.hidden || current.inert || current.getAttribute('aria-hidden') === 'true') {
				return false;
			}

			if (current === this.panel) {
				return true;
			}

			current = current.parentElement;
		}

		return false;
	}

	/**
	 * @param {HTMLElement|null|undefined} element
	 * @returns {void}
	 */
	focusElement(element) {
		if (!(element instanceof HTMLElement)) {
			return;
		}

		try {
			element.focus({ preventScroll: true });
		} catch {
			element.focus();
		}
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	getFirstCandidate() {
		const elements = this.panel.querySelectorAll(FOCUSABLE_SELECTOR);

		for (const element of elements) {
			if (element instanceof HTMLElement) {
				return element;
			}
		}

		return null;
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	getFirstVisible() {
		const elements = this.panel.querySelectorAll(FOCUSABLE_SELECTOR);

		for (const element of elements) {
			if (element instanceof HTMLElement && this.isVisibleCandidate(element)) {
				return element;
			}
		}

		return null;
	}

	/**
	 * @param {HTMLElement|null} element
	 * @returns {boolean}
	 */
	isTextEntry(element) {
		if (!element) {
			return false;
		}

		if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
			return true;
		}

		if (element instanceof HTMLInputElement) {
			const type = (element.type || 'text').toLowerCase();
			return !NON_TEXT_INPUT_TYPES.has(type);
		}

		return element.getAttribute('contenteditable') === 'true';
	}

	/**
	 * @returns {void}
	 */
	focusPanelFallback() {
		if (!this.panel.hasAttribute('tabindex')) {
			this.panel.setAttribute('tabindex', '-1');
		}

		this.focusElement(this.panel);
	}

	/**
	 * @returns {void}
	 */
	focusFirst() {
		const firstFocusable = this.getFirstVisible();

		if (firstFocusable) {
			this.focusElement(firstFocusable);
			return;
		}

		this.focusPanelFallback();
	}

	/**
	 * @param {{ textEntryOnly?: boolean }} [options]
	 * @returns {void}
	 */
	request({ textEntryOnly = false } = {}) {
		this.pending = { textEntryOnly };
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.pending = null;
	}

	/**
	 * @returns {void}
	 */
	consume() {
		if (!this.pending) {
			return;
		}

		const { textEntryOnly } = this.pending;
		this.pending = null;

		const firstFocusable = this.getFirstVisible();

		if (textEntryOnly && !this.isTextEntry(firstFocusable)) {
			return;
		}

		if (firstFocusable) {
			this.focusElement(firstFocusable);
			return;
		}

		this.focusPanelFallback();
	}
}

export default GcPopoverFocus;
