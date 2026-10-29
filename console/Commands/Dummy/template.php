<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/** @var \GTheme_Child\Modules\Dummy\Dummy $model */


if ( $model->content ) : ?>
	<div>
		<?php echo wp_kses_post( $model->content ); ?>
	</div>
<?php endif; ?>
