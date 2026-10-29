<?php

namespace GTheme_Child\Modules\Counter;

use GTheme\Page_Builder\Components\Module\Module;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Model for the Counter module
 */
class Counter extends Module {

	/**
	 * Toggle counter animation
	 *
	 * @var bool
	 */
	public $counter_toggle = true;

	/**
	 * String to be 'counted' from
	 *
	 * @var string
	 */
	public $count_from = '0';

	/**
	 * String to be 'counted' to
	 *
	 * @var string
	 */
	public $count_to = '100';

	/**
	 * String before the counter text
	 *
	 * @var string
	 */
	public $prefix = '';

	/**
	 * String after the counter text
	 *
	 * @var string
	 */
	public $suffix = '';

	/**
	 * Amount of milliseconds the counter should run
	 *
	 * @var string
	 */
	public $duration = 3000;

	/**
	 * Editor field
	 *
	 * @var string
	 */
	public $content = '';

	/**
	 * @inheritDoc
	 */
	public function get_html_attributes() {
		$attributes = parent::get_html_attributes();

		$attributes['data-count'] = $this->counter_toggle ? 'true' : 'false';
		$attributes['data-duration'] = $this->duration;
		$attributes['data-count-from'] = $this->sanitize_count( $this->count_from );
		$attributes['data-count-to'] = $this->sanitize_count( $this->count_to );

		return $attributes;
	}

	/**
	 * Sanitize the counter value
	 *
	 * @param string|float|int $value The counter value to sanitize
	 * @return string Sanitized value with commas replaced by periods
	 */
	private function sanitize_count( $value ) {
		return str_replace( ',', '.', (string) $value );
	}

	/**
	* @inheritDoc
	*/
	public function get_editable_selectors() {
		return [ 'content' => '*' ];
	}
}
