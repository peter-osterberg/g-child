const POLYLANG_IMAGE_SELECTOR = '.lang-item img, .pll-parent-menu-item > a > img';

/**
 * Hide decorative Polylang flag images from assistive technology.
 *
 * @param {Document|HTMLElement} [root]
 * @returns {void}
 */
export default function initPolylangWcag(root = document) {
	const scope = root instanceof HTMLElement || root instanceof Document ? root : document;

	scope.querySelectorAll(POLYLANG_IMAGE_SELECTOR).forEach((image) => {
		if (image instanceof HTMLElement) {
			image.setAttribute('aria-hidden', 'true');
		}
	});
}
