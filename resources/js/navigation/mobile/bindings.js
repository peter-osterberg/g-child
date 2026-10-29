/**
 * @param {object} menu
 * @returns {void}
 */
export function bindMobileMenuToggles(menu) {
	menu.mobileToggles = Array.from(document.querySelectorAll(menu.options.mobileToggleSelector)).filter(
		(element) => element instanceof HTMLElement,
	);

	for (const toggle of menu.mobileToggles) {
		toggle.addEventListener('click', menu.handleMobileToggleClick);
		toggle.setAttribute('aria-controls', menu.mobileMenu.id);
		toggle.setAttribute('aria-haspopup', 'dialog');
	}
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function unbindMobileMenuToggles(menu) {
	for (const toggle of menu.mobileToggles) {
		toggle.removeEventListener('click', menu.handleMobileToggleClick);
	}
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function bindMobileMenuBackButton(menu) {
	if (!(menu.backButton instanceof HTMLButtonElement)) {
		return;
	}

	menu.backButton.setAttribute('type', 'button');
	menu.backButton.addEventListener('click', menu.handleBackButtonClick);
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function unbindMobileMenuBackButton(menu) {
	if (!(menu.backButton instanceof HTMLButtonElement)) {
		return;
	}

	menu.backButton.removeEventListener('click', menu.handleBackButtonClick);
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function bindMobileMenuDialogEvents(menu) {
	menu.mobileMenu.addEventListener('click', menu.handleDialogClick);
	menu.mobileMenu.addEventListener('cancel', menu.handleDialogCancel);
	menu.mobileMenu.addEventListener('close', menu.handleDialogClose);
	menu.mobileMenu.addEventListener('pointerdown', menu.handleDialogPointerDown);
	menu.mobileMenu.addEventListener('pointermove', menu.handleDialogPointerMove);
	menu.mobileMenu.addEventListener('pointerup', menu.handleDialogPointerUp);
	menu.mobileMenu.addEventListener('pointercancel', menu.handleDialogPointerCancel);
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function unbindMobileMenuDialogEvents(menu) {
	menu.mobileMenu.removeEventListener('click', menu.handleDialogClick);
	menu.mobileMenu.removeEventListener('cancel', menu.handleDialogCancel);
	menu.mobileMenu.removeEventListener('close', menu.handleDialogClose);
	menu.mobileMenu.removeEventListener('pointerdown', menu.handleDialogPointerDown);
	menu.mobileMenu.removeEventListener('pointermove', menu.handleDialogPointerMove);
	menu.mobileMenu.removeEventListener('pointerup', menu.handleDialogPointerUp);
	menu.mobileMenu.removeEventListener('pointercancel', menu.handleDialogPointerCancel);
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function syncMobileMenuToggleState(menu) {
	const isOpen = menu.mobileMenu.open;

	for (const toggle of menu.mobileToggles) {
		toggle.setAttribute('aria-expanded', String(isOpen));
		toggle.classList.toggle('is-active', isOpen);
		toggle.toggleAttribute('aria-busy', menu.isTransitioningMenu);
	}

	menu.mobileMenu.classList.toggle('is-open', isOpen);
	menu.mobileMenu.classList.toggle('is-transitioning', menu.isTransitioningMenu);
}

/**
 * @param {object} menu
 * @returns {void}
 */
export function syncMobileMenuBackButtonState(menu) {
	if (!(menu.backButton instanceof HTMLButtonElement)) {
		return;
	}

	const canGoBack = menu.mobileMenu.open && menu.focusScope.hasOpenPanels() && !menu.isTransitioningMenu;
	menu.backButton.disabled = !canGoBack;
	menu.backButton.setAttribute('aria-disabled', String(!canGoBack));
	menu.backButton.classList.toggle('is-disabled', !canGoBack);
}
