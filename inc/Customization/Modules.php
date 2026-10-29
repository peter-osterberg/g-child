<?php

namespace GTheme_Child\Customization;

use GTheme\Page_Builder\Components\Module\Module_Controller;
use GTheme_Child\Traits\Singleton;
/* CONTROLLERS BELOW */
use GTheme_Child\Modules\Button\Button_Controller;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Modules
 */
class Modules {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		// Custom modules filter
		add_filter( 'gt_modules', [ $this, 'theme_modules' ], 20, 1 );

		add_action( 'gt_module_enqueue_frontend_scripts', [ $this, 'enqueue_module_assets' ] );
		add_action( 'gt_module_enqueue_backend_scripts', [ $this, 'enqueue_module_assets' ] );
	}

	/**
	 * Load child module assets through Vite using the parent's asset hooks.
	 *
	 * @param Module_Controller $module Module requesting its assets.
	 * @return void
	 */
	public function enqueue_module_assets( Module_Controller $module ): void {
		$suffix = '';
		$asset_loader = null;

		if ( current_filter() === 'gt_module_enqueue_backend_scripts' ) {
			$suffix = '-backend';
		}

		foreach ( array_reverse( $module::get_extensions() ) as $extension ) {
			$directory = dirname( $extension->getFileName() );

			if ( ! str_starts_with( $directory, GTHEME_CHILD_DIR . '/inc/Modules/' ) ) {
				continue;
			}

			if ( $asset_loader === null ) {
				$asset_loader = $module->get_asset_loader();
			}

			$name = str_replace( '_', '-', strtolower( basename( $directory ) ) );
			$source = substr( $directory, strlen( GTHEME_CHILD_DIR ) + 1 ) . '/resources/';
			$identifier = $extension->getName()::get_identifier( false );
			$handle = 'module-' . str_replace( '_', '-', $identifier ) . $suffix;

			$asset_loader->enqueue_style( $handle, $source . 'scss/' . $name . $suffix . '.scss', [ 'g-theme-child' ] );
			$asset_loader->enqueue_script( $handle, $source . 'js/' . $name . $suffix . '.js' );
		}
	}

	/**
	 * Registering of modules in child-theme
	 *
	 * @param array $modules
	 *
	 * @return array
	 */
	public function theme_modules( array $modules ) {
		return array_merge(
			$modules,
			[
				/* NEW MODULES BELOW */
				Button_Controller::class,
			]
		);
	}

}
