<?php

namespace GTheme_Child;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Scripts
 */
class Scripts {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_scripts' ], 100 );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_scripts' ], 100 );

		add_filter( 'gt_editor_styles_filter', [ $this, 'append_editor_styles' ] );
	}

	/**
	 * Add editor styles to WYSIWYG
	 *
	 * @param array $stylesheets
	 * @return array
	 */
	public function append_editor_styles( $stylesheets ) {
		foreach ( [ 'resources/scss/editor.scss', 'resources/fonts/fonts.css' ] as $entry ) {
			$url = GTheme()->asset_loader->get_asset_url( $entry );

			if ( $url !== null ) {
				$stylesheets[] = $url;
			}
		}

		return $stylesheets;
	}

	/**
	 * Enqueue scripts for adminpanel
	 *
	 * @return void
	 */
	public function enqueue_admin_scripts() {
		GTheme()->asset_loader->enqueue_style( 'g-theme-child', 'resources/scss/editor-admin.scss' );
		// Adds custom fonts to the admin panel
		GTheme()->asset_loader->enqueue_style( 'fonts', 'resources/fonts/fonts.css' );
	}

	/**
	 * Enqueue scripts and styles in frontend
	 *
	 * @return void
	 */
	public function enqueue_frontend_scripts() {
		GTheme()->asset_loader->enqueue_style( 'g-theme-child', 'resources/scss/app.scss', [ 'g-theme' ] );
		GTheme()->asset_loader->enqueue_script( 'g-theme-child', 'resources/js/app.js' );
		GTheme()->asset_loader->enqueue_style( 'fonts', 'resources/fonts/fonts.css' );
	}
}
