<?php

namespace GTheme_Child\Customization\Utils;

use GTheme_Child\Traits\Singleton;

/**
 * Class to add metaboxes to the theme
 */
class Child_Metaboxes {
	use Singleton;

	private $metaboxes = null;

	// Constructor
	public function init() {
		add_filter( 'gt_metaboxes_filter', [ $this, 'run' ] );
	}

	public function run( array $metaboxes ) {
		$this->set_metaboxes();
		return $this->register_metaboxes( $metaboxes );
	}

	// Methods
	protected function set_metaboxes() {
		$this->metaboxes = [
			/* This is where your metaboxes is added */
			/* METABOX */
		];
	}

	protected function register_metaboxes( array $metaboxes ) {
		return array_merge(
			$metaboxes,
			$this->metaboxes,
		);
	}
}
