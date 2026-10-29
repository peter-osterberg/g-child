<?php

namespace GTheme_Child\Modules\Expand;

use GTheme\Page_Builder\Components\Module\Module_Controller;
use GTheme_Child\Utils\Asset_Loader;

use function GTheme_Child\GTheme;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Controller class for a Expand module
 */
class Expand_Controller extends Module_Controller {

	/**
	 * @inheritDoc
	 */
	protected $icon = 'align-left';

	/**
	 * @inheritDoc
	 */
	public function get_title() {
		return esc_html__( 'Expand', 'g-theme-child' );
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
