/**
 * Counter - A class for handling count up functionality with ease-out animation.
 */
class Counter {
	/**
	 * Setup method to initialize all counter modules on the page.
	 * Finds all elements with the `.module-gchild-counter` class, creates a new
	 * Counter instance for each, and initializes it.
	 *
	 * @static
	 * @returns {void}
	 */
	static setup() {
		const elements = document.querySelectorAll('.module-gchild-counter');

		elements.forEach((element) => {
			const instance = new Counter(element);
			instance.init();
		});
	}

	/**
	 * Constructor method.
	 *
	 * @param {HTMLElement} element - The container element for the counter.
	 */
	constructor(element) {
		this.module = element;
		this.countEl = this.module.querySelector('.counter-number');

		// Using dataset and converting strings to numbers.
		const { countFrom, countTo, duration, count } = this.module.dataset;
		this.count = count !== 'false';

		// Convert values and fallback to defaults if needed.
		this.countFrom = parseFloat(countFrom) || 0;
		this.countTo = parseFloat(countTo) || 100;
		this.duration = parseInt(duration, 10) || 3000;
	}

	/**
	 * Initializes the counter instance.
	 * If auto-start is enabled (this.count is true), sets up the Intersection Observer.
	 *
	 * @returns {void}
	 */
	init() {
		console.log(this.count);
		if (!this.count) {
			return;
		}
		this.setupObserver();
	}

	/**
	 * Sets up an Intersection Observer to trigger the animation when the element is in view.
	 *
	 * @private
	 * @returns {void}
	 */
	setupObserver() {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						this.countUp(this.countFrom, this.countTo, this.duration, (value) => {
							this.updateInnerHTML(value, this.countTo);
						});
						observer.disconnect();
					}
				});
			},
			{
				rootMargin: '0px 0px -10% 0px',
				threshold: 0.5,
			},
		);

		observer.observe(this.module);
	}

	/**
	 * Animates counting from a starting number to an ending number over a specified duration.
	 *
	 * @param {number} countFrom - The starting value.
	 * @param {number} countTo - The ending value.
	 * @param {number} duration - The duration of the animation in milliseconds.
	 * @param {function(number):void} callback - The callback function to handle the updated value.
	 * @returns {void}
	 */
	countUp(countFrom, countTo, duration, callback) {
		const startTime = performance.now();
		const range = countTo - countFrom;

		/**
		 * Updates the counter value based on the current time.
		 *
		 * @param {number} currentTime - The current time in milliseconds.
		 * @returns {void}
		 */
		const update = (currentTime) => {
			const elapsed = currentTime - startTime;
			// Calculate linear progress (0 to 1)
			let progress = Math.min(elapsed / duration, 1);
			// Apply ease-out quadratic easing
			progress = this.easeOutQuad(progress);
			const currentValue = countFrom + range * progress;

			callback(currentValue);

			if (elapsed < duration) {
				requestAnimationFrame(update);
			} else {
				this.handleAnimationComplete();
			}
		};

		requestAnimationFrame(update);
	}

	/**
	 * Ease-out quadratic function.
	 * For a value t between 0 and 1, returns an eased value.
	 *
	 * @param {number} t - The linear progress value.
	 * @returns {number} The eased progress value.
	 */
	easeOutQuad(t) {
		return t * (2 - t);
	}

	/**
	 * Updates the innerHTML of the target element with the formatted number.
	 *
	 * @param {number} value - The current animation value.
	 * @param {number} target - The target value used to determine the number of decimal places.
	 * @returns {void}
	 */
	updateInnerHTML(value, target) {
		const formattedNumber = Number(value).toFixed(this.getDecimalPlaces(target));
		this.countEl.innerHTML = formattedNumber;
	}

	/**
	 * Called when the animation is complete.
	 * Adds a CSS class to the module to indicate completion.
	 *
	 * @returns {void}
	 */
	handleAnimationComplete() {
		this.module.classList.add('is-finished');
	}

	/**
	 * Calculates the number of decimal places in a number.
	 *
	 * @param {number} num - The input number.
	 * @returns {number} The number of decimal places.
	 */
	getDecimalPlaces(num) {
		const match = ('' + num).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
		if (!match) return 0;

		const decimalPlaces = match[1] ? match[1].length : 0;
		const exponentAdjustment = match[2] ? +match[2] : 0;
		return Math.max(0, decimalPlaces - exponentAdjustment);
	}
}

// Initialize once the document is ready.
if (document.readyState === 'interactive' || document.readyState === 'complete') {
	Counter.setup();
} else {
	document.addEventListener('DOMContentLoaded', Counter.setup);
}
