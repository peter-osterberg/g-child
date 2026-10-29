<?php

namespace GTheme_Child\Modules\Expand;

use GTheme\Page_Builder\Components\Module\Module;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Model for the Expand module
 */
class Expand extends Module {
	/**
	 * Title of module
	 *
	 * @var string
	 */
	public $title = '';

	/**
	 * Real size of the heading
	 *
	 * @var string
	 */
	public $heading_size_real = '';

	/**
	 * Visual size of the heading
	 *
	 * @var string
	 */
	public $heading_size_visual = '';

	/**
	 * @inheritDoc
	 */
	public $content = '';

	/**
	 * How many rows to be visible before expanding
	 *
	 * @var int
	 */
	public $rows_to_show = 3;

	/**
	 * Whether or not to fade rows
	 *
	 * @var boolean
	 */
	public $rows_to_fade = false;

	/**
	 * Text to show when the module is closed
	 *
	 * @var string
	 */
	public $open = 'Expand text';

	/**
	 * Text to show when the module is open
	 *
	 * @var string
	 */
	public $close = 'Minimize text';

	/**
	* @inheritDoc
	*/
	public function get_editable_selectors() {
		return [ 'content' => '*' ];
	}
}
