/** @typedef {import('./instance.js').default} GcPopover */

/**
 * Global registry for G-child popover instances.
 */
class GcPopoverRegistry {
	/**
	 * @type {Set<GcPopover>}
	 */
	static instances = new Set();

	/**
	 * Open-order stack for active popovers.
	 *
	 * @type {GcPopover[]}
	 */
	static openStack = [];

	/**
	 * Prevent instantiation of the static registry.
	 */
	constructor() {
		throw new Error('GcPopoverRegistry cannot be instantiated.');
	}

	/**
	 * @param {unknown} instance
	 * @returns {instance is GcPopover}
	 */
	static isValidInstance(instance) {
		return (
			!!instance &&
			typeof instance === 'object' &&
			typeof instance.close === 'function' &&
			typeof instance.destroy === 'function' &&
			typeof instance.isConnectedTo === 'function' &&
			'isOpen' in instance
		);
	}

	/**
	 * @param {GcPopover} instance
	 * @returns {boolean}
	 */
	static isConnectedInstance(instance) {
		return Boolean(
			this.isValidInstance(instance) &&
				instance.trigger instanceof HTMLElement &&
				instance.panel instanceof HTMLElement &&
				instance.trigger.isConnected &&
				instance.panel.isConnected,
		);
	}

	/**
	 * @returns {void}
	 */
	static pruneDisconnected() {
		for (const instance of Array.from(this.instances)) {
			if (this.isConnectedInstance(instance)) {
				continue;
			}

			if (this.isValidInstance(instance) && typeof instance.destroy === 'function') {
				instance.destroy();
				continue;
			}

			this.instances.delete(instance);
		}

		this.openStack = this.openStack.filter((instance) => this.isConnectedInstance(instance));
	}

	/**
	 * @param {GcPopover} instance
	 * @returns {void}
	 */
	static add(instance) {
		if (!this.isValidInstance(instance)) {
			return;
		}

		this.instances.add(instance);
	}

	/**
	 * @param {GcPopover} instance
	 * @returns {void}
	 */
	static delete(instance) {
		if (!this.isValidInstance(instance)) {
			return;
		}

		this.markClosed(instance);
		this.instances.delete(instance);
	}

	/**
	 * @param {GcPopover} instance
	 * @returns {void}
	 */
	static markOpen(instance) {
		if (!this.isValidInstance(instance)) {
			return;
		}

		this.openStack = this.openStack.filter((item) => item !== instance);
		this.openStack.push(instance);
	}

	/**
	 * @param {GcPopover} instance
	 * @returns {void}
	 */
	static markClosed(instance) {
		if (!this.isValidInstance(instance)) {
			return;
		}

		this.openStack = this.openStack.filter((item) => item !== instance);
	}

	/**
	 * @returns {GcPopover|null}
	 */
	static getTopmostOpenInstance() {
		this.pruneDisconnected();

		this.openStack = this.openStack.filter(
			(instance) => this.isValidInstance(instance) && this.instances.has(instance),
		);

		return this.openStack.at(-1) || null;
	}

	/**
	 * @param {HTMLElement|null|undefined} element
	 * @returns {GcPopover|null}
	 */
	static findByElement(element) {
		if (!(element instanceof HTMLElement)) {
			return null;
		}

		this.pruneDisconnected();

		for (const instance of this.instances) {
			if (!this.isValidInstance(instance)) {
				continue;
			}

			if (instance.trigger === element || instance.panel === element) {
				return instance;
			}
		}

		return null;
	}

	/**
	 * @param {GcPopover} current
	 * @returns {GcPopover[]}
	 */
	static getConnectedOpenInstances(current) {
		if (!this.isValidInstance(current)) {
			return [];
		}

		this.pruneDisconnected();

		const result = [];

		for (const instance of this.instances) {
			if (!this.isValidInstance(instance)) {
				continue;
			}

			if (instance === current) {
				continue;
			}

			if (!instance.isOpen) {
				continue;
			}

			if (!instance.isConnectedTo(current)) {
				continue;
			}

			result.push(instance);
		}

		return result;
	}

	/**
	 * @param {GcPopover} current
	 * @returns {void}
	 */
	static closeOthers(current) {
		if (!this.isValidInstance(current)) {
			return;
		}

		this.pruneDisconnected();

		for (const instance of [...this.instances]) {
			if (!this.isValidInstance(instance)) {
				continue;
			}

			if (instance === current) {
				continue;
			}

			if (!instance.isOpen) {
				continue;
			}

			if (instance.isConnectedTo(current)) {
				continue;
			}

			void instance.close();
		}
	}

	/**
	 * @returns {void}
	 */
	static clear() {
		this.instances.clear();
		this.openStack = [];
	}
}

export default GcPopoverRegistry;
