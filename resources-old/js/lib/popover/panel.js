/**
 * Resolve a panel from a selector-like string or bare id.
 *
 * Supported forms:
 * - '#panel-id'
 * - 'panel-id'
 * - '.some-selector'
 * - '[data-role="panel"]'
 *
 * @param {unknown} reference
 * @returns {HTMLElement|null}
 */
export function resolvePanelReference(reference) {
	if (reference instanceof HTMLElement) {
		return reference;
	}

	if (typeof reference !== 'string') {
		return null;
	}

	const trimmed = reference.trim();

	if (!trimmed) {
		return null;
	}

	if (trimmed.startsWith('#')) {
		const byHashId = document.getElementById(trimmed.slice(1));

		if (byHashId instanceof HTMLElement) {
			return byHashId;
		}
	}

	const byId = document.getElementById(trimmed);

	if (byId instanceof HTMLElement) {
		return byId;
	}

	try {
		const bySelector = document.querySelector(trimmed);

		return bySelector instanceof HTMLElement ? bySelector : null;
	} catch {
		return null;
	}
}

/**
 * Resolve a panel from the trigger's declarative attributes.
 *
 * @param {HTMLElement} triggerElement
 * @returns {HTMLElement|null}
 */
export function resolveTriggerPanelReference(triggerElement) {
	if (!(triggerElement instanceof HTMLElement)) {
		return null;
	}

	return resolvePanelReference(triggerElement.dataset.gcToggle);
}
