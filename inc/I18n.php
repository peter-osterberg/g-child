<?php

namespace GTheme_Child;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class I18n
 */
class I18n {
	use Singleton;

	/**
	 * @var string TEXT_DOMAIN Text domain for this child-theme
	 */
	const TEXT_DOMAIN = 'g-theme-child';

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'after_setup_theme', [ $this, 'load_language_files' ] );
	}

	/**
	 * Loads the language-files to be used throughout the theme
	 *
	 * @return  void
	 */
	public function load_language_files() {
		load_child_theme_textdomain( self::TEXT_DOMAIN, get_stylesheet_directory() . '/languages' );
	}

}
