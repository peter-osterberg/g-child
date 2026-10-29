<?php

namespace GTheme_Child\Customization;

use GTheme_Child\Traits\Singleton;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Class Gravityforms
 */
class Gravityforms {
	use Singleton;

	/**
	 * Init function for adding hooks and filters
	 *
	 * @return void
	 */
	public function init() {
		// Remove Gravity form submit anchor link
		add_filter( 'gform_confirmation_anchor', '__return_false' );

		// Replace "input" with "button" for submits in Gravity Forms
		add_filter( 'gform_submit_button', [ $this, 'gravity_forms_input_to_button_submit' ], 10, 2 );

		// Change slug to prevent loading of default styles
		add_filter( 'gform_form_theme_slug', [ $this, 'change_gravityforms_styling' ] );

		// Remove default Gravity Forms styles
		add_filter( 'gform_disable_css', '__return_true' );

		// Remove "* indicates required" legend from forms
		add_filter( 'gform_required_legend', '__return_empty_string' );

		// Enable real ajax for Gravity Forms 2.9+
		add_filter( 'gform_form_args', [ $this, 'enable_gravityforms_ajax_submission' ] );
	}

	/**
	 * Enable real ajax for Gravity Forms 2.9+
	 * @param array $args
	 * @return array
	 */
	public function enable_gravityforms_ajax_submission( $args ) {
		$args['submission_method'] = 'ajax';
		return $args;
	}

	/**
	 * Remove styling by switching to a custom theme
	 *
	 * @return string
	 */
	public function change_gravityforms_styling() {
		return 'g-theme-child';
	}

	/**
	 * Replace "input" with "button" for submits
	 *
	 * @param string $button
	 * @param array $form
	 *
	 * @return string
	 */
	public function gravity_forms_input_to_button_submit( $button, $form ) {
		if ( ! is_string( $button ) || '' === $button ) {
			return $button;
		}

		$button_label = isset( $form['button']['text'] ) ? (string) $form['button']['text'] : '';

		$converted_button = preg_replace_callback(
			'/<input\b(?P<attributes>[^>]*)\/?>/i',
			static function ( array $matches ) use ( $button_label ) {
				$attributes = trim( preg_replace( '/\s*\/\s*$/', '', $matches['attributes'] ) );
				$label = $button_label;

				if ( '' === $label && preg_match( '/\bvalue=(["\'])(.*?)\1/i', $matches['attributes'], $value_match ) ) {
					$label = $value_match[2];
				}

				return sprintf(
					'<button%s>%s</button>',
					'' !== $attributes ? ' ' . $attributes : '',
					esc_html( wp_strip_all_tags( $label ) )
				);
			},
			$button,
			1
		);

		return is_string( $converted_button ) ? $converted_button : $button;
	}
}
