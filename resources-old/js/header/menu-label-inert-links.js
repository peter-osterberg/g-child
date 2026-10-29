/**
 * Turns menu-label anchors into inert labels without changing the surrounding menu markup.
 */
export default class MenuLabelNormalizer {
	/**
	 * @param {HTMLElement|string|Document} root
	 * @param {object} [options]
	 */
	constructor(root = document, options = {}) {
		this.root =
			typeof root === 'string'
				? document.querySelector(root)
				: root instanceof HTMLElement || root instanceof Document
					? root
					: document;

		this.options = {
			itemSelector: 'li.menu-label',
			linkSelector: ':scope > a',
			removeAriaCurrent: true,
			disableFocus: true,
			...options,
		};

		/**
		 * @type {WeakMap<HTMLAnchorElement, {
		 * href: string|null,
		 * target: string|null,
		 * rel: string|null,
		 * download: string|null,
		 * ariaCurrent: string|null,
		 * tabIndex: string|null,
		 * ariaDisabled: string|null,
		 * role: string|null,
		 * handler: (event: MouseEvent) => void
		  }>} */
		this.anchorState = new WeakMap();

		this.isInitialized = false;
	}

	/**
	 * @returns {MenuLabelNormalizer}
	 */
	init() {
		if (this.isInitialized) {
			return this;
		}

		const items = this.root.querySelectorAll(this.options.itemSelector);

		for (const item of items) {
			if (!(item instanceof HTMLElement)) {
				continue;
			}

			const link = item.querySelector(this.options.linkSelector);

			if (!(link instanceof HTMLAnchorElement) || this.anchorState.has(link)) {
				continue;
			}

			this.normalizeLink(link);
		}

		this.isInitialized = true;
		return this;
	}

	/**
	 * @param {HTMLAnchorElement} link
	 * @returns {void}
	 */
	normalizeLink(link) {
		const handler = (event) => {
			event.preventDefault();
			event.stopPropagation();
		};

		this.anchorState.set(link, {
			href: link.getAttribute('href'),
			target: link.getAttribute('target'),
			rel: link.getAttribute('rel'),
			download: link.getAttribute('download'),
			ariaCurrent: link.getAttribute('aria-current'),
			tabIndex: link.getAttribute('tabindex'),
			ariaDisabled: link.getAttribute('aria-disabled'),
			role: link.getAttribute('role'),
			handler,
		});

		link.removeAttribute('href');
		link.removeAttribute('target');
		link.removeAttribute('rel');
		link.removeAttribute('download');

		if (this.options.removeAriaCurrent) {
			link.removeAttribute('aria-current');
		}

		link.setAttribute('aria-disabled', 'true');
		link.removeAttribute('role');

		if (this.options.disableFocus) {
			link.setAttribute('tabindex', '-1');
		}

		link.classList.add('is-menu-label-link');
		link.addEventListener('click', handler);
	}

	/**
	 * @returns {MenuLabelNormalizer}
	 */
	destroy() {
		if (!this.isInitialized) {
			return this;
		}

		const items = this.root.querySelectorAll(this.options.itemSelector);

		for (const item of items) {
			if (!(item instanceof HTMLElement)) {
				continue;
			}

			const link = item.querySelector(this.options.linkSelector);

			if (!(link instanceof HTMLAnchorElement)) {
				continue;
			}

			const state = this.anchorState.get(link);

			if (!state) {
				continue;
			}

			link.removeEventListener('click', state.handler);

			this.restoreAttribute(link, 'href', state.href);
			this.restoreAttribute(link, 'target', state.target);
			this.restoreAttribute(link, 'rel', state.rel);
			this.restoreAttribute(link, 'download', state.download);
			this.restoreAttribute(link, 'aria-current', state.ariaCurrent);
			this.restoreAttribute(link, 'tabindex', state.tabIndex);
			this.restoreAttribute(link, 'aria-disabled', state.ariaDisabled);
			this.restoreAttribute(link, 'role', state.role);

			link.classList.remove('is-menu-label-link');
			this.anchorState.delete(link);
		}

		this.isInitialized = false;
		return this;
	}

	/**
	 * @param {HTMLElement} element
	 * @param {string} name
	 * @param {string|null} value
	 * @returns {void}
	 */
	restoreAttribute(element, name, value) {
		if (value == null) {
			element.removeAttribute(name);
			return;
		}

		element.setAttribute(name, value);
	}
}
