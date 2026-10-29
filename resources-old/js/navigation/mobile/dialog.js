import { syncMobileMenuBackButtonState, syncMobileMenuToggleState } from './bindings.js';

/**
 * @param {number} [frames]
 * @returns {Promise<void>}
 */
function nextFrame(frames = 2) {
	return new Promise((resolve) => {
		const step = () => {
			frames -= 1;

			if (frames <= 0) {
				resolve();
				return;
			}

			requestAnimationFrame(step);
		};

		requestAnimationFrame(step);
	});
}

/**
 * @param {unknown} animation
 * @returns {Promise<void>}
 */
async function waitForAnimation(animation) {
	if (!animation) {
		return;
	}

	try {
		await animation;
	} catch {
		return;
	}
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function cancelMobileMenuDialogAnimation(menu) {
	menu.dialogMotion?.stop();
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function resetMobileMenuDialogAnimationStyles(menu) {
	menu.dialogMotion?.cleanup();
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function prepareMobileMenuForOpen(menu) {
	menu.dialogMotion?.prepareOpen();
}

/**
 * @param {object} menu
 * @param {'open'|'close'} type
 * @param {{ fromCurrent?: boolean }} [options]
 * @returns {unknown}
 */
export function animateMobileMenuDialog(menu, type, options = {}) {
	return menu.dialogMotion?.run(type, options);
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function closeAllMobileMenuPopovers(menu) {
	menu.menuController?.closeAll?.();

	for (const popover of menu.extraPopovers) {
		if (popover?.isOpen) {
			void popover.close();
		}
	}
}

/**
 * @param {object} menu
 * @returns {Promise<void>}
 */
export async function restoreDraggedMobileMenu(menu) {
	if (!(menu.mobileMenu instanceof HTMLDialogElement) || !menu.mobileMenu.open || menu.isClosingMenu) {
		return;
	}

	const token = ++menu.menuAnimationToken;
	menu.isTransitioningMenu = true;
	syncMobileMenuToggleState(menu);
	syncMobileMenuBackButtonState(menu);

	await waitForAnimation(animateMobileMenuDialog(menu, 'open', { fromCurrent: true }));

	if (token !== menu.menuAnimationToken || !menu.mobileMenu.open) {
		return;
	}

	menu.dialogMotion?.clear();
	menu.isTransitioningMenu = false;
	syncMobileMenuToggleState(menu);
	syncMobileMenuBackButtonState(menu);
}

/**
 * @param {object} menu
 * @returns {Promise<void>}
 */
export async function openMobileMenu(menu) {
	if (!(menu.mobileMenu instanceof HTMLDialogElement) || !menu.focusScope) {
		return;
	}

	if (menu.mobileMenu.open || menu.isClosingMenu || menu.isTransitioningMenu) {
		return;
	}

	const token = ++menu.menuAnimationToken;
	const shouldAutoFocusOnOpen = menu.shouldAutoFocusOnOpen;

	menu.shouldAutoFocusOnOpen = true;
	menu.isTransitioningMenu = true;
	syncMobileMenuToggleState(menu);
	syncMobileMenuBackButtonState(menu);

	prepareMobileMenuForOpen(menu);
	menu.mobileMenu.showModal();
	menu.focusScope.sync();

	await nextFrame(2);

	if (token !== menu.menuAnimationToken || !menu.mobileMenu.open) {
		return;
	}

	await waitForAnimation(animateMobileMenuDialog(menu, 'open'));

	if (token !== menu.menuAnimationToken || !menu.mobileMenu.open) {
		return;
	}

	menu.dialogMotion?.clear();
	menu.isTransitioningMenu = false;
	syncMobileMenuToggleState(menu);
	syncMobileMenuBackButtonState(menu);

	if (shouldAutoFocusOnOpen) {
		requestAnimationFrame(() => menu.focusScope.focusInitial());
	}
}

/**
 * @param {object} menu
 * @returns {Promise<void>}
 */
export async function closeMobileMenu(menu) {
	if (!(menu.mobileMenu instanceof HTMLDialogElement)) {
		return;
	}

	if (!menu.mobileMenu.open || menu.isClosingMenu || menu.isTransitioningMenu) {
		return;
	}

	const token = ++menu.menuAnimationToken;
	menu.isClosingMenu = true;
	menu.isTransitioningMenu = true;
	syncMobileMenuToggleState(menu);
	syncMobileMenuBackButtonState(menu);

	closeAllMobileMenuPopovers(menu);

	await waitForAnimation(animateMobileMenuDialog(menu, 'close'));

	if (token !== menu.menuAnimationToken) {
		return;
	}

	menu.dialogMotion?.clear();

	if (menu.mobileMenu.open) {
		menu.mobileMenu.close();
	}
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function toggleMobileMenu(menu) {
	if (!(menu.mobileMenu instanceof HTMLDialogElement) || menu.isTransitioningMenu) {
		return;
	}

	if (menu.mobileMenu.open) {
		void closeMobileMenu(menu);
		return;
	}

	void openMobileMenu(menu);
}
