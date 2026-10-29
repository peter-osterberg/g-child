<?php declare(strict_types=1);

namespace GTheme_Child\Modules\Button;

use GTheme\Page_Builder\Components\Module\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

/**
 * Model for the Button module
 */
class Button extends Module {
	/**
	 * @inheritDoc
	 * @var array<string,string>
	 */
	protected $casts = [
		'buttons' => 'array',
	];

	/**
	 * @inheritDoc
	 * @var array<int,array<string,mixed>>
	 */
	public $buttons = [];

	/**
	 * @inheritDoc
	 * @var string
	 */
	public $layout = 'inline';

	/**
	 * @inheritDoc
	 * @var string
	 */
	public $align = 'left';

	/**
	 * @inheritDoc
	 */
	public function get_classes(): array {
		$classes   = parent::get_classes();
		$classes[] = 'btn-layout-' . $this->layout;
		$classes[] = 'btn-align-' . $this->align;

		return $classes;
	}

	/**
	 * Get icon-only data for the button.
	 *
	 * @param array<string,mixed> $button
	 * @return array{library:string,name:string,weight:string}|null
	 */
	public function get_icon_only_data( array $button ): ?array {
		if ( ! $this->is_icon_only( $button ) ) {
			return null;
		}

		return $this->get_icon_data( $button, 'icon_only' );
	}

	/**
	 * Get prefix icon data for the active button variant.
	 *
	 * @param array<string,mixed> $button
	 * @return array{library:string,name:string,weight:string}|null
	 */
	public function get_icon_start_data( array $button ): ?array {
		$base_field = $this->get_prefix_icon_field_base( $button );

		if ( ! $this->has_active_prefix_icon( $button ) || ! $this->is_enabled( $button[ $base_field ] ?? false ) ) {
			return null;
		}

		return $this->get_icon_data( $button, $base_field );
	}

	/**
	 * Get suffix icon data for the active button variant.
	 *
	 * @param array<string,mixed> $button
	 * @return array{library:string,name:string,weight:string}|null
	 */
	public function get_icon_end_data( array $button ): ?array {
		$base_field = $this->get_suffix_icon_field_base( $button );

		if ( ! $this->has_active_suffix_icon( $button ) || ! $this->is_enabled( $button[ $base_field ] ?? false ) ) {
			return null;
		}

		return $this->get_icon_data( $button, $base_field );
	}

	/**
	 * Extract icon data for a given base field.
	 *
	 * @param array<string,mixed> $button
	 * @param string              $base_field
	 * @return array{library:string,name:string,weight:string}|null
	 */
	protected function get_icon_data( array $button, string $base_field ): ?array {
		$library_field = (string) ( $button[ "{$base_field}_icon_library" ] ?? '' );

		if ( $library_field === '' ) {
			$library_prefix = 'font_awesome';
			$library        = 'font-awesome';
		} else {
			$library_prefix = GTheme()->icon_renderer->get_library_field_prefix( $library_field );
			$library        = $library_field;
		}

		$weight = (string) ( $button[ "{$base_field}_{$library_prefix}_icon_weight" ] ?? 'regular' );
		$name   = (string) ( $button[ "{$base_field}_{$library_prefix}_icon" ] ?? '' );

		if ( $name === '' || $weight === '' ) {
			return null;
		}

		return [
			'library' => $library,
			'name'    => $name,
			'weight'  => $weight,
		];
	}

	/**
	 * Build and normalize all button entries.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function build_buttons(): array {
		$buttons = is_array( $this->buttons ) ? $this->buttons : [];

		foreach ( $buttons as &$button ) {
			$link = is_array( $button['btn_link']['link'] ?? null ) ? $button['btn_link']['link'] : [];

			if ( ! empty( $link['post_id'] ) ) {
				$button['btn_url'] = get_permalink( (int) $link['post_id'] );
			} elseif ( ! empty( $link['url'] ) ) {
				$button['btn_url'] = $this->format_button_url( (string) $link['url'] );
			} else {
				$button['btn_url'] = '';
			}

			$button['btn_tag']        = ! empty( $button['btn_url'] ) ? 'a' : 'button';
			$button['btn_attributes'] = $this->build_button_attributes( $button );
			$button['btn_classes']    = $this->build_button_classes( $button );
			$button['is_icon_only']   = $this->is_icon_only( $button );
		}
		unset( $button );

		$this->buttons = $buttons;

		return $this->buttons;
	}

	/**
	 * Format URL for buttons.
	 */
	protected function format_button_url( string $url ): string {
		$url = trim( $url );

		if ( $url === '' ) {
			return '';
		}

		if ( filter_var( $url, FILTER_VALIDATE_EMAIL ) ) {
			return 'mailto:' . $url;
		}

		$phone_number = preg_replace( '/\D/', '', $url );
		if ( preg_match( '/^\+?[\d\s\-\(\)]+$/', $url ) && strlen( (string) $phone_number ) >= 7 ) {
			return 'tel:' . $phone_number;
		}

		return $url;
	}

	/**
	 * Build CSS classes for a button.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function build_button_classes( array $button ): string {
		$icon_only      = $this->is_icon_only( $button );
		$text_variant   = $this->is_text_variant( $button );
		$variant        = trim( (string) ( $button['variant'] ?? '' ) );
		$color          = $this->get_active_color_class( $button );
		$disabled       = $this->is_enabled( $button['disable'] ?? false );
		$mods           = $this->get_active_modifiers( $button );
		$size_class     = $this->get_active_size_class( $button );
		$extra_classes  = $this->normalize_css_class_list( $button['css_classes'] ?? '' );
		$has_start_icon = $this->has_custom_prefix_icon( $button );
		$has_end_icon   = $this->has_custom_suffix_icon( $button );

		$classes = array_filter(
			array_map(
				'trim',
				array_merge(
					[
						$variant,
						$color,
						$size_class,
						$has_start_icon ? 'btn-custom-icon-start' : '',
						$has_end_icon ? 'btn-custom-icon-end' : '',
						$icon_only ? 'btn-icon-only' : '',
						$text_variant ? 'btn-is-text' : '',
						( $disabled && ! empty( $button['btn_url'] ) ) ? 'disabled' : '',
					],
					$mods,
					$extra_classes
				)
			)
		);

		return implode( ' ', array_values( array_unique( $classes ) ) );
	}

	/**
	 * Build HTML attributes for a button.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function build_button_attributes( array $button ): string {
		$target_blank    = $this->is_enabled( $button['btn_link']['target_blank'] ?? false );
		$button_id       = (string) ( $button['css_id'] ?? '' );
		$icon_only       = $this->is_icon_only( $button );
		$disabled        = $this->is_enabled( $button['disable'] ?? false );
		$has_url         = ! empty( $button['btn_url'] );
		$label           = trim( (string) ( $button['text'] ?? '' ) );
		$data_attributes = $this->normalize_data_attributes( $button['data_attributes'] ?? '' );

		$attrs = [
			'href'          => $has_url ? esc_url( (string) $button['btn_url'] ) : '',
			'id'            => $button_id !== '' ? sanitize_html_class( $button_id ) : '',
			'aria-label'    => ( $icon_only && $label !== '' ) ? $label : '',
			'tabindex'      => ( $disabled && $has_url ) ? '-1' : '',
			'disabled'      => ( $disabled && ! $has_url ) ? 'disabled' : '',
			'aria-disabled' => $disabled ? 'true' : '',
		];

		if ( $target_blank && $has_url ) {
			$attrs['target'] = '_blank';
			$attrs['rel']    = 'noopener noreferrer';
		}

		$attrs = array_merge( $attrs, $data_attributes );

		return $this->render_attribute_string( $attrs );
	}

	/**
	 * Render an HTML attribute string while preserving values like "0".
	 *
	 * @param array<string,mixed> $attrs
	 */
	protected function render_attribute_string( array $attrs ): string {
		$parts = [];

		foreach ( $attrs as $key => $value ) {
			if ( $value === '' || $value === null ) {
				continue;
			}

			$parts[] = sprintf(
				'%s="%s"',
				esc_attr( (string) $key ),
				esc_attr( (string) $value )
			);
		}

		return implode( ' ', $parts );
	}

	/**
	 * Determine whether the button is icon-only.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function is_icon_only( array $button ): bool {
		return $this->is_enabled( $button['icon_only'] ?? false );
	}

	/**
	 * Determine whether the button uses the text variant.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function is_text_variant( array $button ): bool {
		return (string) ( $button['variant'] ?? '' ) === 'btn btn-text';
	}

	/**
	 * Get active modifiers for the current button mode.
	 *
	 * @param array<string,mixed> $button
	 * @return array<int,string>
	 */
	protected function get_active_modifiers( array $button ): array {
		if ( $this->is_icon_only( $button ) ) {
			return $this->normalize_modifier_list( $button['modifiers_icon_only'] ?? [] );
		}

		if ( $this->is_text_variant( $button ) ) {
			return $this->normalize_modifier_list( $button['modifiers_text'] ?? [] );
		}

		return $this->normalize_modifier_list( $button['modifiers'] ?? [] );
	}

	/**
	 * Get the active size class for the current button mode.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function get_active_size_class( array $button ): string {
		if ( $this->is_text_variant( $button ) ) {
			return trim( (string) ( $button['text_size'] ?? '' ) );
		}

		return trim( (string) ( $button['size'] ?? '' ) );
	}

	/**
	 * Get the active color class for the current button mode.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function get_active_color_class( array $button ): string {
		if ( $this->is_text_variant( $button ) ) {
			return trim( (string) ( $button['text_color'] ?? 'btn-currentcolor' ) );
		}

		return trim( (string) ( $button['color'] ?? '' ) );
	}

	/**
	 * Check if a custom prefix icon is enabled for the active button mode.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function has_custom_prefix_icon( array $button ): bool {
		if ( $this->is_icon_only( $button ) ) {
			return false;
		}

		$base_field = $this->get_prefix_icon_field_base( $button );

		return $this->has_active_prefix_icon( $button ) && $this->is_enabled( $button[ $base_field ] ?? false );
	}

	/**
	 * Check if a custom suffix icon is enabled for the active button mode.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function has_custom_suffix_icon( array $button ): bool {
		if ( $this->is_icon_only( $button ) ) {
			return false;
		}

		$base_field = $this->get_suffix_icon_field_base( $button );

		return $this->has_active_suffix_icon( $button ) && $this->is_enabled( $button[ $base_field ] ?? false );
	}

	/**
	 * Check whether the active button mode currently includes a prefix icon slot.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function has_active_prefix_icon( array $button ): bool {
		return in_array( 'btn-icon-start', $this->get_active_modifiers( $button ), true );
	}

	/**
	 * Check whether the active button mode currently includes a suffix icon slot.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function has_active_suffix_icon( array $button ): bool {
		return in_array( 'btn-icon-end', $this->get_active_modifiers( $button ), true );
	}

	/**
	 * Normalize builder toggle values into a real boolean.
	 *
	 * @param mixed $value
	 */
	protected function is_enabled( $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_int( $value ) ) {
			return $value === 1;
		}

		if ( is_string( $value ) ) {
			return in_array( strtolower( trim( $value ) ), [ '1', 'true', 'on', 'yes' ], true );
		}

		return false;
	}

	/**
	 * Get the base field name for the active prefix icon.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function get_prefix_icon_field_base( array $button ): string {
		return $this->is_text_variant( $button ) ? 'custom_icon_start_text' : 'custom_icon_start';
	}

	/**
	 * Get the base field name for the active suffix icon.
	 *
	 * @param array<string,mixed> $button
	 */
	protected function get_suffix_icon_field_base( array $button ): string {
		return $this->is_text_variant( $button ) ? 'custom_icon_end_text' : 'custom_icon_end';
	}

	/**
	 * Normalize modifiers into a flat array of class names.
	 *
	 * @param mixed $modifiers
	 * @return array<int,string>
	 */
	protected function normalize_modifier_list( $modifiers ): array {
		if ( is_array( $modifiers ) ) {
			$values = $modifiers;
		} else {
			$values = preg_split( '/[\s,]+/', (string) $modifiers, -1, PREG_SPLIT_NO_EMPTY ) ?: [];
		}

		$values = array_map( 'trim', $values );
		$values = array_filter( $values, static fn( $value ) => $value !== '' );

		return array_values( array_unique( $values ) );
	}

	/**
	 * Normalize extra CSS classes into an array.
	 *
	 * @param mixed $css_classes
	 * @return array<int,string>
	 */
	protected function normalize_css_class_list( $css_classes ): array {
		$values = preg_split( '/\s+/', trim( (string) $css_classes ), -1, PREG_SPLIT_NO_EMPTY ) ?: [];

		return array_values( array_unique( array_map( 'trim', $values ) ) );
	}

	/**
	 * Normalize data-* attributes into an associative array.
	 *
	 * Expected input:
	 * data-mobile-toggle="false" data-count="0"
	 *
	 * @param mixed $data_attributes
	 * @return array<string,string>
	 */
	protected function normalize_data_attributes( $data_attributes ): array {
		$raw = trim( (string) $data_attributes );

		if ( $raw === '' ) {
			return [];
		}

		$attrs = [];

		preg_match_all(
			'/\b(data-[a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/',
			$raw,
			$matches,
			PREG_SET_ORDER
		);

		foreach ( $matches as $match ) {
			$key   = strtolower( trim( $match[1] ) );
			$value = $match[2];

			$attrs[ $key ] = $value;
		}

		return $attrs;
	}

	/**
	 * @inheritDoc
	 */
	public function get_editable_selectors(): array {
		return [ 'content' => ' * ' ];
	}
}
