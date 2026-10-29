<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/** @var GTheme_Child\Modules\Expand\Expand $model */


$modules = $model->modules_to_expand;
$title_id = null;

if ( $model->title ) :
	// Generate unique IDs for the title and content regions.
	$title_id   = 'expand-title-' . esc_attr( $model->uid );
	$content_id = 'expand-content-' . esc_attr( $model->uid );
	?>
	<div class="expand-title">
		<<?php echo esc_attr( $model->heading_size_real ); ?> id="<?php echo esc_attr( $title_id ); ?>" class="<?php echo esc_attr( $model->heading_size_visual ); ?>">
			<?php echo esc_html( $model->title ); ?>
		</<?php echo esc_attr( $model->heading_size_real ); ?>>
	</div>
<?php else : ?>
	<?php $content_id = 'expand-content-' . esc_attr( $model->uid ); // Ensure content_id is still defined ?>
<?php endif; ?>

<div inert id="<?php echo esc_attr( $content_id ); ?>" class="expand-content truncate-rows fade-line" role="region"
	<?php echo $title_id ? 'aria-labelledby="' . esc_attr( $title_id ) . '"' : ''; ?>
	style="<?php echo $model->rows_to_show ? '--rows-to-show:' . esc_attr( $model->rows_to_show ) . ';' : ''; ?>
	<?php echo $model->rows_to_fade ? ' --rows-to-fade:' . esc_attr( $model->rows_to_fade ) . ';' : ''; ?>">

	<div class="expand-content-inner">
		<?php echo wp_kses_post( $model->content ); ?>
	</div>
</div>

<?php if ( ! empty( $model->rows_to_show ) ) : ?>
	<button class="btn btn-primary expand-toggle" aria-controls="<?php echo esc_attr( $content_id ); ?>" aria-expanded="false">
		<span class="open-label"><?php echo esc_html( $model->open ); ?></span>
		<span class="close-label"><?php echo esc_html( $model->close ); ?></span>
	</button>
<?php endif; ?>
