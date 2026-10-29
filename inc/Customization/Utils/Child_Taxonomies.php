<?php

namespace GTheme_Child\Customization\Utils;

use GTheme_Child\Traits\Singleton;

/**
 * Class to add taxonomies to the theme
 */
class Child_Taxonomies {
	use Singleton;

	private $taxonomies = null;

	public function init() {
		add_action( 'gt_register_taxonomy', [ $this, 'run' ] );
	}


	public function run() {
		$this->set_taxonomies();
		$this->register_taxonomies();
	}

	// Methods
	protected function set_taxonomies() {
		$this->taxonomies = [
			/* This is where your taxonomy is added */
			/* TAXONOMY */
		];
	}

	protected function register_taxonomies() {
		foreach ( $this->taxonomies as $taxonomy ) {
			$this->new_child_taxonomy( $taxonomy );
		}
	}

	protected function new_child_taxonomy( array $new_taxonomy ) {
		gt_add_taxonomy(
			$new_taxonomy['name'], // Name of the post type in database (ID / Name)
			$new_taxonomy['post_type'], // Slug of the post type which will be prepended in the URL
			$new_taxonomy['slug'], // Slug of the post type which will be prepended in the URL
			$new_taxonomy['singular'], // Singular name
			$new_taxonomy['plural'], // Plural name
			$new_taxonomy['options'], // Options
		);
	}
}
