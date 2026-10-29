<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

return [
	'general' => [
		'fields' => [
			'custom_admin_label' => [
				'title'       => esc_html__( 'Custom admin label example', 'g-theme-child' ),
				'type'        => 'text',
				'admin_label' => true,
			],
			'conditional'        => [
				'title'       => esc_html__( 'Conditional field', 'g-theme-child' ),
				'type'        => 'text',
				'conditional' => [
					[
						'field'    => 'custom_admin_label',
						'operator' => '=',
						'value'    => 'hello',
					],
				],
			],
			'section_test'       => [
				'title'  => esc_html__( 'Field section', 'g-theme-child' ),
				'type'   => 'section',
				'fields' => [
					'toggle_test' => [
						'title' => esc_html__( 'Toggle field', 'g-theme-child' ),
						'type'  => 'toggle',
					],
					'text_test'   => [
						'title' => esc_html__( 'Text field', 'g-theme-child' ),
						'type'  => 'text',
					],
				],
			],
			'container'          => [
				'title'  => esc_html__( 'Link', 'g-theme-child' ),
				'type'   => 'container',
				'fields' => [
					'url'          => [
						'title'       => esc_html__( 'Text', 'g-theme-child' ),
						'type'        => 'link',
						'placeholder' => 'hallå',
					],
					'target_blank' => [
						'title' => esc_html__( 'Target blank', 'g-theme-child' ),
						'type'  => 'toggle',
					],
				],
			],

			'link'               => [
				'title' => esc_html__( 'Link field', 'g-theme-child' ),
				'type'  => 'link',
			],
			'number'             => [
				'title' => esc_html__( 'Number field', 'g-theme-child' ),
				'type'  => 'number',
				'min'   => 5,
				'max'   => 100,
				'step'  => 0.1,
			],
			'content'            => [
				'title'      => esc_html__( 'Editor field', 'g-theme-child' ),
				'type'       => 'editor',
				'code_style' => 'html',
			],
			'code'               => [
				'title' => esc_html__( 'Code field', 'g-theme-child' ),
				'type'  => 'code',
			],
			'color'              => [
				'title' => esc_html__( 'Color field', 'g-theme-child' ),
				'type'  => 'color',
			],
			'image_id'           => [
				'title'       => esc_html__( 'Image with ID', 'g-theme-child' ),
				'type'        => 'media',
				'storage'     => 'id',
				'media_types' => [ 'image' ],
			],
			'image_url'          => [
				'title'       => esc_html__( 'Image with URL', 'g-theme-child' ),
				'type'        => 'media',
				'storage'     => 'url',
				'media_types' => [ 'image' ],
			],
			'video_id'           => [
				'title'       => esc_html__( 'Video with ID', 'g-theme-child' ),
				'type'        => 'media',
				'storage'     => 'id',
				'media_types' => [ 'video' ],
			],
			'video_url'          => [
				'title'       => esc_html__( 'Video with URL', 'g-theme-child' ),
				'type'        => 'media',
				'storage'     => 'url',
				'media_types' => [ 'video' ],
			],
			'url'                => [
				'title' => esc_html__( 'URL field', 'g-theme-child' ),
				'type'  => 'url',
			],
			'phone'              => [
				'title' => esc_html__( 'Phone field', 'g-theme-child' ),
				'type'  => 'phone',
			],
			'email'              => [
				'title' => esc_html__( 'E-mail field', 'g-theme-child' ),
				'type'  => 'email',
			],
			'select'             => [
				'title'   => esc_html__( 'Select field', 'g-theme-child' ),
				'type'    => 'select',
				'options' => [
					'first_one'  => esc_html__( 'First one', 'g-theme-child' ),
					'second_one' => esc_html__( 'Second one', 'g-theme-child' ),
				],
			],
			'select_multiple'    => [
				'title'   => 'Select multiple',
				'type'    => 'select-multiple',
				'options' => [
					'first_one'  => esc_html__( 'First one', 'g-theme-child' ),
					'second_one' => esc_html__( 'Second one', 'g-theme-child' ),
				],
			],
			'toggle'             => [
				'title' => esc_html__( 'Toggle field', 'g-theme-child' ),
				'type'  => 'toggle',
			],
		],
	],
];
