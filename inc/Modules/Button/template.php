<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/** @var GTheme_Child\Modules\Button\Button $model */

if ( ! isset( $model ) || ! is_object( $model ) || ! method_exists( $model, 'build_buttons' ) ) {
	return;
}

$buttons = $model->build_buttons();

if ( empty( $buttons ) || ! is_array( $buttons ) ) {
	return;
}

foreach ( $buttons as $button ) :
	if (
		! is_array( $button ) ||
		! isset( $button['btn_tag'], $button['btn_attributes'], $button['btn_classes'] )
	) {
		continue;
	}

	$btn_tag = in_array( $button['btn_tag'], [ 'a', 'button' ], true ) ? $button['btn_tag'] : 'button';

	$text         = isset( $button['text'] ) ? trim( (string) $button['text'] ) : '';
	$is_icon_only = ! empty( $button['is_icon_only'] );

	$icon_only_data  = $model->get_icon_only_data( $button );
	$icon_start_data = ! $is_icon_only ? $model->get_icon_start_data( $button ) : null;
	$icon_end_data   = ! $is_icon_only ? $model->get_icon_end_data( $button ) : null;

	printf(
		'<%1$s %2$s class="%3$s">',
		esc_attr( $btn_tag ),
		wp_kses_post( $button['btn_attributes'] ),
		esc_attr( $button['btn_classes'] )
	);

	if ( ! empty( $icon_start_data ) ) {
		gt_icon_svg(
			$icon_start_data['library'],
			$icon_start_data['weight'],
			$icon_start_data['name'],
			[ 'svg-icon-start' ],
			true
		);
	}

	if ( ! $is_icon_only && $text !== '' ) {
		printf( '<span>%s</span>', esc_html( $text ) );
	}

	if ( $is_icon_only && ! empty( $icon_only_data ) ) {
		gt_icon_svg(
			$icon_only_data['library'],
			$icon_only_data['weight'],
			$icon_only_data['name'],
			[ 'svg-icon-only' ],
			true
		);
	}

	if ( ! empty( $icon_end_data ) ) {
		gt_icon_svg(
			$icon_end_data['library'],
			$icon_end_data['weight'],
			$icon_end_data['name'],
			[ 'svg-icon-end' ],
			true
		);
	}

	printf( '</%s>', esc_attr( $btn_tag ) );
endforeach;
