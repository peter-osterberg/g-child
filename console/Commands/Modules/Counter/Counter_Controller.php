<?php

namespace GTheme_Child\Modules\Counter;

use GTheme\Page_Builder\Components\Module\Module_Controller;
use GTheme_Child\Utils\Asset_Loader;

use function GTheme_Child\GTheme;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Controller class for a Counter module
 */
class Counter_Controller extends Module_Controller {

	/**
	 * @inheritDoc
	 */
	protected $icon = 'arrow-up-1-9';

	/**
	 * @inheritDoc
	 */
	public function get_title() {
		return esc_html__( 'Counter', 'g-theme-child' );
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
