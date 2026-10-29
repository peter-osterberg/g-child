import GcPopoverRegistry from './registry.js';
import GcPopoverDom from './dom.js';
import GcPopoverFocus from './focus.js';
import GcPopoverMotion from './motion.js';
import GC_POPOVER_DEFAULTS from './options.js';
import { createPopoverFloating, destroyPopoverFloating } from './floating.js';
import {
	handlePopoverDocumentClick,
	handlePopoverDocumentKeydown,
	removePopoverOpenListeners,
} from './listeners.js';
import { resolvePanelReference, resolveTriggerPanelReference } from './panel.js';
import { closePopover, finalizePopoverClose, openPopover } from './transition.js';
import { resolveElement } from '../dropdown-utils.js';
import { mergeObject } from '../object-utils.js';

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPopoverOptions(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof HTMLElement) {
		return false;
	}

	const prototype = Object.getPrototypeOf(value);

	return prototype === Object.prototype || prototype === null;
}

/**
 * Resolve the panel for a popover.
 *
 * @param {HTMLElement|string|null|undefined} panel
 * @param {HTMLElement} triggerElement
 * @returns {HTMLElement}
 */
function resolvePopoverPanel(panel, triggerElement) {
	const explicitPanel = resolvePanelReference(panel);

	if (explicitPanel instanceof HTMLElement) {
		return explicitPanel;
	}

	const attributePanel = resolveTriggerPanelReference(triggerElement);

	if (attributePanel instanceof HTMLElement) {
		return attributePanel;
	}

	throw new TypeError('Invalid panel element: expected an HTMLElement, selector, or a trigger with data-gc-toggle.');
}

/**
 * @param {Partial<object>} userOptions
 * @returns {object}
 */
function mergePopoverOptions(userOptions) {
	return {
		...GC_POPOVER_DEFAULTS,
		...userOptions,
		openAnimationParams: mergeObject(GC_POPOVER_DEFAULTS.openAnimationParams, userOptions.openAnimationParams),
		closeAnimationParams: mergeObject(GC_POPOVER_DEFAULTS.closeAnimationParams, userOptions.closeAnimationParams),
	};
}

/**
 * Configurable floating popover with hover support, lifecycle hooks,
 * animation, focus handling, and outside-dismiss logic.
 */
class GcPopover {
	/**
	 * @param {HTMLElement|string} trigger
	 * @param {HTMLElement|string|Partial<object>|null|undefined} [panelOrOptions]
	 * @param {Partial<object>} [options]
	 */
	constructor(trigger, panelOrOptions, options) {
		const usesOptionsOverload = isPopoverOptions(panelOrOptions);
		const userOptions = usesOptionsOverload ? panelOrOptions : isPopoverOptions(options) ? options : {};
		const panel = usesOptionsOverload ? null : panelOrOptions;

		this.options = mergePopoverOptions(userOptions);

		this.trigger = resolveElement(trigger, 'trigger');
		this.panel = resolvePopoverPanel(panel, this.trigger);

		this.hoverTarget = this.options.hoverTarget
			? resolveElement(this.options.hoverTarget, 'hoverTarget')
			: this.trigger;

		this.referenceElement = this.options.referenceElement
			? resolveElement(this.options.referenceElement, 'referenceElement')
			: this.trigger;

		this.ariaController = this.options.ariaControllerElement
			? resolveElement(this.options.ariaControllerElement, 'ariaControllerElement')
			: this.trigger;

		this.outsideClickBoundary = this.options.outsideClickBoundary
			? resolveElement(this.options.outsideClickBoundary, 'outsideClickBoundary')
			: null;

		this.floatingInstance = null;
		this.hoverController = null;

		this.isOpen = false;
		this.isAnimating = false;
		this.transitionToken = 0;
		this.openListenersBound = false;

		this.dom = new GcPopoverDom({
			trigger: this.trigger,
			panel: this.panel,
			ariaController: this.ariaController,
			options: this.options,
		});

		this.focus = new GcPopoverFocus(this.panel);

		this.motion = new GcPopoverMotion({
			openAnimationParams: this.options.openAnimationParams,
			closeAnimationParams: this.options.closeAnimationParams,
		});

		this.handleTriggerClick = this.handleTriggerClick.bind(this);
		this.handleDocumentClick = this.handleDocumentClick.bind(this);
		this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
		this.handleReferenceHiddenChange = this.handleReferenceHiddenChange.bind(this);

		this.setup();
		GcPopoverRegistry.add(this);

		if (this.options.hoverController) {
			this.setHoverController(this.options.hoverController);
		}
	}

	/**
	 * @returns {void}
	 */
	setup() {
		this.dom.init();
		this.trigger.addEventListener('click', this.handleTriggerClick);
	}

	/**
	 * @param {import('./hover-controller.js').default|{bind?: () => void, unbind?: () => void}|null} controller
	 * @returns {void}
	 */
	setHoverController(controller) {
		if (this.hoverController?.unbind) {
			this.hoverController.unbind();
		}

		this.hoverController = controller || null;

		if (this.hoverController?.bind) {
			this.hoverController.bind();
		}
	}

	/**
	 * @param {'onOpenStart'|'onOpenEnd'|'onCloseStart'|'onCloseEnd'} name
	 * @param {object} [detail]
	 * @returns {void}
	 */
	emitHook(name, detail = {}) {
		const hook = this.options[name];

		if (typeof hook !== 'function') {
			return;
		}

		hook({
			popover: this,
			...detail,
		});
	}

	/**
	 * @returns {boolean}
	 */
	isActive() {
		return this.isOpen || this.isAnimating;
	}

	/**
	 * @param {GcPopover} other
	 * @returns {boolean}
	 */
	isConnectedTo(other) {
		return (
			this.panel.contains(other.trigger) ||
			this.panel.contains(other.panel) ||
			other.panel.contains(this.trigger) ||
			other.panel.contains(this.panel)
		);
	}

	/**
	 * @param {Node} target
	 * @returns {boolean}
	 */
	isWithinOutsideClickBoundary(target) {
		if (!(target instanceof Node) || !(this.outsideClickBoundary instanceof HTMLElement)) {
			return false;
		}

		return this.outsideClickBoundary.contains(target);
	}

	/**
	 * @returns {void}
	 */
	createFloating() {
		createPopoverFloating(this);
	}

	/**
	 * @param {boolean} isReferenceHidden
	 * @returns {void}
	 */
	handleReferenceHiddenChange(isReferenceHidden) {
		if (!isReferenceHidden || !this.options.closeOnReferenceHidden || !this.isActive()) {
			return;
		}

		void this.close({ immediate: true });
	}

	/**
	 * @returns {void}
	 */
	destroyFloating() {
		destroyPopoverFloating(this);
	}

	/**
	 * @param {MouseEvent} event
	 * @returns {boolean}
	 */
	handleHoverManagedClick(event) {
		const firstFocusable = this.focus.getFirstCandidate();

		if (!this.hoverController?.enabled || event.detail === 0) {
			return false;
		}

		if (this.focus.isTextEntry(firstFocusable)) {
			this.focus.request({ textEntryOnly: true });

			if (!this.isOpen) {
				void this.open();
			} else if (!this.isAnimating) {
				requestAnimationFrame(() => {
					this.focus.consume();
				});
			}
		}

		return true;
	}

	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	handleTriggerClick(event) {
		if (this.trigger instanceof HTMLAnchorElement && this.options.preventLinkNavigation) {
			event.preventDefault();
		}

		if (this.handleHoverManagedClick(event)) {
			return;
		}

		const firstFocusable = this.focus.getFirstCandidate();
		const shouldFocusFirst =
			event.detail === 0 ||
			(this.options.focusTextEntryOnTriggerClick !== false && this.focus.isTextEntry(firstFocusable));

		if (this.isOpen && this.options.closeOnTriggerClick) {
			void this.close();
			return;
		}

		if (!this.isOpen) {
			void this.open({ focusFirst: shouldFocusFirst });
		}
	}

	/**
	 * @param {MouseEvent} event
	 * @returns {void}
	 */
	handleDocumentClick(event) {
		handlePopoverDocumentClick(this, event);
	}

	/**
	 * @param {KeyboardEvent} event
	 * @returns {void}
	 */
	handleDocumentKeydown(event) {
		handlePopoverDocumentKeydown(this, event);
	}

	/**
	 * @param {{ focusFirst?: boolean }} [options]
	 * @returns {Promise<void>}
	 */
	async open({ focusFirst = false } = {}) {
		await openPopover(this, { focusFirst });
	}

	/**
	 * @param {{ focusTrigger?: boolean, immediate?: boolean }} [options]
	 * @returns {Promise<void>}
	 */
	async close({ focusTrigger = false, immediate = false } = {}) {
		await closePopover(this, { focusTrigger, immediate });
	}

	/**
	 * @param {{ focusTrigger?: boolean, immediate?: boolean }} [options]
	 * @returns {void}
	 */
	finalizeClose({ focusTrigger = false, immediate = false } = {}) {
		finalizePopoverClose(this, { focusTrigger, immediate });
	}

	/**
	 * @returns {void}
	 */
	toggle() {
		if (this.isOpen && this.options.closeOnTriggerClick) {
			void this.close();
			return;
		}

		if (!this.isOpen) {
			void this.open();
		}
	}

	/**
	 * @returns {void}
	 */
	destroy() {
		this.transitionToken += 1;
		this.motion.stop();
		this.trigger.removeEventListener('click', this.handleTriggerClick);
		this.setHoverController(null);
		removePopoverOpenListeners(this);
		this.destroyFloating();
		this.dom.setClosed();
		this.motion.cleanup(this.panel);
		this.dom.resetInlineStyles();
		this.focus.clear();

		this.isOpen = false;
		this.isAnimating = false;

		GcPopoverRegistry.delete(this);
	}
}

export default GcPopover;
