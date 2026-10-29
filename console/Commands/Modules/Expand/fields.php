<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

return [
	'general' => [
		'fields' => [
			'title'               => [
				'title' => esc_html__( 'Title', 'g-theme-child' ),
				'type'  => 'text',
			],
			'heading_size_real'   => [
				'title'       => esc_html__( 'Heading', 'g-theme-child' ),
				'description' => esc_html__( 'Select the real HTML-tag of the title', 'g-theme-child' ),
				'type'        => 'select',
				'options'     => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
				],
				'default'     => 'h2',
			],
			'heading_size_visual' => [
				'title'       => esc_html__( 'Heading size', 'g-theme-child' ),
				'description' => esc_html__( 'Select the visual HTML-tag of the title', 'g-theme-child' ),
				'type'        => 'select',
				'options'     => [
					'h1'    => 'H1',
					'h2'    => 'H2',
					'h3'    => 'H3',
					'h4'    => 'H4',
					'h5'    => 'H5',
					'h6'    => 'H6',
					'p'     => 'p',
					'gt-d1' => 'Display',
				],
				'default'     => 'h2',
			],
			'content'             => [
				'title'      => esc_html__( 'Editor ', 'g-theme-child' ),
				'type'       => 'editor',
				'code_style' => 'html',
			],
			'rows_to_show'        => [
				'title' => esc_html__( 'Rows to show', 'g-theme-child' ),
				'type'  => 'number',
			],
			'rows_to_fade'        => [
				'title'   => esc_html__( 'Fade rows', 'g-theme-child' ),
				'type'    => 'toggle',
				'default' => 'false',
			],
			'open'                => [
				'title' => esc_html__( 'Read more label', 'g-theme-child' ),
				'type'  => 'text',
			],
			'close'               => [
				'title' => esc_html__( 'Read less label ', 'g-theme-child' ),
				'type'  => 'text',
			],
		],
	],
];
