<?php

namespace GTheme_Child\Modules\Button;

use GTheme\Page_Builder\Components\Module\Module_Controller;
use GTheme_Child\Utils\Asset_Loader;

use function GTheme_Child\GTheme;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Module class for a Button module
 */
class Button_Controller extends Module_Controller {

	/**
	 * @inheritDoc
	 */
	protected $icon = 'hand-pointer';

	/**
	 * @inheritDoc
	 */
	public function get_title() {
		return esc_html__( 'Button', 'g-theme-child' );
	}

	/**
	 * Return style formats array safely.
	 *
	 * @return array<string,mixed>
	 */
	protected function get_style_formats(): array {
		$formats = \GTheme()->support::style_formats();
		return is_array( $formats ) ? $formats : [];
	}

	/**
	 * Get formatted options for buttons.
	 *
	 * @param string              $type    Type of buttons to fetch.
	 * @param array<string,mixed> $filters Optional filters: ['include' => string[], 'exclude' => string[]]
	 *
	 * @return array<string,string>
	 */
	private function get_button_options( string $type, array $filters = [] ): array {
		$formats = $this->get_style_formats();
		$items   = $formats[ $type ]['items'] ?? [];

		if ( ! is_array( $items ) || empty( $items ) ) {
			return [];
		}

		$include = isset( $filters['include'] ) && is_array( $filters['include'] ) ? $filters['include'] : null;
		$exclude = isset( $filters['exclude'] ) && is_array( $filters['exclude'] ) ? $filters['exclude'] : null;

		$options = [];

		foreach ( $items as $item ) {
			$classes = $item['classes'] ?? '';
			$title   = $item['title'] ?? '';

			if ( $classes === '' || $title === '' ) {
				continue;
			}

			if ( $exclude && in_array( $classes, $exclude, true ) ) {
				continue;
			}

			if ( $include && ! in_array( $classes, $include, true ) ) {
				continue;
			}

			$options[ $classes ] = $title;
		}

		return $options;
	}

	/**
	 * Get button variants.
	 *
	 * @return array<string,string>
	 */
	public function get_button_variants(): array {
		return $this->get_button_options(
			'buttons',
			[
				'exclude' => [ 'btn' ],
			]
		);
	}

	/**
	 * Get button colors.
	 *
	 * @return array<string,string>
	 */
	public function get_button_colors(): array {
		return $this->get_button_options( 'button_colors' );
	}

	/**
	 * Get button colors for text buttons, including inherited current color.
	 *
	 * @return array<string,string>
	 */
	public function get_button_text_colors(): array {
		return array_merge(
			[
				'btn-currentcolor' => esc_html__( 'Current Color', 'g-theme-child' ),
			],
			$this->get_button_colors()
		);
	}

	/**
	 * Get button sizes.
	 *
	 * @return array<string,string>
	 */
	public function get_button_sizes(): array {
		$options = [ '' => esc_html__( '- Select size -', 'g-theme-child' ) ];
		$sizes   = $this->get_button_options( 'button_sizes' );

		return is_array( $sizes ) ? array_merge( $options, $sizes ) : $options;
	}

	/**
	 * Get button text sizes.
	 *
	 * @return array<string,string>
	 */
	public function get_button_text_sizes(): array {
		$formats   = $this->get_style_formats();
		$headings  = $formats['headings']['items'] ?? [];
		$whitelist = [ 'large', 'small', 'micro', 'tiny' ];

		$options = [ '' => esc_html__( '- Select size -', 'g-theme-child' ) ];

		if ( is_array( $headings ) ) {
			foreach ( $headings as $heading ) {
				$classes = $heading['classes'] ?? '';
				$title   = $heading['title'] ?? '';

				if ( $classes !== '' && $title !== '' ) {
					$options[ $classes ] = $title;
				}
			}
		}

		foreach ( $formats as $maybe_size ) {
			if ( ! is_array( $maybe_size ) ) {
				continue;
			}

			$classes = $maybe_size['classes'] ?? null;
			$title   = $maybe_size['title'] ?? null;

			if ( $classes && $title && in_array( $classes, $whitelist, true ) ) {
				$options[ $classes ] = $title;
			}
		}

		return $options;
	}

	/**
	 * Get button modifiers.
	 *
	 * @param string|null $variant Button variant to fetch specific modifiers for.
	 *
	 * @return array<string,string>
	 */
	public function get_button_modifiers( ?string $variant = null ): array {
		if ( $variant === null || $variant === '' ) {
			return $this->get_button_options( 'button_mods' );
		}

		$filters = [];

		switch ( $variant ) {
			case 'btn-default':
				$filters['exclude'] = [ 'btn-square', 'btn-round' ];
				break;

			case 'btn-text':
				$filters['exclude'] = [ 'btn-block', 'btn-round', 'btn-square' ];
				break;

			case 'icon-only':
				$filters['exclude'] = [ 'btn-icon-start', 'btn-icon-end', 'btn-block' ];
				break;
		}

		return $this->get_button_options( 'button_mods', $filters );
	}

	/**
	 * Setup fields for the Button module
	 *
	 * @return array
	 */
	public function setup_fields() {
		parent::setup_fields();
		$this->remove_field( 'overlay_link' );
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
