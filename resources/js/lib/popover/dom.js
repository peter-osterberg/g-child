import { generateDropdownId } from '../dropdown-utils.js';

/**
 * Handles DOM state for a popover.
 */
class GcPopoverDom {
	/**
	 * @param {object} config
	 * @param {HTMLElement} config.trigger
	 * @param {HTMLElement} config.panel
	 * @param {HTMLElement} config.ariaController
	 * @param {object} config.options
	 */
	constructor({ trigger, panel, ariaController, options }) {
		this.trigger = trigger;
		this.panel = panel;
		this.ariaController = ariaController;
		this.options = options;
	}

	/**
	 * @returns {void}
	 */
	init() {
		if (!this.panel.id) {
			this.panel.id = generateDropdownId();
		}

		if (this.options.useHidden) {
			this.panel.hidden = true;
		}

		this.syncAria(false);
	}

	/**
	 * @param {boolean} open
	 * @returns {void}
	 */
	syncAria(open) {
		this.ariaController.setAttribute('aria-controls', this.panel.id);
		this.ariaController.setAttribute('aria-expanded', String(open));
		this.ariaController.setAttribute('aria-haspopup', 'true');
	}

	/**
	 * @returns {void}
	 */
	setOpen() {
		this.syncAria(true);
		this.panel.classList.add(this.options.openClass);
		this.trigger.classList.add(this.options.activeClass);

		if (this.options.useHidden) {
			this.panel.hidden = false;
		}
	}

	/**
	 * @returns {void}
	 */
	beginClose() {
		this.syncAria(false);
		this.trigger.classList.remove(this.options.activeClass);
		this.disablePointerEvents();
	}

	/**
	 * @returns {void}
	 */
	finishClose() {
		this.panel.classList.remove(this.options.openClass);

		if (this.options.useHidden) {
			this.panel.hidden = true;
		}
	}

	/**
	 * @returns {void}
	 */
	setClosed() {
		this.syncAria(false);
		this.panel.classList.remove(this.options.openClass);
		this.trigger.classList.remove(this.options.activeClass);

		if (this.options.useHidden) {
			this.panel.hidden = true;
		}
	}

	/**
	 * @returns {void}
	 */
	disablePointerEvents() {
		this.panel.style.pointerEvents = 'none';
	}

	/**
	 * @returns {void}
	 */
	enablePointerEvents() {
		this.panel.style.pointerEvents = '';
	}

	/**
	 * @returns {void}
	 */
	resetInlineStyles() {
		this.panel.style.pointerEvents = '';
	}
}

export default GcPopoverDom;
