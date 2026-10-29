<?php

namespace GTheme_Child\Customization;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Admin
 */
class Admin {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		// Use WYSIWYG for posts
		add_filter( 'gt_post_page_builder_mode', '__return_false' );
		add_filter( 'gt_valid_html_tags', [ $this, 'add_valid_html_tags' ] );
	}

	/**
	 * Add valid html tags for the wysiwyg editor
	 *
	 * @param array $tags
	 * @return array
	 */
	public function add_valid_html_tags( $tags ) {
		$tags['dialog'] = 'DIALOG';

		return $tags;
	}
}
