/**
 * Throttles a callback so it runs at most once per animation frame.
 *
 * @template {unknown[]} TArgs
 * @param {(...args: TArgs) => void} callback
 * @returns {(...args: TArgs) => void}
 */
export function throttleRAF(callback) {
	let frameId = 0;
	let nextArgs = null;

	return (...args) => {
		nextArgs = args;

		if (frameId) {
			return;
		}

		frameId = window.requestAnimationFrame(() => {
			frameId = 0;
			const pendingArgs = nextArgs;
			nextArgs = null;

			if (pendingArgs) {
				callback(...pendingArgs);
			}
		});
	};
}
