<?php

namespace GTheme_Child\Modules\Dummy;

use GTheme\Page_Builder\Components\Module\Module_Controller;
use GTheme_Child\Utils\Asset_Loader;

use function GTheme_Child\GTheme;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Module class for a dummy module, copy this to create your own
 */
class Dummy_Controller extends Module_Controller {

	/**
	 * @inheritDoc
	 */
	protected $icon = 'umbrella';

	/**
	 * @inheritDoc
	 */
	public function get_title() {
		return esc_html__( 'Dummy module', 'g-theme-child' );
	}

	/**
	 * Get the child theme's Vite asset loader.
	 *
	 * @return Asset_Loader Child asset loader.
	 */
	public function get_asset_loader(): Asset_Loader {
		return GTheme()->asset_loader;
	}
}
