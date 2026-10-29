/**
 * Shared DOM and hook helpers used by the dropdown, popover, and navigation packages.
 */
/** @type {number} */
let dropdownIdCounter = 0;

/**
 * Resolves an HTML element from either an existing element reference or a CSS selector.
 *
 * @param {HTMLElement|string} value
 * @param {string} label
 * @returns {HTMLElement}
 */
export function resolveElement(value, label) {
	if (value instanceof HTMLElement) {
		return value;
	}

	if (typeof value === 'string') {
		const selector = value.trim();

		if (!selector) {
			throw new TypeError(`Invalid ${label} element: selector cannot be empty.`);
		}

		const element = document.querySelector(selector);

		if (element instanceof HTMLElement) {
			return element;
		}

		throw new TypeError(`Invalid ${label} element: no element matches "${selector}".`);
	}

	throw new TypeError(`Invalid ${label} element: expected an HTMLElement or selector string.`);
}

/**
 * Resolves an optional HTML element from an existing element reference or selector.
 *
 * Missing selectors return null instead of throwing.
 *
 * @param {HTMLElement|string|null|undefined} value
 * @returns {HTMLElement|null}
 */
export function resolveOptionalElement(value) {
	if (value instanceof HTMLElement) {
		return value;
	}

	if (typeof value === 'string') {
		const selector = value.trim();

		if (!selector) {
			return null;
		}

		const element = document.querySelector(selector);

		return element instanceof HTMLElement ? element : null;
	}

	return null;
}

/**
 * Generates a unique dropdown ID.
 *
 * @param {string} [prefix]
 * @returns {string}
 */
export function generateDropdownId(prefix = 'dropdown') {
	const normalizedPrefix = typeof prefix === 'string' && prefix.trim() ? prefix.trim() : 'dropdown';

	dropdownIdCounter += 1;

	return `${normalizedPrefix}-${dropdownIdCounter}`;
}

/**
 * Converts a value to a finite number, or returns the provided fallback.
 *
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function toNumberOr(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Composes multiple optional hooks into a single hook.
 *
 * @param {...((detail: object) => void)} hooks
 * @returns {((detail: object) => void)|null}
 */
export function composeHooks(...hooks) {
	const validHooks = hooks.filter((hook) => typeof hook === 'function');

	if (!validHooks.length) {
		return null;
	}

	return (detail) => {
		for (const hook of validHooks) {
			hook(detail);
		}
	};
}
