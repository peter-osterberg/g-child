<?php if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

/** @var \GTheme\Page_Builder\Modules\Listing\Listing $model */
/** @var string $current_url */

?>
<?php $model->do_action( 'search_filter_before_wrapper', $model ); ?>
<div class="listing-search-wrapper">
	<?php $model->do_action( 'search_filter_before_form', $model ); ?>
	<form class="listing-search-form" action="<?php echo esc_url( $current_url ); ?>" method="GET" role="search">
		<label for="listing-query-<?php echo esc_attr( $model->uid ); ?>" class="<?php echo $model->display_search_label ? '' : 'sr-only'; ?>"><?php echo esc_html( $model->search_label ); ?></label>
		<div class="search-input-wrapper">
			<input type="search" id="listing-query-<?php echo esc_attr( $model->uid ); ?>" name="query" placeholder="<?php echo esc_attr( $model->search_placeholder ); ?>" value="<?php echo esc_attr( $model->get_search_query() ); ?>">
		</div>
		<?php if ( $model->display_search_button ) : ?>
		<button class="listing-search-btn<?php echo $model->search_button_text ? '' : ' btn-icon-only'; ?>" type="submit"<?php gt_maybe_print_attribute( ! $model->search_button_text, 'aria-label', $model->search_label ); ?>>
			<?php echo esc_html( $model->search_button_text ); ?>
		</button>
		<?php endif; ?>
	</form>
	<?php $model->do_action( 'search_filter_after_form', $model ); ?>
</div>
<?php $model->do_action( 'search_filter_after_wrapper', $model ); ?>