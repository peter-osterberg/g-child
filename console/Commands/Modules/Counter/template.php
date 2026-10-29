<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/** @var GTheme_Child\Modules\Counter\Counter $model */


if ( $model->count_to ) : ?>
	<div class="counter-wrapper" role="region" aria-labelledby="counter-heading<?php echo esc_attr( '-' . $model->uid ); ?>">
		<span id="counter-heading<?php echo esc_attr( '-' . $model->uid ); ?>" class="counter-heading <?php echo 'h' . esc_attr( $model->heading_size_visual ); ?>">
			<?php if ( $model->prefix ) : ?>
				<span class="counter-prefix"><?php echo esc_html( $model->prefix ); ?></span>
			<?php endif; ?>

			<span class="counter-number" aria-live="polite"><?php echo esc_html( $model->counter_toggle ? $model->count_from : $model->count_to ); ?></span>

			<?php if ( $model->suffix ) : ?>
				<span class="counter-suffix"><?php echo esc_html( $model->suffix ); ?></span>
			<?php endif; ?>
		</span>
	</div>
<?php endif; ?>

<?php if ( $model->content ) : ?>
	<div class="counter-content">
		<?php echo wp_kses_post( $model->content ); ?>
	</div>
<?php endif; ?>
