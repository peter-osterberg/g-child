/**
 * @typedef {object} MegaMenuInnerWrapperOptions
 * @property {string} [submenuSelector] Selector for mega-menu submenu panels.
 * @property {string} [wrapperClass] Class name applied to the generated inner wrapper.
 * @property {string} [wrapperTag] HTML tag used for the generated inner wrapper.
 */

/**
 * Wrap mega-menu submenu contents in a single inner container.
 */
export default class MegaMenuInnerWrapper {
	/**
	 * @param {Document|Element|string} [root]
	 * @param {MegaMenuInnerWrapperOptions} [options]
	 */
	constructor(root = document, options = {}) {
		this.root = this.resolveRoot(root);
		this.options = {
			submenuSelector: '.mega-menu > .sub-menu',
			wrapperClass: 'mega-menu-inner',
			wrapperTag: 'div',
			...options,
		};
	}

	/**
	 * Ensure each mega-menu panel has one inner wrapper element.
	 *
	 * @returns {MegaMenuInnerWrapper}
	 */
	init() {
		if (!(this.root instanceof Element || this.root instanceof Document)) {
			return this;
		}

		const subMenus = this.root.querySelectorAll(this.options.submenuSelector);

		for (const subMenu of subMenus) {
			if (!(subMenu instanceof HTMLElement)) continue;
			if (this.getWrapper(subMenu)) continue;

			const wrapper = document.createElement(this.options.wrapperTag);
			wrapper.className = this.options.wrapperClass;

			while (subMenu.firstChild) {
				wrapper.appendChild(subMenu.firstChild);
			}

			subMenu.appendChild(wrapper);
		}

		return this;
	}

	/**
	 * Get the existing wrapper element for a submenu when present.
	 *
	 * @param {HTMLElement} subMenu
	 * @returns {HTMLElement|null}
	 */
	getWrapper(subMenu) {
		const firstElement = subMenu.firstElementChild;

		if (firstElement instanceof HTMLElement && firstElement.classList.contains(this.options.wrapperClass)) {
			return firstElement;
		}

		return null;
	}

	/**
	 * Resolve the root element used to search for mega-menu panels.
	 *
	 * @param {Document|Element|string} root
	 * @returns {Document|Element|null}
	 */
	resolveRoot(root) {
		if (typeof root === 'string') {
			return document.querySelector(root);
		}

		if (root instanceof Element || root instanceof Document) {
			return root;
		}

		return null;
	}
}
