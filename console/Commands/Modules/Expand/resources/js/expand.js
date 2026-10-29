import { throttleRAF } from '@jsLib/throttle-raf';

/**
 * Expand - A class for handling expand/collapse functionality on modules.
 */
class Expand {
	/**
	 * Static setup method to initialize all Expand modules on the page.
	 *
	 * @returns {void}
	 */
	static setup() {
		const elements = document.querySelectorAll('.module-gchild-expand');
		for (const element of elements) {
			const instance = new Expand(element);
			instance.init();
		}
	}

	/**
	 * Creates an instance of Expand.
	 *
	 * @param {HTMLElement} element - The root element of the module.
	 * @returns {void}
	 */
	constructor(element) {
		this.module = element;
		this.toggleButton = this.module.querySelector('.expand-toggle');
		this.contentWrapper = this.module.querySelector('.expand-content');
		this.contentWrapperInner = this.module.querySelector('.expand-content-inner');
		this.firstElement = this.contentWrapperInner?.firstElementChild;

		// Bind event handlers
		this.handleTransitionCloseListener = this.handleTransitionClose.bind(this);
		this.handleTransitionOpenListener = this.handleTransitionOpen.bind(this);
		this.handleResizeListener = throttleRAF(this.handleResize.bind(this));
		this.handleExpand = this.handleExpand.bind(this);
	}

	/**
	 * Initialize the instance by adding event listeners and updating UI.
	 *
	 * @returns {void}
	 */
	init() {
		if (!this.toggleButton || !this.contentWrapper) {
			return;
		}

		this.addEventListeners();
		this.hideButtonIfContentNotTruncated();
	}

	/**
	 * Handle window resize events.
	 *
	 * @returns {void}
	 */
	handleResize() {
		this.updateContentMaxHeight();
		this.hideButtonIfContentNotTruncated();
	}

	/**
	 * Hides the toggle button if the content is not truncated.
	 *
	 * @returns {void}
	 */
	hideButtonIfContentNotTruncated() {
		if (!this.toggleButton) return;
		const isTruncated = this.contentWrapperInner.scrollHeight > this.contentWrapperInner.clientHeight;
		const isExpanded = this.toggleButton.getAttribute('aria-expanded') === 'true';

		if (isExpanded) {
			return;
		}

		if (!isTruncated && !isExpanded) {
			this.toggleButton.classList.add('hide-toggle');
			this.contentWrapper.classList.remove('fade-line');
		} else {
			this.toggleButton.classList.remove('hide-toggle');
			this.contentWrapper.classList.add('fade-line');
		}
	}

	/**
	 * Adds event listeners for user interaction and window resize.
	 *
	 * @returns {void}
	 */
	addEventListeners() {
		this.toggleButton.addEventListener('click', this.handleExpand);
		window.addEventListener('resize', this.handleResizeListener);
	}

	/**
	 * Handles the expand/collapse toggle.
	 *
	 * @returns {void}
	 */
	handleExpand() {
		const isExpanded = this.toggleButton.getAttribute('aria-expanded') === 'true';

		if (!isExpanded) {
			this.contentWrapper.classList.remove('truncate-rows');
			this.updateContentMaxHeight();
			this.toggleButton.setAttribute('aria-expanded', 'true');
			this.contentWrapper.setAttribute('aria-hidden', 'false');
			this.contentWrapper.removeAttribute('inert');
			this.contentWrapper.addEventListener('transitionend', this.handleTransitionOpenListener);
		} else {
			this.updateContentMaxHeight();
			this.toggleButton.setAttribute('aria-expanded', 'false');
			this.contentWrapper.setAttribute('aria-hidden', 'true');
			this.contentWrapper.setAttribute('inert', '');
			this.contentWrapper.classList.add('fade-line');
			this.contentWrapper.addEventListener('transitionend', this.handleTransitionCloseListener);
		}
	}

	/**
	 * Updates the CSS custom property for maximum height based on content.
	 *
	 * @returns {void}
	 */
	updateContentMaxHeight() {
		const contentMaxHeight = this.contentWrapperInner.scrollHeight;
		this.contentWrapper.style.setProperty('--max-height', `${contentMaxHeight}px`);
	}

	/**
	 * Handles cleanup after opening transition ends.
	 *
	 * @returns {void}
	 */
	handleTransitionOpen() {
		this.contentWrapper.classList.remove('fade-line');
		this.contentWrapper.removeEventListener('transitionend', this.handleTransitionOpenListener);
	}

	/**
	 * Handles actions after closing transition ends.
	 *
	 * @returns {void}
	 */
	handleTransitionClose() {
		this.contentWrapper.classList.add('truncate-rows');
		this.contentWrapper.removeEventListener('transitionend', this.handleTransitionCloseListener);
	}
}

// Initialize Expand modules when the DOM is ready.
if (document.readyState === 'interactive' || document.readyState === 'complete') {
	Expand.setup();
} else {
	document.addEventListener('DOMContentLoaded', Expand.setup);
}
