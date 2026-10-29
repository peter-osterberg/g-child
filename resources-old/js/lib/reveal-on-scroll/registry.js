/**
 * Shared ownership registry for reveal instances and controllers.
 */
const revealRegistry = new WeakMap();
const controllerRegistry = new WeakMap();

/**
 * @param {WeakMap<HTMLElement, Map<string, unknown>>} registryMap
 * @param {HTMLElement} container
 * @returns {Map<string, unknown>}
 */
function getOrCreateRuleRegistry(registryMap, container) {
	let registry = registryMap.get(container);

	if (!(registry instanceof Map)) {
		registry = new Map();
		registryMap.set(container, registry);
	}

	return registry;
}

/**
 * @param {WeakMap<HTMLElement, Map<string, unknown>>} registryMap
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @returns {unknown}
 */
function getRegisteredRevealEntry(registryMap, container, ruleKey) {
	const registry = registryMap.get(container);

	if (!(registry instanceof Map)) {
		return undefined;
	}

	return registry.get(ruleKey);
}

/**
 * @param {WeakMap<HTMLElement, Map<string, unknown>>} registryMap
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @param {unknown} value
 * @returns {void}
 */
function registerRevealEntry(registryMap, container, ruleKey, value) {
	getOrCreateRuleRegistry(registryMap, container).set(ruleKey, value);
}

/**
 * @param {WeakMap<HTMLElement, Map<string, unknown>>} registryMap
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @param {unknown} value
 * @returns {void}
 */
function unregisterRevealEntry(registryMap, container, ruleKey, value) {
	const registry = registryMap.get(container);

	if (!(registry instanceof Map) || registry.get(ruleKey) !== value) {
		return;
	}

	registry.delete(ruleKey);

	if (!registry.size) {
		registryMap.delete(container);
	}
}

/**
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @returns {unknown}
 */
export function getRegisteredRevealInstances(container, ruleKey) {
	return getRegisteredRevealEntry(revealRegistry, container, ruleKey);
}

/**
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @param {unknown} instances
 * @returns {void}
 */
export function registerRevealInstances(container, ruleKey, instances) {
	registerRevealEntry(revealRegistry, container, ruleKey, instances);
}

/**
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @param {unknown} instances
 * @returns {void}
 */
export function unregisterRevealInstances(container, ruleKey, instances) {
	unregisterRevealEntry(revealRegistry, container, ruleKey, instances);
}

/**
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @returns {unknown}
 */
export function getRegisteredRevealController(container, ruleKey) {
	return getRegisteredRevealEntry(controllerRegistry, container, ruleKey);
}

/**
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @param {unknown} controller
 * @returns {void}
 */
export function registerRevealController(container, ruleKey, controller) {
	registerRevealEntry(controllerRegistry, container, ruleKey, controller);
}

/**
 * @param {HTMLElement} container
 * @param {string} ruleKey
 * @param {unknown} controller
 * @returns {void}
 */
export function unregisterRevealController(container, ruleKey, controller) {
	unregisterRevealEntry(controllerRegistry, container, ruleKey, controller);
}
