<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

return [
	'general' => [
		'fields' => [
			'counter_toggle'      => [
				'title'       => esc_html__( 'Count to number', 'g-theme-child' ),
				'type'        => 'toggle',
				'description' => esc_html__( 'Enable or disable the counter animation.', 'g-theme-child' ),
			],
			'count_from'          => [
				'title'       => esc_html__( 'Number from', 'g-theme-child' ),
				'type'        => 'text',
				'default'     => '0',
				'description' => esc_html__( 'Input an integer or a number including decimals, e.g. 10 or 11,2. Use "." or "," as punctuation marks between the integer and decimal', 'g-theme-child' ),
				'conditional' => [
					[
						'field' => 'counter_toggle',
						'value' => true,
					],
				],
			],
			'count_to'            => [
				'title'       => esc_html__( 'Number to', 'g-theme-child' ),
				'type'        => 'text',
				'admin_label' => true,
				'description' => esc_html__( 'Input an integer or a number including decimals, e.g. 10 or 11,2. Use "." or "," as punctuation marks between the integer and decimal', 'g-theme-child' ),
			],
			'heading_size_visual' => [
				'title'       => esc_html__( 'Visual size', 'g-theme-child' ),
				'description' => esc_html__( 'You can select a visually different size of the title (won\'t affect SEO). Leave blank to show the real size.', 'g-theme-child' ),
				'type'        => 'select',
				'placeholder' => esc_html__( '- Select size -', 'g-theme-child' ),
				'options'     => [
					'1' => 'H1',
					'2' => 'H2',
					'3' => 'H3',
					'4' => 'H4',
					'5' => 'H5',
					'6' => 'H6',
				],
				'default'     => '2',
			],
			'prefix'              => [
				'title'       => esc_html__( 'Prefix', 'g-theme-child' ),
				'type'        => 'text',
				'description' => esc_html__( 'A character in the beginning of the number, e.g. + 10', 'g-theme-child' ),
			],
			'suffix'              => [
				'title'       => esc_html__( 'Suffix', 'g-theme-child' ),
				'type'        => 'text',
				'description' => esc_html__( 'A character in the end of the number, e.g. 10 %', 'g-theme-child' ),
			],
			'duration'            => [
				'title'       => esc_html__( 'Counter duration', 'g-theme-child' ),
				'type'        => 'number',
				'description' => esc_html__( 'The amount of milliseconds, 1000 = 1 second', 'g-theme-child' ),
				'conditional' => [
					[
						'field' => 'counter_toggle',
						'value' => true,
					],
				],
			],
			'content'             => [
				'title'      => esc_html__( 'Description', 'g-theme-child' ),
				'type'       => 'editor',
				'code_style' => 'html',
			],
		],
	],
];
