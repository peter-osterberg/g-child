/**
 * Remove all noscript elements inside a scope once JavaScript is running.
 *
 * @param {Document|HTMLElement} [root]
 * @returns {void}
 */
export default function initRemoveNoscript(root = document) {
	const scope = root instanceof HTMLElement || root instanceof Document ? root : document;

	scope.querySelectorAll('noscript').forEach((element) => {
		element.remove();
	});
}
