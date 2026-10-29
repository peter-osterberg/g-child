/**
 * Initializes the scroll to top button functionality.
 *
 * This function adds click event listeners to all elements with the class 'btn-scroll-to-top'.
 * When a button is clicked, the window will scroll back to the top of the page.
 *
 * @returns {void}
 */
export default function initScrollToTopButton() {
	const buttons = document.querySelectorAll('.btn-scroll-to-top');

	buttons.forEach((button) => {
		if (button instanceof HTMLElement) {
			button.addEventListener('click', () => {
				window.scrollTo({
					top: 0,
				});
			});
		}
	});
}
