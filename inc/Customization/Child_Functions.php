<?php

namespace GTheme_Child\Customization;

use GTheme_Child\Traits\Singleton;
use GTheme\Page_Builder\Component\Component;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Child_Functions
 */
class Child_Functions {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		// Additional date formats
		add_filter( 'gt_date_format_options', [ $this, 'add_date_formats' ], 10, 1 );

		// Replace clear filter button text
		add_filter( 'gt_module_listing_clear_filter_text', [ $this, 'clear_filter_text' ] );

		// Add menu arrow to menu items with child-elements
		add_filter( 'walker_nav_menu_start_el', [ $this, 'parent_menu_dropdown' ], 10, 4 );

		// Container width for the theme used for image sizes
		add_filter( 'gt_container_width', [ $this, 'container_width' ] );

		// Add css classes based on the background color
		add_filter( 'gt_section_classes', [ $this, 'css_classes_relationship' ], 10, 2 );
		add_filter( 'gt_row_classes', [ $this, 'css_classes_relationship' ], 10, 2 );
		add_filter( 'gt_col_classes', [ $this, 'css_classes_relationship' ], 10, 2 );
		add_filter( 'gt_module_classes', [ $this, 'css_classes_relationship' ], 10, 2 );

		// Add css variables relationship
		add_filter( 'gt_section_styling', [ $this, 'css_variables_relationship' ], 10, 2 );
		add_filter( 'gt_row_styling', [ $this, 'css_variables_relationship' ], 10, 2 );
		add_filter( 'gt_col_styling', [ $this, 'css_variables_relationship' ], 10, 2 );
		add_filter( 'gt_module_styling', [ $this, 'css_variables_relationship' ], 10, 2 );

		// Hide polylang sync content feature
		// add_action( 'admin_head', [ $this, 'hide_polylang_sync_button' ] );

		// Show Polylang language names as slugs
		// add_filter( 'pll_the_languages_args', [ $this, 'polylang_language_slugs' ] );

		// Show Polylang language names as slugs and full names in dropdown
		// add_filter( 'pll_the_languages_args', [ $this, 'polylang_language_names_as_slugs' ] );
	}

	/**
	 * Let canvas classes control colors instead of component-specific styles.
	 *
	 * @param array $styling Component styles grouped by selector.
	 * @param Component $component Page-builder component.
	 * @return array
	 */
	public function css_variables_relationship( array $styling, Component $component ): array {
		$color = $component->background->color ?? '';

		if ( empty( $color ) || strpos( $color, 'bg-canvas' ) !== 0 ) {
			return $styling;
		}

		$selector = '.' . $component->get_unique_identifier_class();

		unset(
			$styling[ $selector ]['background-color'],
			$styling[ $selector ]['color'],
			$styling[ $selector ]['--fg-color'],
			$styling[ $selector ]['--bg-color']
		);

		return $styling;
	}

	/**
	 * Add the selected canvas class so SCSS can apply its background and theme.
	 *
	 * @param string[] $classes Component CSS classes.
	 * @param Component $component Page-builder component.
	 * @return string[]
	 */
	public function css_classes_relationship( array $classes, Component $component ): array {
		$color = $component->background->color ?? '';

		if ( ! empty( $color ) && strpos( $color, 'bg-canvas' ) === 0 ) {
			$classes[] = sanitize_html_class( $color );
		}

		return $classes;
	}


	/**
	 * Container width for the theme
	 *
	 * @return int
	 */
	public function container_width() {
		return 1680;
	}

	/**
	 * Replace clear filter button text
	 *
	 * @return string
	 */
	public function clear_filter_text() {
		return esc_html__( 'Clear', 'g-theme-child' );
	}

	/**
	 * Show Polylang language names as slugs
	 *
	 * @param array $args
	 */
	public function polylang_language_slugs( array $args ) {
		$args['display_names_as'] = 'slug';
		return $args;
	}

	/**
	 * Show Polylang language names as slugs and full names in dropdown
	 *
	 * @param array $args
	 */
	public function polylang_language_names_as_slugs( array $args ) {
		$args['display_names_as'] = 'slug';

		if ( isset( $args['raw'] ) && $args['raw'] === 1 ) {
			$args['display_names_as'] = 'name';
		}

		return $args;
	}

	/**
	 * Hide Polylang sync button
	 *
	 * @return void
	 */
	public function hide_polylang_sync_button() {
		?>
		<style>
			.pll-sync-column {
				display: none !important;
			}
		</style>
		<?php
	}

	/**
	 * Add date formats
	 *
	 * @param array $date_formats
	 *
	 * @return array
	 */
	public function add_date_formats( array $date_formats ) {
		$date_formats['j F, Y'] = esc_html__( 'dd Month, Year', 'g-theme-child' );

		return $date_formats;
	}

	/**
	 * Add menu arrow to menu items with child-elements
	 *
	 * @param string $item_output
	 * @param WP_Post $item // Menu item data object.
	 * @param int $depth
	 * @param stdClass $args
	 * @return string[]
	 */
	public function parent_menu_dropdown( string $item_output, \WP_Post $item, int $depth, $args ) {
		if ( is_array( $item->classes ) && in_array( 'menu-item-has-children', $item->classes, true ) ) {
			$aria_label = sprintf(
			/* translators: %s: menu item title. */
				__( 'Toggle submenu for %s', 'g-theme-child' ),
				$item->title
			);

			$item_output = str_replace( '</a>', '', $item_output ) .
				'</a><button class="sub-menu-toggle" aria-label="' . esc_attr( $aria_label ) . '">' .
				'<span class="menu-arrow" role="img" aria-hidden="true"></span>' .
				'</button>';
		}

		return $item_output;
	}
}
