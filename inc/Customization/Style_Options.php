<?php

namespace GTheme_Child\Customization;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Style_Options
 */
class Style_Options {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {

		// Custom style formats filter
		add_filter( 'style_formats_filter', [ $this, 'append_style_formats' ] );

		// Color picker options
		add_filter( 'gt_color_picker_options', [ $this, 'color_picker_options' ] );
	}

	/**
	 * Add style formats to the WYSIWYG
	 *
	 * @param array $style_formats
	 *
	 * @return array
	 */
	public function append_style_formats( array $style_formats ) {

		if ( isset( $style_formats['buttons']['items'] ) ) {
			$style_formats['buttons']['items'] = array_merge(
				$style_formats['buttons']['items'],
				[
					[
						'title'    => esc_html__( 'Filled', 'g-theme-child' ),
						'selector' => 'a',
						'classes'  => 'btn btn-filled',
					],
					[
						'title'    => esc_html__( 'Outlined', 'g-theme-child' ),
						'selector' => 'a',
						'classes'  => 'btn btn-outline',
					],
					[
						'title'    => esc_html__( 'Ghost', 'g-theme-child' ),
						'selector' => 'a',
						'classes'  => 'btn btn-ghost',
					],
					[
						'title'    => esc_html__( 'Tonal', 'g-theme-child' ),
						'selector' => 'a',
						'classes'  => 'btn btn-tonal',
					],
					[
						'title'    => esc_html__( 'Text', 'g-theme-child' ),
						'selector' => 'a',
						'classes'  => 'btn btn-text',
					],
				]
			);
		}
		$style_formats['button_colors'] = [
			'title' => esc_html__( 'Button colors', 'g-theme-child' ),
			'items' => [
				[
					'title'    => esc_html__( 'Primary', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-primary',
				],
				[
					'title'    => esc_html__( 'Secondary', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-secondary',
				],
			],
		];
		$style_formats['button_sizes'] = [
			'title' => esc_html__( 'Button sizes', 'g-theme-child' ),
			'items' => [
				[
					'title'    => esc_html__( 'Small', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-sm',
				],
				[
					'title'    => esc_html__( 'Large', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-lg',
				],
			],
		];
		$style_formats['button_mods'] = [
			'title' => esc_html__( 'Button type', 'g-theme-child' ),
			'items' => [
				[
					'title'    => esc_html__( 'Icon before text', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-icon-start',
				],
				[
					'title'    => esc_html__( 'Icon after text', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-icon-end',
				],
				[
					'title'    => esc_html__( 'Full width', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-block',
				],
				[
					'title'    => esc_html__( 'Round', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-round',
				],
				[
					'title'    => esc_html__( 'Square', 'g-theme-child' ),
					'selector' => '.btn',
					'classes'  => 'btn-square',
				],

			],
		];

		if ( isset( $style_formats['headings']['items'] ) ) {
			$style_formats['headings']['items'] = array_merge(
				[
					[
						'title'    => esc_html__( 'D1 text', 'g-theme-child' ),
						'selector' => 'h1, h2, h3, h4, h5, h6, p',
						'classes'  => 'd1',
					],
				],
				$style_formats['headings']['items']
			);
		}

		$style_formats['lists'] = [
			'title' => esc_html__( 'Lists', 'g-theme-child' ),
			'items' => [
				[
					'title'    => esc_html__( 'Checklist', 'g-theme-child' ),
					'selector' => 'ul',
					'classes'  => 'list-check',
				],
			],
		];

		$style_formats['text_colors'] = [
			'title' => esc_html__( 'Text colors', 'g-theme-child' ),
			'items' => [
				[
					'title'    => esc_html__( 'Primary', 'g-theme-child' ),
					'selector' => 'p, h1, h2, h3, h4, h5, h6, ul, ol, em, strong, span',
					'classes'  => 'text-primary',
				],
				[
					'title'    => esc_html__( 'Secondary', 'g-theme-child' ),
					'selector' => 'p, h1, h2, h3, h4, h5, h6, ul, ol, em, strong, span',
					'classes'  => 'text-secondary',
				],
				[
					'title'    => esc_html__( 'Muted', 'g-theme-child' ),
					'selector' => 'p, h1, h2, h3, h4, h5, h6, ul, ol, em, strong, span',
					'classes'  => 'text-text-muted',
				],
				[
					'title'    => esc_html__( 'Text 1', 'g-theme-child' ),
					'selector' => 'p, h1, h2, h3, h4, h5, h6, ul, ol, em, strong, span',
					'classes'  => 'text-text-1',
				],
				[
					'title'    => esc_html__( 'Text 2', 'g-theme-child' ),
					'selector' => 'p, h1, h2, h3, h4, h5, h6, ul, ol, em, strong, span',
					'classes'  => 'text-text-2',
				],
				[
					'title'    => esc_html__( 'Text 3', 'g-theme-child' ),
					'selector' => 'p, h1, h2, h3, h4, h5, h6, ul, ol, em, strong, span',
					'classes'  => 'text-text-3',
				],
			],
		];

		return array_merge(
			$style_formats,
			[
				[
					'title'    => esc_html__( 'Micro text', 'g-theme-child' ),
					'selector' => 'p, ul, ol',
					'classes'  => 'micro',
				],
			]
		);

	}

	/**
	 * Add color picker options
	 *
	 * @param array<string, array{0: string, 1: string}> $options Available color choices.
	 * @return array<string, array{0: string, 1: string}>
	 */
	public function color_picker_options( array $options ): array {
		$options = array_merge(
			$options,
			[
				'bg-canvas'      => [ 'var(--bg-canvas)', esc_html__( 'Standard background', 'g-theme-child' ) ],
				'bg-canvas-dark' => [ 'var(--bg-canvas-dark)', esc_html__( 'Dark background', 'g-theme-child' ) ],
				'bg-canvas-pink' => [ 'var(--bg-canvas-pink)', esc_html__( 'Pink background', 'g-theme-child' ) ],
			]
		);

		return $options;
	}
}
