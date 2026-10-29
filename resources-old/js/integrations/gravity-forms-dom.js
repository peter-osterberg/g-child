/**
 * @param {HTMLElement} wrapper
 * @param {{ textareaSelector: string, overlayClass: string }} options
 * @returns {{ form: HTMLFormElement|null, textareas: HTMLTextAreaElement[], overlay: HTMLElement|null }}
 */
export function resolveGravityFormsElements(wrapper, { textareaSelector, overlayClass }) {
	const form = wrapper.querySelector('form');

	return {
		form: form instanceof HTMLFormElement ? form : null,
		textareas: Array.from(wrapper.querySelectorAll(textareaSelector)).filter(
			(textarea) => textarea instanceof HTMLTextAreaElement,
		),
		overlay: wrapper.querySelector(`.${overlayClass}`),
	};
}

/**
 * @param {HTMLElement} wrapper
 * @param {HTMLFormElement|null} form
 * @returns {number|null}
 */
export function resolveGravityFormId(wrapper, form) {
	const rawFormId =
		form?.dataset.formid || form?.id?.match(/^gform_(\d+)$/)?.[1] || wrapper.id?.match(/^gform_wrapper_(\d+)$/)?.[1];
	const formId = Number(rawFormId);

	return Number.isFinite(formId) && formId > 0 ? formId : null;
}

/**
 * @param {HTMLElement} wrapper
 * @param {HTMLElement|null} existingOverlay
 * @param {{ overlayClass: string, spinnerClass: string }} options
 * @returns {HTMLElement}
 */
export function ensureGravityFormsLoadingOverlay(wrapper, existingOverlay, { overlayClass, spinnerClass }) {
	if (existingOverlay instanceof HTMLElement) {
		return existingOverlay;
	}

	const overlay = document.createElement('div');
	const spinner = document.createElement('span');

	overlay.className = overlayClass;
	overlay.setAttribute('aria-hidden', 'true');
	overlay.hidden = true;

	spinner.className = spinnerClass;
	spinner.setAttribute('aria-hidden', 'true');

	overlay.append(spinner);
	wrapper.append(overlay);

	return overlay;
}

/**
 * @param {HTMLElement} wrapper
 * @param {{ form: HTMLFormElement|null, overlay: HTMLElement|null }} elements
 * @param {boolean} isSubmitting
 * @param {string} submittingClass
 * @returns {void}
 */
export function setGravityFormsSubmittingState(wrapper, elements, isSubmitting, submittingClass) {
	[wrapper, elements.form].filter(Boolean).forEach((element) => {
		element.classList.toggle(submittingClass, isSubmitting);
	});

	if (elements.form) {
		elements.form.setAttribute('aria-busy', isSubmitting ? 'true' : 'false');
	}

	if (elements.overlay) {
		elements.overlay.hidden = !isSubmitting;
		elements.overlay.setAttribute('aria-hidden', isSubmitting ? 'false' : 'true');
	}
}

/**
 * @param {HTMLTextAreaElement} textarea
 * @returns {void}
 */
export function resizeGravityFormsTextarea(textarea) {
	const styles = window.getComputedStyle(textarea);
	const borderTop = parseFloat(styles.borderTopWidth) || 0;
	const borderBottom = parseFloat(styles.borderBottomWidth) || 0;
	const isBorderBox = styles.boxSizing === 'border-box';

	textarea.style.overflowY = 'hidden';
	textarea.style.height = `${textarea.scrollHeight + (isBorderBox ? borderTop + borderBottom : 0)}px`;
}

/**
 * @param {HTMLTextAreaElement[]} textareas
 * @returns {void}
 */
export function resizeAllGravityFormsTextareas(textareas) {
	textareas.forEach((textarea) => {
		resizeGravityFormsTextarea(textarea);
	});
}
