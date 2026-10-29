/**
 * Ensure the WordPress a11y API shape exists for scripts that expect it.
 *
 * @returns {void}
 */
export default function initWpA11y() {
	const wpGlobal = window.wp || (window.wp = {});
	const a11y = wpGlobal.a11y || {};

	if (typeof a11y.speak !== 'function') {
		a11y.speak = () => {};
	}

	wpGlobal.a11y = a11y;
}
