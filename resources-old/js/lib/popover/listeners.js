import GcPopoverRegistry from './registry.js';

export const ESCAPE_HANDLED_FLAG = '__gcPopoverEscapeHandled';

/**
 * @param {object} popover
 * @returns {void}
 */
export function addPopoverOpenListeners(popover) {
	if (popover.openListenersBound) {
		return;
	}

	if (popover.options.closeOnOutsideClick) {
		document.addEventListener('click', popover.handleDocumentClick);
	}

	if (popover.options.closeOnEscape) {
		document.addEventListener('keydown', popover.handleDocumentKeydown);
	}

	popover.openListenersBound = true;
}

/**
 * @param {object} popover
 * @returns {void}
 */
export function removePopoverOpenListeners(popover) {
	if (!popover.openListenersBound) {
		return;
	}

	document.removeEventListener('click', popover.handleDocumentClick);
	document.removeEventListener('keydown', popover.handleDocumentKeydown);

	popover.openListenersBound = false;
}

/**
 * @param {object} popover
 * @param {MouseEvent} event
 * @returns {void}
 */
export function handlePopoverDocumentClick(popover, event) {
	const target = event.target;

	if (!(target instanceof Node)) {
		return;
	}

	if (popover.trigger.contains(target) || popover.panel.contains(target)) {
		return;
	}

	if (popover.isWithinOutsideClickBoundary(target)) {
		return;
	}

	void popover.close();
}

/**
 * @param {object} popover
 * @param {KeyboardEvent} event
 * @returns {void}
 */
export function handlePopoverDocumentKeydown(popover, event) {
	if (event.key !== 'Escape') {
		return;
	}

	if (event[ESCAPE_HANDLED_FLAG]) {
		return;
	}

	if (!popover.isActive()) {
		return;
	}

	if (GcPopoverRegistry.getTopmostOpenInstance() !== popover) {
		return;
	}

	event[ESCAPE_HANDLED_FLAG] = true;
	event.preventDefault();
	event.stopPropagation();
	void popover.close({ focusTrigger: true });
}
