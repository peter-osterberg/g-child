/**
 * Keeps menu links and split toggles aligned with the popover behavior and ARIA state.
 */
const TRIGGER_MODE_STATE_CLASSES = [
	'is-trigger-hover',
	'is-trigger-click',
	'is-trigger-mode-hover',
	'is-trigger-mode-click',
	'is-trigger-mode-mixed',
	'is-trigger-mode-click-toggle',
];

/**
 * @param {'hover'|'click'|'mixed'|'click-toggle'|null} triggerMode
 * @returns {string[]}
 */
function getTriggerModeStateClasses(triggerMode) {
	if (typeof triggerMode !== 'string' || !triggerMode.trim()) {
		return [];
	}

	const classes = [`is-trigger-mode-${triggerMode}`];

	if (triggerMode === 'hover' || triggerMode === 'mixed') {
		classes.push('is-trigger-hover');
	}

	if (triggerMode === 'click' || triggerMode === 'mixed' || triggerMode === 'click-toggle') {
		classes.push('is-trigger-click');
	}

	return classes;
}

/**
 * @param {object} entry
 * @returns {void}
 */
function bindTriggerModeState(entry) {
	entry.item.classList.remove(...TRIGGER_MODE_STATE_CLASSES);

	const classes = getTriggerModeStateClasses(entry.triggerMode);

	if (!classes.length) {
		return;
	}

	entry.item.classList.add(...classes);
	entry.cleanup.push(() => {
		entry.item.classList.remove(...TRIGGER_MODE_STATE_CLASSES);
	});
}

/**
 * @param {HTMLElement} target
 * @returns {void}
 */
function dispatchSyntheticClick(target) {
	target.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: target.ownerDocument?.defaultView || window,
		}),
	);
}

/**
 * @param {object} entry
 * @returns {void}
 */
function moveFocusFromDecorativeToggle(entry) {
	if (!(entry.toggle instanceof HTMLElement) || document.activeElement !== entry.toggle) {
		return;
	}

	const focusTarget = entry.trigger instanceof HTMLElement ? entry.trigger : entry.link;

	if (!(focusTarget instanceof HTMLElement)) {
		entry.toggle.blur();
		return;
	}

	try {
		focusTarget.focus({ preventScroll: true });
	} catch {
		focusTarget.focus();
	}
}

/**
 * @param {object} entry
 * @returns {void}
 */
export function syncSplitToggleAria(entry) {
	if (!entry.toggle) {
		return;
	}

	entry.toggle.setAttribute('type', 'button');

	if (!entry.popover) {
		moveFocusFromDecorativeToggle(entry);
		entry.toggle.removeAttribute('aria-controls');
		entry.toggle.removeAttribute('aria-expanded');
		entry.toggle.removeAttribute('aria-haspopup');
		entry.toggle.setAttribute('tabindex', '-1');
		entry.toggle.setAttribute('aria-hidden', 'true');

		if (entry.link instanceof HTMLAnchorElement || entry.link instanceof HTMLButtonElement) {
			entry.link.removeAttribute('aria-controls');
			entry.link.removeAttribute('aria-expanded');
			entry.link.removeAttribute('aria-haspopup');
		}

		return;
	}

	if (entry.triggerMode === 'click' && !entry.useSplitToggle) {
		moveFocusFromDecorativeToggle(entry);
		entry.toggle.setAttribute('aria-controls', entry.panel.id);
		entry.toggle.setAttribute('aria-expanded', entry.popover?.isOpen ? 'true' : 'false');
		entry.toggle.setAttribute('aria-haspopup', 'menu');
		entry.toggle.setAttribute('tabindex', '-1');
		entry.toggle.setAttribute('aria-hidden', 'true');
		return;
	}

	entry.toggle.removeAttribute('tabindex');
	entry.toggle.removeAttribute('aria-hidden');
	entry.toggle.setAttribute('aria-controls', entry.panel.id);
	entry.toggle.setAttribute('aria-expanded', entry.popover?.isOpen ? 'true' : 'false');
	entry.toggle.setAttribute('aria-haspopup', 'menu');

	if (entry.link instanceof HTMLAnchorElement) {
		entry.link.removeAttribute('aria-controls');
		entry.link.removeAttribute('aria-expanded');
		entry.link.removeAttribute('aria-haspopup');
	}
}

/**
 * @param {object} entry
 * @param {object} options
 * @returns {void}
 */
function bindLinkClick(entry, options) {
	if (!(entry.link instanceof HTMLAnchorElement) || !entry.usePopover) {
		return;
	}

	const href = entry.link.getAttribute('href')?.trim() || '';
	const isHashOnlyLink = href === '#';
	const shouldPreventHashOnly = options.preventHashOnlyLinkNavigation && isHashOnlyLink;
	const shouldPreventClickNavigation = entry.triggerMode === 'click' && !entry.useSplitToggle;
	const shouldToggleOnHashOnlyClick = entry.triggerMode === 'click-toggle' && isHashOnlyLink;

	if (!shouldPreventHashOnly && !shouldPreventClickNavigation && !shouldToggleOnHashOnlyClick) {
		return;
	}

	const handler = (event) => {
		if (shouldToggleOnHashOnlyClick) {
			event.preventDefault();
			event.stopPropagation();
			dispatchSyntheticClick(entry.trigger);
			return;
		}

		event.preventDefault();
	};

	entry.link.addEventListener('click', handler);
	entry.cleanup.push(() => {
		entry.link.removeEventListener('click', handler);
	});
}

/**
 * @param {object} entry
 * @returns {void}
 */
function bindDecorativeToggle(entry) {
	if (!entry.toggle || entry.triggerMode !== 'click' || entry.useSplitToggle) {
		return;
	}

	const preventFocusHandler = (event) => {
		event.preventDefault();
	};

	const handler = (event) => {
		event.preventDefault();
		event.stopPropagation();
		dispatchSyntheticClick(entry.trigger);
	};

	entry.toggle.addEventListener('pointerdown', preventFocusHandler);
	entry.toggle.addEventListener('click', handler);
	entry.cleanup.push(() => {
		entry.toggle.removeEventListener('pointerdown', preventFocusHandler);
		entry.toggle.removeEventListener('click', handler);
	});
}

/**
 * @param {object} entry
 * @param {object} options
 * @returns {void}
 */
export function bindEntry(entry, options) {
	bindTriggerModeState(entry);
	bindLinkClick(entry, options);
	bindDecorativeToggle(entry);
	syncSplitToggleAria(entry);
}

/**
 * @param {object} entry
 * @returns {void}
 */
export function unbindEntry(entry) {
	for (const cleanup of entry.cleanup || []) {
		cleanup();
	}

	entry.cleanup = [];
}
