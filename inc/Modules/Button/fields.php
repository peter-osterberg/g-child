<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

$icon = GTheme()->icon_renderer;

/**
 * Shared conditional rules
 */
$if_icon_only = [
	[
		'field' => 'icon_only',
		'value' => true,
	],
];

$if_not_icon_only = [
	[
		'field' => 'icon_only',
		'value' => false,
	],
];

$if_text_variant = [
	[
		'field'    => 'variant',
		'operator' => '=',
		'value'    => 'btn btn-text',
	],
];

$if_not_text_variant = [
	[
		'field'    => 'variant',
		'operator' => '!=',
		'value'    => 'btn btn-text',
	],
];

$if_default_has_prefix_icon = [
	[
		'field'    => 'modifiers',
		'operator' => 'contains',
		'value'    => 'btn-icon-start',
	],
];

$if_text_has_prefix_icon = [
	[
		'field'    => 'modifiers_text',
		'operator' => 'contains',
		'value'    => 'btn-icon-start',
	],
];

$if_default_has_suffix_icon = [
	[
		'field'    => 'modifiers',
		'operator' => 'contains',
		'value'    => 'btn-icon-end',
	],
];

$if_text_has_suffix_icon = [
	[
		'field'    => 'modifiers_text',
		'operator' => 'contains',
		'value'    => 'btn-icon-end',
	],
];

$if_custom_prefix_enabled = [
	[
		'field' => 'custom_icon_start',
		'value' => true,
	],
];

$if_custom_suffix_enabled = [
	[
		'field' => 'custom_icon_end',
		'value' => true,
	],
];

$if_custom_prefix_text_enabled = [
	[
		'field' => 'custom_icon_start_text',
		'value' => true,
	],
];

$if_custom_suffix_text_enabled = [
	[
		'field' => 'custom_icon_end_text',
		'value' => true,
	],
];

/**
 * Get button options for a specific type (variants, colors, sizes, modifiers).
 *
 * @param string $option_type The type of options to retrieve.
 * @param array  $filters     Optional filters to apply (e.g., exclude certain classes).
 *
 * @return array<string,string>
 */
$button_fields = array_merge(
	[
		'text'      => [
			'title'       => esc_html__( 'Label', 'g-theme-child' ),
			'type'        => 'text',
			'admin_label' => true,
			'description' => esc_html__( 'Visible button text. For icon-only buttons, this is used as the accessible label.', 'g-theme-child' ),
			'default'     => esc_html__( 'Click here', 'g-theme-child' ),
		],

		'btn_link'  => [
			'title'  => esc_html__( 'Link', 'g-theme-child' ),
			'type'   => 'container',
			'class'  => 'gt-overlay-link-container',
			'fields' => [
				'link'         => [
					'type'        => 'link',
					'placeholder' => esc_html__( 'Search for content or enter a URL', 'g-theme-child' ),
				],
				'target_blank' => [
					'title'   => esc_html__( 'Open in new tab', 'g-theme-child' ),
					'type'    => 'toggle',
					'classes' => 'gt-justify-right',
				],
			],
		],

		'icon_only' => [
			'title'       => esc_html__( 'Icon-only button', 'g-theme-child' ),
			'type'        => 'toggle',
			'default'     => false,
			'description' => esc_html__( 'Display the button as an icon without visible text.', 'g-theme-child' ),
			'conditional' => $if_not_text_variant,
		],
	],
	// Icon settings: icon-only button
	$icon->get_component_icon_fields(
		[
			'field_name'  => 'icon_only',
			'conditional' => $if_icon_only,
		]
	),
	[
		'variant'                => [
			'title'       => esc_html__( 'Style', 'g-theme-child' ),
			'type'        => 'select',
			'default'     => 'btn btn-filled',
			'options'     => $this->get_button_variants(),
			'description' => esc_html__( 'Choose the overall button style.', 'g-theme-child' ),
		],

		'color'                  => [
			'title'       => esc_html__( 'Color', 'g-theme-child' ),
			'type'        => 'select',
			'default'     => 'btn-primary',
			'options'     => $this->get_button_colors(),
			'description' => esc_html__( 'Choose the button color scheme.', 'g-theme-child' ),
			'conditional' => $if_not_text_variant,
		],

		'size'                   => [
			'title'       => esc_html__( 'Size', 'g-theme-child' ),
			'type'        => 'select',
			'default'     => '',
			'options'     => $this->get_button_sizes(),
			'description' => esc_html__( 'Choose the button size.', 'g-theme-child' ),
			'conditional' => $if_not_text_variant,
		],

		'text_size'              => [
			'title'       => esc_html__( 'Text size', 'g-theme-child' ),
			'type'        => 'select',
			'default'     => '',
			'options'     => $this->get_button_text_sizes(),
			'description' => esc_html__( 'Choose the text size for text-style buttons.', 'g-theme-child' ),
			'conditional' => $if_text_variant,
		],

		'text_color'             => [
			'title'       => esc_html__( 'Color', 'g-theme-child' ),
			'type'        => 'select',
			'default'     => 'btn-currentcolor',
			'options'     => $this->get_button_text_colors(),
			'description' => esc_html__( 'Choose the text color for text-style buttons.', 'g-theme-child' ),
			'conditional' => $if_text_variant,
		],

		// Modifiers
		'modifiers'              => [
			'title'       => esc_html__( 'Additional styles', 'g-theme-child' ),
			'type'        => 'select-multiple',
			'options'     => $this->get_button_modifiers( 'btn-default' ),
			'description' => esc_html__( 'Optional style modifiers for standard buttons.', 'g-theme-child' ),
			'conditional' => array_merge( $if_not_icon_only, $if_not_text_variant ),
		],

		'modifiers_text'         => [
			'title'       => esc_html__( 'Additional styles', 'g-theme-child' ),
			'type'        => 'select-multiple',
			'options'     => $this->get_button_modifiers( 'btn-text' ),
			'description' => esc_html__( 'Optional style modifiers for text-style buttons.', 'g-theme-child' ),
			'conditional' => array_merge( $if_not_icon_only, $if_text_variant ),
		],

		'modifiers_icon_only'    => [
			'title'       => esc_html__( 'Shape', 'g-theme-child' ),
			'type'        => 'select',
			'default'     => 'btn-square',
			'options'     => $this->get_button_modifiers( 'icon-only' ),
			'description' => esc_html__( 'Choose the shape or style for icon-only buttons.', 'g-theme-child' ),
			'conditional' => $if_icon_only,
		],

		// Prefix icon toggles
		'custom_icon_start'      => [
			'title'       => esc_html__( 'Use custom prefix icon', 'g-theme-child' ),
			'type'        => 'toggle',
			'default'     => false,
			'description' => esc_html__( 'Replace the default prefix icon with a custom one.', 'g-theme-child' ),
			'conditional' => array_merge( $if_not_icon_only, $if_not_text_variant, $if_default_has_prefix_icon ),
		],

		'custom_icon_start_text' => [
			'title'       => esc_html__( 'Use custom prefix icon', 'g-theme-child' ),
			'type'        => 'toggle',
			'default'     => false,
			'description' => esc_html__( 'Replace the default prefix icon with a custom one.', 'g-theme-child' ),
			'conditional' => array_merge( $if_not_icon_only, $if_text_variant, $if_text_has_prefix_icon ),
		],
	],
	// Icon settings: prefix icon for standard buttons
	$icon->get_component_icon_fields(
		[
			'field_name'  => 'custom_icon_start',
			'conditional' => array_merge(
				$if_not_icon_only,
				$if_not_text_variant,
				$if_custom_prefix_enabled,
				$if_default_has_prefix_icon
			),
		]
	),
	// Icon settings: prefix icon for text buttons
	$icon->get_component_icon_fields(
		[
			'field_name'  => 'custom_icon_start_text',
			'conditional' => array_merge(
				$if_not_icon_only,
				$if_text_variant,
				$if_custom_prefix_text_enabled,
				$if_text_has_prefix_icon
			),
		]
	),
	[
		// Suffix icon toggles
		'custom_icon_end'      => [
			'title'       => esc_html__( 'Use custom suffix icon', 'g-theme-child' ),
			'type'        => 'toggle',
			'default'     => false,
			'description' => esc_html__( 'Replace the default suffix icon with a custom one.', 'g-theme-child' ),
			'conditional' => array_merge( $if_not_icon_only, $if_not_text_variant, $if_default_has_suffix_icon ),
		],

		'custom_icon_end_text' => [
			'title'       => esc_html__( 'Use custom suffix icon', 'g-theme-child' ),
			'type'        => 'toggle',
			'default'     => false,
			'description' => esc_html__( 'Replace the default suffix icon with a custom one.', 'g-theme-child' ),
			'conditional' => array_merge( $if_not_icon_only, $if_text_variant, $if_text_has_suffix_icon ),
		],
	],
	// Icon settings: suffix icon for standard buttons
	$icon->get_component_icon_fields(
		[
			'field_name'  => 'custom_icon_end',
			'conditional' => array_merge(
				$if_not_icon_only,
				$if_not_text_variant,
				$if_custom_suffix_enabled,
				$if_default_has_suffix_icon
			),
		]
	),
	// Icon settings: suffix icon for text buttons
	$icon->get_component_icon_fields(
		[
			'field_name'  => 'custom_icon_end_text',
			'conditional' => array_merge(
				$if_not_icon_only,
				$if_text_variant,
				$if_custom_suffix_text_enabled,
				$if_text_has_suffix_icon
			),
		]
	),
	[
		'advanced_settings' => [
			'title'   => esc_html__( 'Advanced settings', 'g-theme-child' ),
			'type'    => 'toggle',
			'default' => false,
			'label'   => esc_html__( 'Show advanced settings', 'g-theme-child' ),
		],
		'css_id'            => [
			'title'       => esc_html__( 'CSS ID', 'g-theme-child' ),
			'type'        => 'text',
			'placeholder' => esc_html__( 'Enter a unique ID without #', 'g-theme-child' ),
			'description' => esc_html__( 'Add a unique CSS ID for styling or JavaScript targeting.', 'g-theme-child' ),
			'conditional' => [
				[
					'field' => 'advanced_settings',
					'value' => true,
				],
			],
		],
		'css_classes'       => [
			'title'       => esc_html__( 'CSS classes', 'g-theme-child' ),
			'type'        => 'tags',
			'separator'   => ' ',
			'placeholder' => esc_html__( 'Add one or more CSS classes', 'g-theme-child' ),
			'description' => esc_html__( 'Add custom classes for additional styling.', 'g-theme-child' ),
			'conditional' => [
				[
					'field' => 'advanced_settings',
					'value' => true,
				],
			],
		],
		'data_attributes'   => [
			'title'       => esc_html__( 'Data attributes', 'g-theme-child' ),
			'type'        => 'tags',
			'separator'   => ' ',
			'placeholder' => esc_html__( 'Add one or more data-* attributes', 'g-theme-child' ),
			'description' => esc_html__( 'Add custom data attributes for JavaScript integrations.', 'g-theme-child' ),
			'conditional' => [
				[
					'field' => 'advanced_settings',
					'value' => true,
				],
			],
		],
		'disable'           => [
			'title'       => esc_html__( 'Disabled state', 'g-theme-child' ),
			'type'        => 'toggle',
			'default'     => false,
			'description' => esc_html__( 'Display the button as disabled and prevent interaction.', 'g-theme-child' ),
			'conditional' => [
				[
					'field' => 'advanced_settings',
					'value' => true,
				],
			],
		],
	]
);

/**
 * Get the full field configuration for the Button module.
 *
 * @return array<string,mixed>
 */
return [
	'general' => [
		'fields' => [
			'layout'  => [
				'title'       => esc_html__( 'Layout', 'g-theme-child' ),
				'type'        => 'select',
				'default'     => 'inline',
				'options'     => [
					'inline' => esc_html__( 'Inline', 'g-theme-child' ),
					'block'  => esc_html__( 'Stacked', 'g-theme-child' ),
				],
				'description' => esc_html__( 'Choose how multiple buttons are arranged.', 'g-theme-child' ),
			],

			'align'   => [
				'title'       => esc_html__( 'Alignment', 'g-theme-child' ),
				'type'        => 'select',
				'default'     => 'left',
				'options'     => [
					'left'   => esc_html__( 'Left', 'g-theme-child' ),
					'center' => esc_html__( 'Center', 'g-theme-child' ),
					'right'  => esc_html__( 'Right', 'g-theme-child' ),
				],
				'description' => esc_html__( 'Align the button group within its container.', 'g-theme-child' ),
			],

			'buttons' => [
				'title'  => esc_html__( 'Buttons', 'g-theme-child' ),
				'type'   => 'repeatable',
				'label'  => esc_html__( 'Button', 'g-theme-child' ),
				'fields' => $button_fields,
			],
		],
	],
];
