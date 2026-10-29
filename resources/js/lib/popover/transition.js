import GcPopoverRegistry from './registry.js';
import { createPopoverFloating, destroyPopoverFloating } from './floating.js';
import { addPopoverOpenListeners, removePopoverOpenListeners } from './listeners.js';

/**
 * @param {object} popover
 * @param {{ focusFirst?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function openPopover(popover, { focusFirst = false } = {}) {
	if (popover.isOpen && !popover.isAnimating) {
		return;
	}

	const wasAnimating = popover.isAnimating;

	if (popover.options.closeSiblings) {
		GcPopoverRegistry.closeOthers(popover);
	}

	popover.hoverController?.clearTimers?.();
	popover.motion.stop();

	const token = ++popover.transitionToken;
	popover.isAnimating = true;
	popover.isOpen = true;
	GcPopoverRegistry.markOpen(popover);

	popover.emitHook('onOpenStart', { focusFirst });
	popover.motion.prepare('open', popover.panel, { fromCurrent: wasAnimating });
	popover.dom.setOpen();
	popover.dom.disablePointerEvents();

	const firstVisible = focusFirst ? popover.focus.getFirstVisible() : null;
	const usedSynchronousTextEntryFocus =
		popover.options.syncTextEntryFocusOnOpen !== false && popover.focus.isTextEntry(firstVisible);

	if (usedSynchronousTextEntryFocus) {
		popover.focus.focusElement(firstVisible);
	}

	createPopoverFloating(popover);
	await popover.floatingInstance?.update();

	popover.motion.run('open', popover.panel, { fromCurrent: wasAnimating });
	await popover.motion.wait();

	if (token !== popover.transitionToken) {
		return;
	}

	popover.dom.enablePointerEvents();
	popover.motion.clear();
	popover.isAnimating = false;
	addPopoverOpenListeners(popover);

	if (focusFirst) {
		if (!usedSynchronousTextEntryFocus) {
			popover.focus.focusFirst();
		}
	} else {
		popover.focus.consume();
	}

	popover.emitHook('onOpenEnd', { focusFirst });
}

/**
 * @param {object} popover
 * @param {{ focusTrigger?: boolean, immediate?: boolean }} [options]
 * @returns {Promise<void>}
 */
export async function closePopover(popover, { focusTrigger = false, immediate = false } = {}) {
	if (!popover.isActive()) {
		return;
	}

	popover.focus.clear();
	popover.hoverController?.clearTimers?.();
	popover.motion.stop();

	const token = ++popover.transitionToken;
	popover.isAnimating = !immediate;
	popover.isOpen = false;
	GcPopoverRegistry.markClosed(popover);

	popover.emitHook('onCloseStart', { focusTrigger, immediate });
	popover.dom.beginClose();

	if (immediate) {
		finalizePopoverClose(popover, { focusTrigger, immediate });
		return;
	}

	popover.motion.run('close', popover.panel, { fromCurrent: true });
	await popover.motion.wait();

	if (token !== popover.transitionToken) {
		return;
	}

	finalizePopoverClose(popover, { focusTrigger, immediate });
}

/**
 * @param {object} popover
 * @param {{ focusTrigger?: boolean, immediate?: boolean }} [options]
 * @returns {void}
 */
export function finalizePopoverClose(popover, { focusTrigger = false, immediate = false } = {}) {
	popover.dom.finishClose();
	popover.motion.cleanup(popover.panel);
	popover.dom.resetInlineStyles();
	destroyPopoverFloating(popover);
	removePopoverOpenListeners(popover);
	popover.isAnimating = false;

	if (focusTrigger) {
		popover.focus.focusElement(popover.trigger);
	}

	popover.emitHook('onCloseEnd', { focusTrigger, immediate });
}
