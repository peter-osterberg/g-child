<?php

namespace GTheme_Child\Modules\Dummy;

use GTheme\Page_Builder\Components\Module\Module;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/**
 * Model for the dummy module
 */
class Dummy extends Module {
	/**
	* @inheritDoc
	*/
	public function update_from_frontend_data( array $data = [] ) {
		if ( isset( $data['visible_content'] ) ) {
			$this->visible_content = wp_kses_post( $data['visible_content'] );
		}

		if ( isset( $data['hidden_content'] ) ) {
			$this->hidden_content = wp_kses_post( $data['hidden_content'] );
		}

		if ( isset( $data['open_text'] ) ) {
			$this->open_text = wp_kses_post( $data['open_text'] );
		} else {
			$this->open_text = __( 'Read less', 'g-theme-child' );
		}

		if ( isset( $data['close_text'] ) ) {
			$this->close_text = wp_kses_post( $data['close_text'] );
		} else {
			$this->close_text = __( 'Read less', 'g-theme-child' );
		}

		return true;
	}

	/**
	* @inheritDoc
	*/
	public function get_editable_selectors() {
		return [ 'content' => '*' ];
	}
}
