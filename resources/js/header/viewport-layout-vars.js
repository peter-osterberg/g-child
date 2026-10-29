let activeLayoutVarsController = null;

/**
 * Sync viewport-related CSS custom properties on the root element.
 * The optional selector is retained for API compatibility with existing calls.
 *
 * @param {string} [headerSelector]
 * @returns {{ refresh: () => void, destroy: () => void }}
 */
export default function initLayoutCssVars(headerSelector = 'header') {
	if (activeLayoutVarsController?.headerSelector === headerSelector) {
		return activeLayoutVarsController;
	}

	activeLayoutVarsController?.destroy();

	const root = document.documentElement;
	let frameId = null;
	const appliedRootVars = new Map();

	/**
	 * @param {string} name
	 * @param {string} value
	 * @returns {void}
	 */
	function setRootVar(name, value) {
		if (appliedRootVars.get(name) === value) {
			return;
		}

		root.style.setProperty(name, value);
		appliedRootVars.set(name, value);
	}

	/**
	 * @returns {void}
	 */
	function update() {
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

		setRootVar('--scrollbar-width', `${scrollbarWidth}px`);
		setRootVar('--viewport-width', `${window.innerWidth}px`);
		setRootVar('--viewport-height', `${window.innerHeight}px`);
	}

	/**
	 * @returns {void}
	 */
	function scheduleUpdate() {
		if (frameId !== null) {
			return;
		}

		frameId = window.requestAnimationFrame(() => {
			frameId = null;
			update();
		});
	}

	const controller = {
		headerSelector,
		refresh: scheduleUpdate,
		/**
		 * @returns {void}
		 */
		destroy() {
			window.removeEventListener('load', scheduleUpdate);
			window.removeEventListener('resize', scheduleUpdate);
			window.removeEventListener('orientationchange', scheduleUpdate);
			window.visualViewport?.removeEventListener('resize', scheduleUpdate);

			if (frameId !== null) {
				window.cancelAnimationFrame(frameId);
				frameId = null;
			}

			if (activeLayoutVarsController === controller) {
				activeLayoutVarsController = null;
			}
		},
	};

	update();

	window.addEventListener('load', scheduleUpdate);
	window.addEventListener('resize', scheduleUpdate);
	window.addEventListener('orientationchange', scheduleUpdate);
	window.visualViewport?.addEventListener('resize', scheduleUpdate);

	activeLayoutVarsController = controller;
	return controller;
}
