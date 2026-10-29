<?php

namespace GTheme_Child\Customization;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Templates
 */
class Templates {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		// Blurb module item elements filter:
		add_filter( 'gt_module_blurb_elements_structure', [ $this, 'restructure_blurb_items' ] );
		// If using a blurb item template, use this filter:
		// add_filter( 'gt_module_blurb_{template-name}_elements_structure', [ $this, 'custom_blurb_items' ], 10, 2 );

		// Listing module item elements filter:
		add_filter( 'gt_module_listing_item_elements_structure', [ $this, 'restructure_listing_items' ] );
		// If using a listing item template, use this filter:
		// add_filter( 'gt_module_listing_item_{template-name}_elements_structure', [ $this, 'listing_item_{template-name}_elements' ], 10, 2 );
	}

	/**
	 * Restructuring of the blurb elements
	 *
	 * @param \GTheme\Page_Builder\Elements\Wrapper $wrapper
	 * @return \GTheme\Page_Builder\Elements\Wrapper
	 */
	public function restructure_blurb_items( $wrapper ) {
		$wrapper->find(
			[
				'heading',
				'subheading',
				'text',
				'read_more',
			]
		)->wrap( 'blurb-content-wrapper' );

		$wrapper->find( ['image','icon','.blurb-content-wrapper'] )->wrap( 'blurb-inner' );

		return $wrapper;
	}


	/**
	 * Restructuring of the listing item elements
	 *
	 * @param \GTheme\Page_Builder\Elements\Wrapper $wrapper
	 * @return \GTheme\Page_Builder\Elements\Wrapper
	 */
	public function restructure_listing_items( $wrapper ) {
		$wrapper->find(
			[
				'terms',
				'date',
				'title',
				'excerpt',
				'author',
				'read_more',
			]
		)->wrap( 'listing-item-text-wrapper' );

		$wrapper->find(
			[
				'terms',
			]
		)->wrap( 'listing-item-meta-wrapper' )->move_to_top();

		return $wrapper;
	}
}
