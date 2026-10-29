import {
	cancelMobileMenuDialogAnimation,
	closeMobileMenu,
	restoreDraggedMobileMenu,
} from './dialog.js';

const SWIPE_LOCK_THRESHOLD_PX = 12;
const SWIPE_CLOSE_DISTANCE_RATIO = 0.35;
const SWIPE_CLOSE_VELOCITY_PX_PER_MS = 0.5;

/**
 * @param {EventTarget|null} target
 * @returns {boolean}
 */
export function isMobileMenuSwipeGestureTargetAllowed(target) {
	if (!(target instanceof Element)) {
		return false;
	}

	return !target.closest('input, textarea, select, [contenteditable="true"]');
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function resetMobileMenuSwipeGesture(menu) {
	if (
		menu.mobileMenu instanceof HTMLDialogElement &&
		menu.swipeGesture.pointerId !== null &&
		menu.mobileMenu.hasPointerCapture?.(menu.swipeGesture.pointerId)
	) {
		try {
			menu.mobileMenu.releasePointerCapture(menu.swipeGesture.pointerId);
		} catch {
			// Ignore stale pointer capture release failures during teardown/cancel.
		}
	}

	menu.swipeGesture.active = false;
	menu.swipeGesture.dragging = false;
	menu.swipeGesture.pointerId = null;
	menu.swipeGesture.startX = 0;
	menu.swipeGesture.startY = 0;
	menu.swipeGesture.lastX = 0;
	menu.swipeGesture.lastTime = 0;
	menu.swipeGesture.deltaX = 0;
	menu.swipeGesture.velocityX = 0;
	menu.swipeGesture.width = 0;
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function prepareMobileMenuDraggedDialogState(menu) {
	cancelMobileMenuDialogAnimation(menu);
	menu.dialogMotion?.clear();
	menu.mobileMenu.style.willChange = 'transform, opacity';
}

/**
 * @param {object} menu
 * @param {number} offsetX
 * @returns {void}
 */
export function applyMobileMenuDraggedDialogState(menu, offsetX) {
	const clamped = Math.max(0, offsetX);
	menu.mobileMenu.style.transform = `translate3d(${clamped}px, 0px, 0px)`;
}

/**
 * @param {object} menu
 * @param {PointerEvent} event
 * @returns {void}
 */
export function handleMobileMenuDialogPointerDown(menu, event) {
	if (
		!(menu.mobileMenu instanceof HTMLDialogElement) ||
		!menu.mobileMenu.open ||
		menu.isTransitioningMenu ||
		menu.isClosingMenu ||
		menu.focusScope.hasOpenPanels() ||
		event.pointerType !== 'touch' ||
		event.isPrimary === false ||
		(typeof event.button === 'number' && event.button !== 0) ||
		!isMobileMenuSwipeGestureTargetAllowed(event.target)
	) {
		return;
	}

	menu.suppressNextDialogClick = false;
	menu.swipeGesture.active = true;
	menu.swipeGesture.dragging = false;
	menu.swipeGesture.pointerId = event.pointerId;
	menu.swipeGesture.startX = event.clientX;
	menu.swipeGesture.startY = event.clientY;
	menu.swipeGesture.lastX = event.clientX;
	menu.swipeGesture.lastTime = event.timeStamp || performance.now();
	menu.swipeGesture.deltaX = 0;
	menu.swipeGesture.velocityX = 0;
	menu.swipeGesture.width = menu.mobileMenu.getBoundingClientRect().width || menu.mobileMenu.offsetWidth || 0;

	try {
		menu.mobileMenu.setPointerCapture(event.pointerId);
	} catch {
		// Pointer capture is optional; continue without it if the browser rejects the request.
	}
}

/**
 * @param {object} menu
 * @param {PointerEvent} event
 * @returns {void}
 */
export function handleMobileMenuDialogPointerMove(menu, event) {
	if (!menu.swipeGesture.active || menu.swipeGesture.pointerId !== event.pointerId) {
		return;
	}

	const deltaX = event.clientX - menu.swipeGesture.startX;
	const deltaY = event.clientY - menu.swipeGesture.startY;
	const absX = Math.abs(deltaX);
	const absY = Math.abs(deltaY);

	if (!menu.swipeGesture.dragging) {
		if (absX < SWIPE_LOCK_THRESHOLD_PX && absY < SWIPE_LOCK_THRESHOLD_PX) {
			return;
		}

		if (deltaX <= 0 || absY > absX) {
			resetMobileMenuSwipeGesture(menu);
			return;
		}

		menu.swipeGesture.dragging = true;
		prepareMobileMenuDraggedDialogState(menu);
	}

	const now = event.timeStamp || performance.now();
	const elapsed = now - menu.swipeGesture.lastTime;
	const movement = event.clientX - menu.swipeGesture.lastX;

	if (elapsed > 0) {
		menu.swipeGesture.velocityX = movement / elapsed;
	}

	menu.swipeGesture.lastX = event.clientX;
	menu.swipeGesture.lastTime = now;
	menu.swipeGesture.deltaX = Math.min(Math.max(deltaX, 0), menu.swipeGesture.width || deltaX);

	event.preventDefault();
	applyMobileMenuDraggedDialogState(menu, menu.swipeGesture.deltaX);
}

/**
 * @param {object} menu
 * @param {PointerEvent} event
 * @returns {void}
 */
export function handleMobileMenuDialogPointerUp(menu, event) {
	if (!menu.swipeGesture.active || menu.swipeGesture.pointerId !== event.pointerId) {
		return;
	}

	const didDrag = menu.swipeGesture.dragging;
	const distance = menu.swipeGesture.deltaX;
	const width = menu.swipeGesture.width || menu.mobileMenu.getBoundingClientRect().width || 1;
	const velocity = menu.swipeGesture.velocityX;
	const shouldClose =
		didDrag &&
		(distance >= width * SWIPE_CLOSE_DISTANCE_RATIO || velocity >= SWIPE_CLOSE_VELOCITY_PX_PER_MS);

	resetMobileMenuSwipeGesture(menu);

	if (!didDrag) {
		return;
	}

	event.preventDefault();
	menu.suppressNextDialogClick = true;

	if (shouldClose) {
		void closeMobileMenu(menu);
		return;
	}

	void restoreDraggedMobileMenu(menu);
}

/**
 * @param {object} menu
 * @param {PointerEvent} event
 * @returns {void}
 */
export function handleMobileMenuDialogPointerCancel(menu, event) {
	if (!menu.swipeGesture.active || menu.swipeGesture.pointerId !== event.pointerId) {
		return;
	}

	const didDrag = menu.swipeGesture.dragging;

	resetMobileMenuSwipeGesture(menu);

	if (!didDrag) {
		return;
	}

	menu.suppressNextDialogClick = true;
	void restoreDraggedMobileMenu(menu);
}
