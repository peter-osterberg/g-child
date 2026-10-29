import GcPopoverRegistry from './registry.js';
import GC_POPOVER_HOVER_DEFAULTS from './hover-options.js';
import { mergeObject } from '../object-utils.js';

/** @typedef {import('./instance.js').default} GcPopover */

/**
 * Hover controller for a G-child popover.
 */
class GcPopoverHoverController {
	/**
	 * @param {GcPopover} popover
	 * @param {Partial<object>} [options]
	 */
	constructor(popover, options = {}) {
		this.popover = popover ?? null;
		this.options = mergeObject(GC_POPOVER_HOVER_DEFAULTS, options);

		this.openTimeout = null;
		this.closeTimeout = null;

		this.mediaQueryList =
			typeof window !== 'undefined' &&
			typeof window.matchMedia === 'function' &&
			typeof this.options.hoverMediaQuery === 'string'
				? window.matchMedia(this.options.hoverMediaQuery)
				: null;

		this.boundHoverTarget = null;
		this.isBound = false;
		this.hoverListenersBound = false;

		this.handleHoverTargetPointerEnter = this.handleHoverTargetPointerEnter.bind(this);
		this.handleHoverTargetPointerLeave = this.handleHoverTargetPointerLeave.bind(this);
		this.handlePanelPointerEnter = this.handlePanelPointerEnter.bind(this);
		this.handlePanelPointerLeave = this.handlePanelPointerLeave.bind(this);
		this.handleMediaQueryChange = this.handleMediaQueryChange.bind(this);
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	get trigger() {
		return this.popover?.trigger instanceof HTMLElement ? this.popover.trigger : null;
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	get panel() {
		return this.popover?.panel instanceof HTMLElement ? this.popover.panel : null;
	}

	/**
	 * @returns {HTMLElement|null}
	 */
	get hoverTarget() {
		if (this.options.hoverTarget instanceof HTMLElement) {
			return this.options.hoverTarget;
		}

		if (this.popover?.hoverTarget instanceof HTMLElement) {
			return this.popover.hoverTarget;
		}

		return this.trigger;
	}

	/**
	 * @returns {boolean}
	 */
	get enabled() {
		return this.mediaQueryList ? this.mediaQueryList.matches : true;
	}

	/**
	 * @returns {boolean}
	 */
	get isUsable() {
		return !!(
			this.popover &&
			typeof this.popover.open === 'function' &&
			typeof this.popover.close === 'function' &&
			this.hoverTarget instanceof HTMLElement &&
			this.panel instanceof HTMLElement
		);
	}

	/**
	 * @returns {void}
	 */
	bind() {
		if (this.isBound) {
			return;
		}

		this.addMediaQueryListener();
		this.syncHoverListeners();
		this.isBound = true;
	}

	/**
	 * @returns {void}
	 */
	unbind() {
		if (!this.isBound) {
			this.removeHoverListeners();
			this.clearTimers();
			return;
		}

		this.removeMediaQueryListener();
		this.removeHoverListeners();
		this.clearTimers();
		this.isBound = false;
	}

	/**
	 * @returns {void}
	 */
	clearTimers() {
		if (this.openTimeout !== null) {
			window.clearTimeout(this.openTimeout);
			this.openTimeout = null;
		}

		if (this.closeTimeout !== null) {
			window.clearTimeout(this.closeTimeout);
			this.closeTimeout = null;
		}
	}

	/**
	 * @returns {void}
	 */
	scheduleOpen() {
		this.clearTimers();

		if (!this.isUsable) {
			return;
		}

		this.openTimeout = window.setTimeout(() => {
			this.openTimeout = null;

			if (!this.enabled || !this.isUsable) {
				return;
			}

			void this.popover.open();
		}, this.options.openDelay);
	}

	/**
	 * @returns {void}
	 */
	scheduleClose() {
		this.clearTimers();

		if (!this.isUsable) {
			return;
		}

		this.closeTimeout = window.setTimeout(() => {
			this.closeTimeout = null;

			if (!this.enabled || !this.isUsable) {
				return;
			}

			void this.popover.close();
		}, this.options.closeDelay);
	}

	/**
	 * @returns {void}
	 */
	syncHoverListeners() {
		if (!this.isUsable || !this.enabled) {
			this.removeHoverListeners();
			this.clearTimers();
			return;
		}

		const currentHoverTarget = this.hoverTarget;

		if (
			this.hoverListenersBound &&
			this.boundHoverTarget &&
			currentHoverTarget &&
			this.boundHoverTarget !== currentHoverTarget
		) {
			this.removeHoverListeners();
		}

		this.addHoverListeners();
	}

	/**
	 * @returns {void}
	 */
	addHoverListeners() {
		if (this.hoverListenersBound) {
			return;
		}

		const hoverTarget = this.hoverTarget;
		const panel = this.panel;

		if (!(hoverTarget instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
			this.boundHoverTarget = null;
			this.hoverListenersBound = false;
			return;
		}

		this.boundHoverTarget = hoverTarget;
		hoverTarget.addEventListener('pointerenter', this.handleHoverTargetPointerEnter);
		hoverTarget.addEventListener('pointerleave', this.handleHoverTargetPointerLeave);
		panel.addEventListener('pointerenter', this.handlePanelPointerEnter);
		panel.addEventListener('pointerleave', this.handlePanelPointerLeave);

		this.hoverListenersBound = true;
	}

	/**
	 * @returns {void}
	 */
	removeHoverListeners() {
		const hoverTarget = this.boundHoverTarget;
		const panel = this.panel;

		if (hoverTarget instanceof HTMLElement) {
			hoverTarget.removeEventListener('pointerenter', this.handleHoverTargetPointerEnter);
			hoverTarget.removeEventListener('pointerleave', this.handleHoverTargetPointerLeave);
		}

		if (panel instanceof HTMLElement) {
			panel.removeEventListener('pointerenter', this.handlePanelPointerEnter);
			panel.removeEventListener('pointerleave', this.handlePanelPointerLeave);
		}

		this.boundHoverTarget = null;
		this.hoverListenersBound = false;
	}

	/**
	 * @returns {void}
	 */
	addMediaQueryListener() {
		if (!this.mediaQueryList) {
			return;
		}

		if (typeof this.mediaQueryList.addEventListener === 'function') {
			this.mediaQueryList.addEventListener('change', this.handleMediaQueryChange);
			return;
		}

		if (typeof this.mediaQueryList.addListener === 'function') {
			this.mediaQueryList.addListener(this.handleMediaQueryChange);
		}
	}

	/**
	 * @returns {void}
	 */
	removeMediaQueryListener() {
		if (!this.mediaQueryList) {
			return;
		}

		if (typeof this.mediaQueryList.removeEventListener === 'function') {
			this.mediaQueryList.removeEventListener('change', this.handleMediaQueryChange);
			return;
		}

		if (typeof this.mediaQueryList.removeListener === 'function') {
			this.mediaQueryList.removeListener(this.handleMediaQueryChange);
		}
	}

	/**
	 * @returns {void}
	 */
	handleMediaQueryChange() {
		if (!this.isBound) {
			return;
		}

		this.syncHoverListeners();
	}

	/**
	 * @returns {void}
	 */
	handleHoverTargetPointerEnter() {
		this.scheduleOpen();
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handleHoverTargetPointerLeave(event) {
		const next = event.relatedTarget;
		const panel = this.panel;

		if (next instanceof Node && panel instanceof HTMLElement && panel.contains(next)) {
			return;
		}

		this.scheduleClose();
	}

	/**
	 * @returns {void}
	 */
	handlePanelPointerEnter() {
		this.clearTimers();
	}

	/**
	 * @param {PointerEvent} event
	 * @returns {void}
	 */
	handlePanelPointerLeave(event) {
		const next = event.relatedTarget;
		const hoverTarget = this.hoverTarget;
		const trigger = this.trigger;

		if (next instanceof Node) {
			if (
				(hoverTarget instanceof HTMLElement && hoverTarget.contains(next)) ||
				(trigger instanceof HTMLElement && trigger.contains(next))
			) {
				return;
			}

			for (const instance of GcPopoverRegistry.getConnectedOpenInstances(this.popover)) {
				const instanceHoverTarget =
					instance.hoverTarget instanceof HTMLElement ? instance.hoverTarget : instance.trigger;

				if (
					(instanceHoverTarget instanceof HTMLElement &&
						instanceHoverTarget.contains(next)) ||
					(instance.trigger instanceof HTMLElement && instance.trigger.contains(next)) ||
					(instance.panel instanceof HTMLElement && instance.panel.contains(next))
				) {
					return;
				}
			}
		}

		this.scheduleClose();
	}
}

export default GcPopoverHoverController;
