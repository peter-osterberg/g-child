/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {Record<string, unknown>|null|undefined} base
 * @param {Record<string, unknown>|null|undefined} overrides
 * @returns {Record<string, unknown>}
 */
export function mergeObject(base, overrides) {
	return {
		...(isPlainObject(base) ? base : {}),
		...(isPlainObject(overrides) ? overrides : {}),
	};
}
