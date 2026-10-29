<?php

namespace GTheme_Child;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Shortcodes
 */
class Shortcodes {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		add_shortcode( 'search_count_results', [ $this, 'search_count_results' ] );
	}

	/**
	 * Shortcode for search-count
	 *
	 * @return void
	 */
	public function search_count_results() {
		ob_start();
		global $wp_query;
		$count_results = $wp_query->found_posts;
		$search_text = trim( get_search_query() ); ?>
		<p class="search-count">
			<?php esc_html_e( 'Found', 'g-theme-child' ); ?>
			<strong><?php echo esc_attr( $count_results ); ?></strong>
			<?php echo esc_html( _n( 'result for', 'results for', $count_results, 'g-theme-child' ) ); ?>
			<strong>"<?php echo esc_attr( $search_text ); ?>"</strong>
		</p>
		<?php
		return ob_get_clean();
	}

}
