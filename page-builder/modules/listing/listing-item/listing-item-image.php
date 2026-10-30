<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** @var \GTheme\Page_Builder\Modules\Listing\Listing $model */

$featured_media = get_post_meta( get_the_ID(), '_featured_media', true );

if ( ! empty( $featured_media ) ) :

	foreach ( $featured_media as $attachment_id ) :
		if ( get_post_type( $attachment_id ) !== 'attachment' || wp_attachment_is( 'audio', $attachment_id ) ) {
			continue;
		}

		ob_start();
		$model->post_info->show_post_image( $attachment_id );
		$media_html = trim( ob_get_clean() );

		if ( $media_html === '' ) {
			continue;
		}

		$media_type = wp_attachment_is_image( $attachment_id ) ? 'image' : 'video';

		?>
		<div class="listing-item-<?php echo esc_attr( $media_type ); ?>-wrapper<?php echo esc_attr( $model->post_info->image_as_background ? ' has-bg-image' : '' ); ?>">
			<?php
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML from the parent media renderer.
			echo $media_html;
			?>
		</div>
		<?php
	endforeach;

else :

	// Display placeholder if no featured media is available

	?>
	<div class="listing-item-image-wrapper listing-placeholder-image<?php echo esc_attr( $model->post_info->image_as_background ? ' has-bg-image' : '' ); ?>">
		<?php

		if ( ! empty( $model->post_info->thumbnail_placeholder ) && get_post_type( $model->post_info->thumbnail_placeholder ) === 'attachment'
			&& wp_attachment_is_image( $model->post_info->thumbnail_placeholder ) ) {
			$model->post_info->show_post_image( $model->post_info->thumbnail_placeholder );
		}

		?>
	</div>
	<?php

endif;