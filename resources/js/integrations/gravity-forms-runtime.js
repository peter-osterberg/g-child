const activeGravityFormsInstances = new Set();

let hasRegisteredPreSubmissionFilter = false;
let hasRegisteredPostInitListener = false;

/**
 * @param {unknown} data
 * @returns {Promise<unknown>}
 */
async function handlePreSubmission(data) {
	const submittedForm = data?.form instanceof HTMLFormElement ? data.form : null;

	if (submittedForm) {
		activeGravityFormsInstances.forEach((instance) => {
			if (instance?.wrapper?.contains(submittedForm)) {
				instance.setSubmittingState(true);
			}
		});
	}

	return data;
}

/**
 * @param {() => void} initAll
 * @param {string} postInitEvent
 * @returns {void}
 */
export function ensureGravityFormsLifecycleListeners(initAll, postInitEvent) {
	if (hasRegisteredPostInitListener) {
		return;
	}

	document.addEventListener(postInitEvent, () => {
		initAll();
	});
	hasRegisteredPostInitListener = true;
}

/**
 * @param {string} preSubmissionFilter
 * @returns {void}
 */
export function registerGravityFormsSubmissionHook(preSubmissionFilter) {
	if (typeof window.gform?.utils?.addAsyncFilter === 'function' && !hasRegisteredPreSubmissionFilter) {
		window.gform.utils.addAsyncFilter(preSubmissionFilter, handlePreSubmission);
		hasRegisteredPreSubmissionFilter = true;
	}
}

/**
 * @param {object} instance
 * @returns {void}
 */
export function registerActiveGravityFormInstance(instance) {
	activeGravityFormsInstances.add(instance);
}

/**
 * @param {object} instance
 * @returns {void}
 */
export function unregisterActiveGravityFormInstance(instance) {
	activeGravityFormsInstances.delete(instance);
}
