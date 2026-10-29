<?php

namespace GTheme_Child\Traits;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

trait Singleton {

	/**
	 * The single instance of the class.
	 *
	 * @var object
	 */
	protected static $instance = null;

	/**
	 * Get class instance.
	 *
	 * @return static Instance.
	 */
	public final static function get_instance() {
		if ( static::$instance === null ) {
			static::$instance = new static();
		}

		return static::$instance;
	}
}
