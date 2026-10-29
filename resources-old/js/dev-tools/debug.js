/**
 * Optional global injection point for variable data when bundler imports are unavailable.
 *
 * @typedef {Record<string, Record<string, string|number|boolean|null|undefined>>} VariableData
 */

/**
 * Options for the Debug utility.
 *
 * @typedef {object} DebugOptions
 * @property {number} [columns=12] - Number of columns to render in the grid overlay.
 * @property {VariableData|null} [variableData=null] - Pre-injected variable map used by the Variables panel.
 */

import variableData from '../../lib/intellisense/_intellisense-maps.json';

/**
 * Lightweight on-page debugging helpers:
 * - Toggle global outlines
 * - Show a grid overlay
 * - Browse and copy design tokens/variables
 *
 * Usage:
 * ```js
 * const debug = Debug.getInstance({ columns: 12, variableData });
 * debug.init();
 * ```
 */
class Debug {
	/**
	 * Stable localStorage keys used by the widget.
	 *
	 * @readonly
	 * @type {{DEBUG_MODE: string, GRID_VISIBLE: string, VARIABLES_VISIBLE: string}}
	 */
	static KEYS = Object.freeze({
		DEBUG_MODE: 'debugMode',
		GRID_VISIBLE: 'debugGridVisible',
		VARIABLES_VISIBLE: 'debugVariables',
	});

	/** @type {Debug|null} */
	static #instance = null;

	/**
	 * Retrieve or create a singleton instance.
	 *
	 * @param {DebugOptions} [opts]
	 * @returns {Debug}
	 */
	static getInstance(opts) {
		if (!Debug.#instance) {
			Debug.#instance = new Debug(opts);
		}
		return Debug.#instance;
	}

	/**
	 * @param {DebugOptions} [options]
	 * @throws {Error} When constructed outside a browser environment.
	 */
	constructor({ columns = 12, variableData: injectedData = null } = {}) {
		if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
			throw new Error('Debug requires a browser environment.');
		}

		/** @type {HTMLElement} */
		this.body = document.body;

		/** @type {boolean} */
		this.debugMode = this.#getBool(Debug.KEYS.DEBUG_MODE, false);

		/** @type {boolean} */
		this.gridVisible = this.#getBool(Debug.KEYS.GRID_VISIBLE, false);

		/** @type {boolean} */
		this.variablesVisible = this.#getBool(Debug.KEYS.VARIABLES_VISIBLE, false);

		/** @type {VariableData|null} */
		this.variableData = injectedData ?? variableData ?? null;

		/** @type {number} */
		this.columns = Number.isFinite(columns) && columns > 0 ? Math.floor(columns) : 12;

		/** @type {boolean} */
		this.initialized = false;

		/** @type {HTMLDivElement} */
		this.wrapper = /** @type {HTMLDivElement} */ (
			this.#el('div', {
				id: 'debug-wrapper',
				class: 'debug-wrapper',
				role: 'toolbar',
				'aria-label': 'Debug tools',
			})
		);

		/** @type {HTMLButtonElement} */
		this.btnDebug = this.#btn('Debug', 'debug-button', () => this.toggleDebugMode());

		/** @type {HTMLButtonElement} */
		this.btnGrid = this.#btn('Grid', 'grid-button', () => this.toggleGridVisibility());

		/** @type {HTMLButtonElement|null} */
		this.btnVars = this.variableData
			? this.#btn('Variables', 'variables-button', () => this.toggleVariablesVisibility())
			: null;

		this.wrapper.append(this.btnDebug, this.btnGrid);
		if (this.btnVars) this.wrapper.appendChild(this.btnVars);

		this.body.appendChild(this.wrapper);

		/** @type {HTMLDivElement|null} */
		this.gridEl = null;

		/** @type {HTMLDivElement|null} */
		this.varsEl = null;

		this.#injectStyles();
		Debug.#instance = this;
	}

	/**
	 * Initialize listeners and synchronize UI with current state.
	 * Safe to call more than once.
	 *
	 * @returns {void}
	 */
	init() {
		if (this.initialized) {
			this.#syncUIFromState();
			return;
		}

		window.addEventListener('storage', this.#onStorage);
		window.addEventListener('keydown', this.#onKeydown);

		const cookieEl = document.querySelector('.g-cookies');

		if (typeof window.gCookiesInit === 'function' && cookieEl && !cookieEl.gCookies) {
			window.gCookiesInit();
		}

		this.initialized = true;
		this.#syncUIFromState();
	}

	/**
	 * Remove listeners and DOM nodes created by this instance.
	 *
	 * @returns {void}
	 */
	destroy() {
		window.removeEventListener('storage', this.#onStorage);
		window.removeEventListener('keydown', this.#onKeydown);

		this.wrapper.remove();
		this.gridEl?.remove();
		this.varsEl?.remove();

		document.getElementById('debug-styles')?.remove();
		document.documentElement.classList.remove('debug-outlines');

		this.gridEl = null;
		this.varsEl = null;
		this.gridVisible = false;
		this.variablesVisible = false;
		this.debugMode = false;
		this.initialized = false;
		Debug.#instance = null;
	}

	// ---------------------------------------------------------------------------
	// Storage helpers
	// ---------------------------------------------------------------------------

	/**
	 * Safely read a boolean from localStorage.
	 *
	 * @private
	 * @param {string} key
	 * @param {boolean} fallback
	 * @returns {boolean}
	 */
	#getBool(key, fallback) {
		try {
			const value = localStorage.getItem(key);
			return value == null ? fallback : value === 'true';
		} catch {
			return fallback;
		}
	}

	/**
	 * Safely write a boolean to localStorage.
	 *
	 * @private
	 * @param {string} key
	 * @param {boolean} value
	 * @returns {void}
	 */
	#setBool(key, value) {
		try {
			localStorage.setItem(key, String(Boolean(value)));
		} catch {
			// Ignore storage errors
		}
	}

	// ---------------------------------------------------------------------------
	// Event handlers
	// ---------------------------------------------------------------------------

	/**
	 * Sync state across tabs.
	 *
	 * @private
	 * @param {StorageEvent} event
	 * @returns {void}
	 */
	#onStorage = (event) => {
		const { key, newValue } = event;
		if (!key) return;

		const boolValue = newValue === 'true';

		switch (key) {
			case Debug.KEYS.DEBUG_MODE:
				this.debugMode = boolValue;
				this.#updateDebugStyles();
				break;
			case Debug.KEYS.GRID_VISIBLE:
				this.gridVisible = boolValue;
				this.#updateGrid();
				break;
			case Debug.KEYS.VARIABLES_VISIBLE:
				this.variablesVisible = boolValue;
				this.#updateVars();
				break;
		}
	};

	/**
	 * Detect whether keyboard shortcuts should be ignored because focus is inside
	 * an editable control.
	 *
	 * @private
	 * @param {EventTarget|null} target
	 * @returns {boolean}
	 */
	#isEditableTarget(target) {
		const element = target instanceof HTMLElement ? target : target instanceof Node ? target.parentElement : null;

		if (!(element instanceof HTMLElement)) {
			return false;
		}

		return !!element.closest(
			'input, textarea, select, [contenteditable], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]',
		);
	}

	/**
	 * Keyboard shortcuts:
	 * Alt+D = outlines
	 * Alt+G = grid
	 * Alt+V = variables
	 *
	 * @private
	 * @param {KeyboardEvent} event
	 * @returns {void}
	 */
	#onKeydown = (event) => {
		if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) return;
		if (this.#isEditableTarget(event.target)) return;

		const key = event.key.toLowerCase();

		switch (key) {
			case 'd':
				event.preventDefault();
				this.toggleDebugMode();
				break;
			case 'g':
				event.preventDefault();
				this.toggleGridVisibility();
				break;
			case 'v':
				event.preventDefault();
				this.toggleVariablesVisibility();
				break;
		}
	};

	// ---------------------------------------------------------------------------
	// DOM helpers
	// ---------------------------------------------------------------------------

	/**
	 * Create an element with attributes.
	 * Use `class` for className and `text` for textContent.
	 *
	 * @private
	 * @param {keyof globalThis.HTMLElementTagNameMap} tag
	 * @param {Record<string, string|null|undefined>} [attrs]
	 * @returns {HTMLElement}
	 */
	#el(tag, attrs = {}) {
		const el = document.createElement(tag);

		for (const [key, value] of Object.entries(attrs)) {
			if (value == null) continue;
			if (key === 'class') el.className = value;
			else if (key === 'text') el.textContent = value;
			else el.setAttribute(key, value);
		}

		return el;
	}

	/**
	 * Create an accessible button.
	 *
	 * @private
	 * @param {string} label
	 * @param {string} className
	 * @param {() => void} onClick
	 * @returns {HTMLButtonElement}
	 */
	#btn(label, className, onClick) {
		const button = /** @type {HTMLButtonElement} */ (
			this.#el('button', {
				class: `btn ${className}`,
				'aria-label': label,
				'aria-pressed': 'false',
				type: 'button',
			})
		);

		button.textContent = label;
		button.addEventListener('click', onClick);

		return button;
	}

	// ---------------------------------------------------------------------------
	// UI synchronization
	// ---------------------------------------------------------------------------

	/**
	 * Update all UI parts from current state.
	 *
	 * @private
	 * @returns {void}
	 */
	#syncUIFromState() {
		this.#updateDebugStyles();
		this.#updateGrid();
		this.#updateVars();
	}

	/**
	 * Reflect outline state into the DOM.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateDebugStyles() {
		document.documentElement.classList.toggle('debug-outlines', this.debugMode);
		this.btnDebug.classList.toggle('debug-active', this.debugMode);
		this.btnDebug.setAttribute('aria-pressed', String(this.debugMode));
	}

	/**
	 * Ensure the grid overlay exists.
	 *
	 * @private
	 * @returns {void}
	 */
	#ensureGrid() {
		if (this.gridEl) return;

		const grid = /** @type {HTMLDivElement} */ (
			this.#el('div', {
				id: 'debug-grid',
				class: 'section',
				'aria-hidden': 'true',
			})
		);

		grid.style.display = 'none';

		const row = /** @type {HTMLDivElement} */ (this.#el('div', { id: 'debug-grid-row', class: 'row' }));
		row.style.setProperty('--debug-grid-cols', String(this.columns));

		for (let i = 0; i < this.columns; i += 1) {
			row.appendChild(this.#el('div', { class: 'grid-cell' }));
		}

		grid.appendChild(row);
		this.body.appendChild(grid);
		this.gridEl = grid;
	}

	/**
	 * Show/hide the grid overlay to match state.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateGrid() {
		if (this.gridVisible) this.#ensureGrid();

		if (this.gridEl) {
			this.gridEl.style.display = this.gridVisible ? 'grid' : 'none';
			this.gridEl.setAttribute('aria-hidden', String(!this.gridVisible));
		}

		this.btnGrid.classList.toggle('debug-active', this.gridVisible);
		this.btnGrid.setAttribute('aria-pressed', String(this.gridVisible));
	}
	/**
	 * Ensure the Variables panel exists.
	 *
	 * @private
	 * @returns {void}
	 */
	#ensureVars() {
		if (this.varsEl || !this.variableData) return;

		const varsRoot = /** @type {HTMLDivElement} */ (
			this.#el('div', { id: 'debug-variables', class: 'variables-list', hidden: '' })
		);

		const excludedGroups = new Set(['breakpoints', 'grid-breakpoints', 'themes']);
		const priorityRules = ['spacing', 'colors', 'theme-light', /^theme-(?!by-background$)/, 'theme-by-background'];
		const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

		/**
		 * @param {string} name
		 * @returns {number}
		 */
		const getPriority = (name) => {
			for (let i = 0; i < priorityRules.length; i += 1) {
				const rule = priorityRules[i];
				if (typeof rule === 'string' && name === rule) return i;
				if (rule instanceof RegExp && rule.test(name)) return i;
			}
			return Number.POSITIVE_INFINITY;
		};

		const entries = Object.entries(this.variableData)
			.filter(([groupName, values]) => {
				if (excludedGroups.has(groupName)) return false;
				return !Object.values(values).every((value) => value == null || value === '');
			})
			.sort(([a], [b]) => {
				const pa = getPriority(a);
				const pb = getPriority(b);

				if (pa !== pb) return pa - pb;
				return collator.compare(a, b);
			});

		for (const [groupName, values] of entries) {
			varsRoot.appendChild(this.#variableSection(groupName, values));
		}

		this.body.appendChild(varsRoot);
		this.varsEl = varsRoot;
	}

	/**
	 * Create a section for a variable group.
	 *
	 * @private
	 * @param {string} key
	 * @param {Record<string, string|number|boolean|null|undefined>} values
	 * @returns {HTMLDetailsElement}
	 */
	#variableSection(key, values) {
		const details = /** @type {HTMLDetailsElement} */ (this.#el('details', { class: 'variable-map' }));

		const summary = this.#el('summary', {
			class: 'variable-map-title',
			text: key,
		});

		const list = /** @type {HTMLUListElement} */ (this.#el('ul', { class: 'variable-map-content' }));

		for (const [subKey, subValue] of Object.entries(values)) {
			list.appendChild(this.#variableItem(key, subKey, String(subValue)));
		}

		details.append(summary, list);
		return details;
	}

	/**
	 * Create a single variable list item with optional swatch and copy button.
	 *
	 * @private
	 * @param {string} key
	 * @param {string} subKey
	 * @param {string} subValue
	 * @returns {HTMLLIElement}
	 */
	#variableItem(key, subKey, subValue) {
		const listItem = /** @type {HTMLLIElement} */ (this.#el('li', { class: 'variable-map-content-item' }));

		if (key === 'button-colors') {
			listItem.appendChild(this.#el('span', { class: 'variable-map-content-key', text: subValue }));
			return listItem;
		}

		const keySpan = this.#el('span', {
			class: 'variable-map-content-key',
			text: subKey,
		});

		const valueSpan = this.#el('span', {
			class: 'variable-map-content-value',
			text: subValue,
		});

		if (this.#shouldRenderColorSwatch(key, subValue)) {
			const swatch = this.#el('span', { class: 'color-swatch', 'aria-hidden': 'true' });
			swatch.style.backgroundColor = subValue;
			valueSpan.appendChild(swatch);
		}

		listItem.append(keySpan, valueSpan);

		if (key !== 'button-colors') {
			const cssVar = this.#buildCssVariableReference(key, subKey);
			listItem.appendChild(this.#copyButton(cssVar, cssVar));
		}

		return listItem;
	}

	/**
	 * Determine whether a value should render a color swatch.
	 *
	 * @private
	 * @param {string} groupKey
	 * @param {string} value
	 * @returns {boolean}
	 */
	#shouldRenderColorSwatch(groupKey, value) {
		if (groupKey.startsWith('theme-')) return true;
		return /^#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(value) || /^rgba?\(/.test(value);
	}

	/**
	 * Build the CSS variable reference used by the copy button.
	 *
	 * @private
	 * @param {string} groupKey
	 * @param {string} subKey
	 * @returns {string}
	 */
	#buildCssVariableReference(groupKey, subKey) {
		const prefixMap = {
			shadow: 'shadow-',
			spacing: 'spacing-',
			radius: 'br-',
			'font-family': 'ff-',
			'font-size': 'fs-',
			'font-weight': 'fw-',
			'line-height': 'lh-',
			'letter-spacing': 'ls-',
			'font-space': 'font-space-',
			'transition-duration': 'duration-',
			'transition-timing': 'timing-',
		};

		const prefix = groupKey.startsWith('theme-') ? '' : (prefixMap[groupKey] ?? `${groupKey}-`);
		return `var(--${prefix}${subKey})`;
	}

	/**
	 * Build a copy-to-clipboard button with fallback.
	 *
	 * @private
	 * @param {string} text
	 * @param {string} label
	 * @returns {HTMLButtonElement}
	 */
	#copyButton(text, label) {
		const button = /** @type {HTMLButtonElement} */ (
			this.#el('button', {
				class: 'variable-copy-button',
				'aria-label': `Copy ${label}`,
				type: 'button',
			})
		);

		button.textContent = label;

		const showCopied = () => {
			const original = button.textContent;
			button.textContent = 'Copied!';
			button.classList.add('copied');

			window.setTimeout(() => {
				button.textContent = original;
				button.classList.remove('copied');
			}, 1200);
		};

		button.addEventListener('click', async () => {
			let copied;

			try {
				if (navigator.clipboard?.writeText) {
					await navigator.clipboard.writeText(text);
					copied = true;
				} else {
					copied = this.#fallbackCopy(text);
				}
			} catch {
				copied = this.#fallbackCopy(text);
			}

			if (copied) showCopied();
		});

		return button;
	}

	/**
	 * Fallback copy using a hidden textarea and `document.execCommand('copy')`.
	 *
	 * @private
	 * @param {string} text
	 * @returns {boolean}
	 */
	#fallbackCopy(text) {
		const textarea = /** @type {HTMLTextAreaElement} */ (
			this.#el('textarea', {
				readonly: '',
				style: 'position:absolute;left:-9999px;top:0',
			})
		);

		textarea.value = text;
		document.body.appendChild(textarea);
		textarea.select();

		try {
			return document.execCommand('copy');
		} catch {
			return false;
		} finally {
			textarea.remove();
		}
	}

	/**
	 * Show/hide the Variables panel to match state.
	 *
	 * @private
	 * @returns {void}
	 */
	#updateVars() {
		if (!this.variableData) return;

		if (this.variablesVisible) this.#ensureVars();
		if (this.varsEl) this.varsEl.hidden = !this.variablesVisible;

		this.btnVars?.classList.toggle('debug-active', this.variablesVisible);
		this.btnVars?.setAttribute('aria-pressed', String(this.variablesVisible));
	}

	// ---------------------------------------------------------------------------
	// Public toggles
	// ---------------------------------------------------------------------------

	/**
	 * Toggle global debug outlines and persist state.
	 *
	 * @returns {void}
	 */
	toggleDebugMode() {
		this.debugMode = !this.debugMode;
		this.#setBool(Debug.KEYS.DEBUG_MODE, this.debugMode);
		this.#updateDebugStyles();
	}

	/**
	 * Toggle the grid overlay and persist state.
	 *
	 * @returns {void}
	 */
	toggleGridVisibility() {
		this.gridVisible = !this.gridVisible;
		this.#setBool(Debug.KEYS.GRID_VISIBLE, this.gridVisible);
		this.#updateGrid();
	}

	/**
	 * Toggle the Variables panel and persist state.
	 * No-op if no variable data is available.
	 *
	 * @returns {void}
	 */
	toggleVariablesVisibility() {
		if (!this.variableData) return;

		this.variablesVisible = !this.variablesVisible;
		this.#setBool(Debug.KEYS.VARIABLES_VISIBLE, this.variablesVisible);
		this.#updateVars();
	}

	// ---------------------------------------------------------------------------
	// Styles
	// ---------------------------------------------------------------------------

	/**
	 * Inject stylesheet needed by the widget.
	 *
	 * @private
	 * @returns {void}
	 */
	#injectStyles() {
		if (document.getElementById('debug-styles')) return;

		const style = /** @type {HTMLStyleElement} */ (this.#el('style', { id: 'debug-styles' }));
		style.textContent = `
			:root { --debug-btn-gap: .25rem; }

			#debug-wrapper {
				font-family: system-ui, sans-serif;
				position: fixed;
				bottom: 0;
				z-index: 999999;
				display: flex;
				gap: var(--debug-btn-gap);
				padding: .25rem;
				font-size: 1rem;
			}

			#debug-wrapper .btn {
				padding: var(--btn-py, .25rem) var(--btn-px, .5rem);
				font-size: var(--btn-fs, .75rem);
				border-radius: var(--btn-br, .25rem);
				border: var(--btn-bw, 1px) solid var(--btn-bc, currentColor);
				background: var(--btn-bg, rgb(0 0 0 / .5));
				color: var(--btn-fg, #fff);
				cursor: pointer;
			}

			#debug-wrapper .btn:hover {
				background: var(--btn-bg-hover, rgb(0 0 0 / .65));
			}

			#debug-wrapper .debug-active {
				--btn-bg: rgb(0 0 0 / .8);
			}

			html.debug-outlines :not(#debug-wrapper, #debug-wrapper *, #debug-grid, #debug-grid *, #debug-variables, #debug-variables *) {
				outline: 1px solid coral !important;
			}

			#debug-grid {
				position: fixed;
				inset: 0;
				z-index: 999999;
				display: grid;
				padding: 0;
				pointer-events: none;
				contain: paint;
			}

			#debug-grid-row {
				display: grid;
				padding: 0;
				grid-template-columns: repeat(var(--debug-grid-cols, 12), minmax(0, 1fr));
			}

			.grid-cell {
				background-color: rgb(255 0 0 / .1);
			}

			#debug-variables {
				position: fixed;
				top: 0;
				right: 0;
				bottom: 0;
				width: min(90%, 400px);
				padding: 1rem 0;
				overflow: auto;
				font-size: .75rem;
				z-index: 999998;
				contain: paint;
				overscroll-behavior-y: contain;
				background-color: rgb(0 0 0 / .8);
				color: #fff;
				backdrop-filter: blur(20px);
				-ms-overflow-style: none;
				scrollbar-width: none;
			}

			#debug-variables::-webkit-scrollbar {
				display: none;
			}

			#debug-variables .variable-map {
				margin-bottom: 2em;
			}

			#debug-variables .variable-map-title {
				display: flex;
				align-items: center;
				justify-content: space-between;
				list-style: none;
				cursor: pointer;
				font-weight: 700;
				font-size: 1rem;
				line-height: 1.5;
				padding: .5rem 1rem;
				text-transform: capitalize;
				color: rgb(255 255 255 / .8);
				border-top: 1px solid rgb(255 255 255 / .08);
			}

			#debug-variables .variable-map-title:hover {
				background: rgb(255 255 255 / .04);
			}

			#debug-variables summary {
				list-style: none;
			}

			#debug-variables .variable-map-title::after {
				content: "▶";
				display: inline-block;
				margin-left: .5rem;
				font-size: .75rem;
				line-height: 1;
			}

			#debug-variables .variable-map[open] .variable-map-title::after {
				content: "▼";
			}

			#debug-variables ul {
				list-style: none;
				margin: 0;
				padding: 0;
			}

			#debug-variables li {
				position: relative;
				display: grid;
				grid-template-columns: auto minmax(0, 1fr);
				gap: 1em;
				padding: .25em 1rem;
				font-size: .75rem;
				line-height: 2;
				white-space: nowrap;
				justify-content: space-between;
				border-top: 1px solid rgb(255 255 255 / .04);
				isolation: isolate;
			}

			#debug-variables .variable-map-content-key {
				color: rgb(255 255 255 / .8);
				font-weight: 700;
			}

			#debug-variables .variable-map-content-value {
				color: rgb(255 255 255 / .8);
				white-space: pre-line;
				margin-left: auto;
			}

			#debug-variables .color-swatch {
				display: inline-block;
				width: 1em;
				height: 1em;
				margin-left: .5em;
			}

			#debug-variables .variable-copy-button {
				position: absolute;
				inset: 0;
				z-index: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				border: 0;
				border-radius: 0;
				background: rgb(0 0 0 / .4);
				color: #fff;
				opacity: 0;
				pointer-events: none;
				font-weight: 700;
				font-size: .75rem;
				cursor: pointer;
				transition: opacity .12s ease;
			}

			#debug-variables li:is(:hover, :focus-within) .variable-copy-button,
			#debug-variables .variable-copy-button:focus-visible {
				opacity: 1;
				pointer-events: auto;
			}

			#debug-variables .variable-copy-button:focus-visible {
				outline: 2px solid rgb(255 255 255 / .75);
				outline-offset: -2px;
			}

			@media (prefers-reduced-motion: reduce) {
				#debug-variables .variable-copy-button {
					transition: none;
				}
			}
		`;

		document.head.appendChild(style);
	}
}

// Usage
const debug = Debug.getInstance({ columns: 12, variableData });
debug.init();
