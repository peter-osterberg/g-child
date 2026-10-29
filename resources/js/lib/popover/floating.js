import { autoUpdate, computePosition, flip, hide, offset, shift } from '@floating-ui/dom';

/**
 * Create a Floating UI instance for a single popover panel.
 *
 * @param {Element} referenceElement
 * @param {HTMLElement} floatingElement
 * @param {object} [options]
 * @param {import('@floating-ui/dom').Placement} [options.placement]
 * @param {import('@floating-ui/dom').Strategy} [options.strategy]
 * @param {number} [options.offset]
 * @param {number} [options.padding]
 * @param {boolean} [options.watchReferenceHidden]
 * @param {(isReferenceHidden: boolean, data: import('@floating-ui/dom').ComputePositionReturn) => void} [options.onReferenceHiddenChange]
 * @returns {{
 *   reference: Element,
 *   floating: HTMLElement,
 *   update: () => Promise<import('@floating-ui/dom').ComputePositionReturn | null>,
 *   destroy: () => void,
 * }}
 */
function createFloatingInstance(referenceElement, floatingElement, options = {}) {
	const {
		placement = 'bottom-start',
		strategy = 'absolute',
		offset: offsetValue = 0,
		padding = 16,
		watchReferenceHidden = false,
		onReferenceHiddenChange = null,
	} = options;

	const middleware = [offset(offsetValue), flip(), shift({ padding })];

	if (watchReferenceHidden) {
		middleware.push(hide({ strategy: 'referenceHidden' }));
	}

	let cleanup = null;
	let destroyed = false;
	let lastReferenceHidden = false;

	const update = async () => {
		if (destroyed || !floatingElement.isConnected || !referenceElement.isConnected) {
			return null;
		}

		const data = await computePosition(referenceElement, floatingElement, {
			placement,
			strategy,
			middleware,
		});

		if (destroyed) {
			return null;
		}

		const { x, y, strategy: computedStrategy } = data;

		Object.assign(floatingElement.style, {
			position: computedStrategy,
			left: `${x}px`,
			top: `${y}px`,
		});

		if (watchReferenceHidden && typeof onReferenceHiddenChange === 'function') {
			const isReferenceHidden = Boolean(data.middlewareData.hide?.referenceHidden);

			if (isReferenceHidden !== lastReferenceHidden) {
				lastReferenceHidden = isReferenceHidden;
				onReferenceHiddenChange(isReferenceHidden, data);
			}
		}

		return data;
	};

	cleanup = autoUpdate(referenceElement, floatingElement, () => {
		void update();
	});

	return {
		reference: referenceElement,
		floating: floatingElement,
		update,
		/**
		 * @returns {void}
		 */
		destroy() {
			if (destroyed) {
				return;
			}

			destroyed = true;
			cleanup?.();
			cleanup = null;

			floatingElement.style.removeProperty('position');
			floatingElement.style.removeProperty('left');
			floatingElement.style.removeProperty('top');
		},
	};
}

/**
 * @param {object} popover
 * @returns {void}
 */
export function createPopoverFloating(popover) {
	destroyPopoverFloating(popover);

	if (popover.options.enablePositioning === false) {
		return;
	}

	popover.floatingInstance = createFloatingInstance(popover.referenceElement, popover.panel, {
		placement: popover.options.placement,
		strategy: popover.options.strategy,
		offset: popover.options.offset,
		padding: popover.options.padding,
		watchReferenceHidden: popover.options.closeOnReferenceHidden,
		onReferenceHiddenChange: popover.handleReferenceHiddenChange,
	});
}

/**
 * @param {object} popover
 * @returns {void}
 */
export function destroyPopoverFloating(popover) {
	popover.floatingInstance?.destroy();
	popover.floatingInstance = null;
}
