import {
	ensureGravityFormsLoadingOverlay,
	resolveGravityFormId,
	resolveGravityFormsElements,
	resizeAllGravityFormsTextareas,
	resizeGravityFormsTextarea,
	setGravityFormsSubmittingState,
} from './gravity-forms-dom.js';
import {
	ensureGravityFormsLifecycleListeners,
	registerActiveGravityFormInstance,
	registerGravityFormsSubmissionHook,
	unregisterActiveGravityFormInstance,
} from './gravity-forms-runtime.js';

/**
 * Enhances Gravity Forms markup with autosizing, submitting state, and rerender-safe event wiring.
 */
const GF_THEME_SCRIPTS_LOADED_EVENT = 'gform/theme/scripts_loaded';
const GF_POST_INIT_EVENT = 'gform/post_init';
const GF_POST_RENDER_EVENT = 'gform/post_render';
const GF_PRE_SUBMISSION_FILTER = 'gform/submission/pre_submission';

const SUBMITTING_CLASS = 'submitting';
const WRAPPER_SELECTOR = '.gform_wrapper';
const TEXTAREA_SELECTOR = 'textarea';

const LOADING_OVERLAY_CLASS = 'gform-loading-overlay';
const LOADING_OVERLAY_SPINNER_CLASS = 'gform-loading-overlay-spinner';
const gravityFormsRegistry = new WeakMap();

/**
 * Gravity Forms behavior for one rendered form wrapper.
 */
export default class GravityForms {
	/**
	 * @param {HTMLElement|null} [wrapper]
	 */
	constructor(wrapper = null) {
		this.wrapper = wrapper instanceof HTMLElement ? wrapper : document.querySelector(WRAPPER_SELECTOR);

		if (!this.wrapper) {
			return;
		}

		this.abortController = new AbortController();
		this.formId = null;
		this.isInitialized = false;

		this.elements = {
			form: null,
			textareas: [],
			overlay: null,
		};

		this.handleInput = this.handleInput.bind(this);
		this.handleFormRender = this.handleFormRender.bind(this);
		this.handleScriptsLoaded = this.handleScriptsLoaded.bind(this);

		this.refreshElements();
	}

	/**
	 * Initialize the form UI enhancements for the current wrapper.
	 *
	 * @returns {void}
	 */
	init() {
		if (this.isInitialized || !this.wrapper || !this.elements.form) {
			return;
		}

		this.ensureLoadingOverlay();
		this.addDomListeners();
		this.bindGravityFormsHooks();
		this.resizeAllTextareas();
		registerActiveGravityFormInstance(this);
		this.isInitialized = true;
	}

	/**
	 * Attach DOM event listeners used by the form UI enhancer.
	 *
	 * @returns {void}
	 */
	addDomListeners() {
		const { signal } = this.abortController;

		document.addEventListener(GF_POST_RENDER_EVENT, this.handleFormRender, { signal });
		this.wrapper.addEventListener('input', this.handleInput, { signal });
	}

	/**
	 * Register Gravity Forms integration hooks when the API is available.
	 *
	 * @returns {void}
	 */
	bindGravityFormsHooks() {
		if (typeof window.gform?.utils?.addAsyncFilter === 'function') {
			this.registerGravityFormsHooks();
			return;
		}

		document.addEventListener(GF_THEME_SCRIPTS_LOADED_EVENT, this.handleScriptsLoaded, {
			signal: this.abortController.signal,
			once: true,
		});
	}

	/**
	 * Register hooks once Gravity Forms theme scripts finish loading.
	 *
	 * @returns {void}
	 */
	handleScriptsLoaded() {
		this.registerGravityFormsHooks();
	}

	/**
	 * Register the submission lifecycle hooks used by this integration.
	 *
	 * @returns {void}
	 */
	registerGravityFormsHooks() {
		registerGravityFormsSubmissionHook(GF_PRE_SUBMISSION_FILTER);
	}

	/**
	 * Refresh cached DOM references after the form markup changes.
	 *
	 * @returns {void}
	 */
	refreshElements() {
		this.elements = resolveGravityFormsElements(this.wrapper, {
			textareaSelector: TEXTAREA_SELECTOR,
			overlayClass: LOADING_OVERLAY_CLASS,
		});
		this.formId = resolveGravityFormId(this.wrapper, this.elements.form);
	}

	/**
	 * Create the loading overlay once and cache its element reference.
	 *
	 * @returns {void}
	 */
	ensureLoadingOverlay() {
		this.elements.overlay = ensureGravityFormsLoadingOverlay(this.wrapper, this.elements.overlay, {
			overlayClass: LOADING_OVERLAY_CLASS,
			spinnerClass: LOADING_OVERLAY_SPINNER_CLASS,
		});
	}

	/**
	 * Auto-resize textareas as the user types.
	 *
	 * @param {Event} event
	 * @returns {void}
	 */
	handleInput(event) {
		const textarea = event.target instanceof HTMLTextAreaElement ? event.target : null;

		if (!textarea || !this.wrapper.contains(textarea)) {
			return;
		}

		this.resizeTextarea(textarea);
	}

	/**
	 * Refresh cached elements after Gravity Forms rerenders the markup.
	 *
	 * @param {CustomEvent} event
	 * @returns {void}
	 */
	handleFormRender(event) {
		const renderedFormId = Number(event?.detail?.formId);

		if (this.formId && renderedFormId && renderedFormId !== this.formId) {
			return;
		}

		this.refreshElements();
		this.ensureLoadingOverlay();
		this.setSubmittingState(false);
		this.resizeAllTextareas();
	}

	/**
	 * Toggle loading state classes and accessibility attributes.
	 *
	 * @param {boolean} isSubmitting
	 * @returns {void}
	 */
	setSubmittingState(isSubmitting) {
		setGravityFormsSubmittingState(this.wrapper, this.elements, isSubmitting, SUBMITTING_CLASS);
	}

	/**
	 * Resize every tracked textarea to match its current content height.
	 *
	 * @returns {void}
	 */
	resizeAllTextareas() {
		resizeAllGravityFormsTextareas(this.elements.textareas);
	}

	/**
	 * Resize a textarea to fit its content.
	 *
	 * @param {HTMLTextAreaElement} textarea
	 * @returns {void}
	 */
	resizeTextarea(textarea) {
		if (!(textarea instanceof HTMLTextAreaElement)) {
			return;
		}

		resizeGravityFormsTextarea(textarea);
	}

	/**
	 * Tear down listeners and reset the submitting state.
	 *
	 * @returns {void}
	 */
	destroy() {
		if (!this.wrapper) {
			return;
		}

		this.abortController.abort();
		this.setSubmittingState(false);
		unregisterActiveGravityFormInstance(this);
		gravityFormsRegistry.delete(this.wrapper);
		this.isInitialized = false;
	}
}

/**
 * Initialize Gravity Forms enhancements for all rendered wrappers in a scope.
 *
 * @param {Document|HTMLElement} [root]
 * @returns {GravityForms[]}
 */
export function initGravityForms(root = document) {
	ensureGravityFormsLifecycleListeners(() => {
		initGravityForms();
	}, GF_POST_INIT_EVENT);

	const scope = root instanceof HTMLElement || root instanceof Document ? root : document;

	return Array.from(scope.querySelectorAll(WRAPPER_SELECTOR))
		.filter((wrapper) => wrapper instanceof HTMLElement)
		.map((wrapper) => {
			const existingInstance = gravityFormsRegistry.get(wrapper);

			if (existingInstance instanceof GravityForms) {
				existingInstance.init();
				return existingInstance;
			}

			const instance = new GravityForms(wrapper);
			instance.init();
			gravityFormsRegistry.set(wrapper, instance);
			return instance;
		});
}
