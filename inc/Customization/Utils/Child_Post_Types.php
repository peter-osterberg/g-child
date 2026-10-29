<?php

namespace GTheme_Child\Customization\Utils;

use GTheme_Child\Traits\Singleton;

/**
 * Class to add post types to the theme
 */
class Child_Post_Types {
	use Singleton;

	private $post_types = null;

	/**
	 * Rewrite rules keyed by post type name.
	 *
	 * @var array<string,array>
	 */
	private static $post_type_rewrite_rules = [];

	// Constructor
	public function init() {
		$this->set_post_types();
		add_action( 'gt_register_post_type', [ $this, 'run' ] );
		$this->rewrite_post_type_rule_filters();
	}

	/**
	 * Runs the class to initialize the post types
	 *
	 * @return void
	 */
	public function run() {
		$this->register_post_types();
	}

	/**
	 * Runs the class to initialize the post types
	 *
	 * @return void
	 */
	public function rewrite_post_type_rule_filters() {
		$post_type_names = $this->get_post_type_names();

		if ( empty( $post_type_names ) ) {
			return;
		}

		foreach ( $post_type_names as $post_type_name ) {
			add_filter( $post_type_name . '_rewrite_rules', [ $this, 'store_post_type_rewrite' ] );
		}

		add_filter( 'rewrite_rules_array', [ $this, 'add_post_rewrite_rule' ] );
		add_filter( 'redirect_canonical', [ $this, 'allow_canonical_pagination' ] );
	}

	/**
	 * Allow pagination to take place on single pages
	 *
	 * @param string $redirect_url
	 * @return string|false
	 */
	public function allow_canonical_pagination( $redirect_url ) {
		$post_type = get_post_type();

		if (
			get_query_var( 'paged' ) > 1 &&
			$post_type &&
			in_array( $post_type, $this->get_post_type_names(), true ) &&
			is_singular( $post_type ) &&
			0 !== (int) get_query_var( 'post_count' )
		) {
			return false;
		}

		return $redirect_url;
	}

	/**
	 * Get the registered child post type names.
	 *
	 * @return string[]
	 */
	protected function get_post_type_names() {
		if ( empty( $this->post_types ) ) {
			return [];
		}

		$post_type_names = [];

		foreach ( $this->post_types as $post_type ) {
			if ( empty( $post_type['name'] ) ) {
				continue;
			}

			$post_type_names[] = (string) $post_type['name'];
		}

		return array_values( array_unique( $post_type_names ) );
	}

	/**
	 * Get the stored rewrite rules for each tracked post type after third-party filters have run.
	 *
	 * @return array
	 */
	protected function get_post_type_rewrite_rules() {
		$post_type_rules = [];

		foreach ( $this->get_post_type_names() as $post_type_name ) {
			remove_filter( $post_type_name . '_rewrite_rules', [ $this, 'store_post_type_rewrite' ] );

			$resolved_rules = apply_filters(
				$post_type_name . '_rewrite_rules',
				self::$post_type_rewrite_rules[ $post_type_name ] ?? []
			);

			add_filter( $post_type_name . '_rewrite_rules', [ $this, 'store_post_type_rewrite' ] );

			if ( empty( $resolved_rules ) || ! is_array( $resolved_rules ) ) {
				continue;
			}

			$post_type_rules = $post_type_rules + $resolved_rules;
		}

		return $post_type_rules;
	}

	/**
	 * Add the rewrite rules to the array. This is used to get the rules in the correct order
	 *
	 * @param array $page_rewrite
	 * @return array
	 */
	public function add_post_rewrite_rule( $page_rewrite ) {
		$post_type_rules = $this->get_post_type_rewrite_rules();

		if ( empty( $post_type_rules ) ) {
			return $page_rewrite;
		}

		$matched_rule = '';
		$index = 0;

		// Check for the pagination rewrite rule that has to come before our rule
		if ( ! empty( $page_rewrite ) ) {
			foreach ( $page_rewrite as $pattern => $rule ) {
				++$index;

				$query = str_replace( 'index.php?', '', $rule );
				$params = explode( '&', $query );

				if ( ! empty( $params ) && count( $params ) === 2 ) {
					$param_keys = [];

					foreach ( $params as $param ) {
						$param_keys[] = explode( '=', $param )[0];
					}

					// With only these as a match, we know it's the rule
					if ( empty( array_diff( [ 'pagename', 'paged' ], $param_keys ) ) ) {
						$matched_rule = $pattern;
						break;
					}
				}
			}
		}

		// A matched rule means that we can insert our rule in the middle
		if ( ! empty( $matched_rule ) ) {
			$page_rewrite = array_slice( $page_rewrite, 0, $index, true ) +
			$post_type_rules +
			array_slice( $page_rewrite, $index, count( $page_rewrite ) - $index, true );
		} else {
			// Our pagination rules wasn't found, prepend it to the top
			$page_rewrite = $post_type_rules + $page_rewrite;
		}

		return $page_rewrite;
	}

	/**
	 * Store the rewrite rules for this post type for later use
	 *
	 * @param array $rewrite_rules
	 * @return array
	 */
	public function store_post_type_rewrite( $rewrite_rules ) {
		$current_filter = current_filter();
		$post_type_name = preg_replace( '/_rewrite_rules$/', '', (string) $current_filter );

		if ( ! empty( $post_type_name ) && ! empty( $rewrite_rules ) ) {
			self::$post_type_rewrite_rules[ $post_type_name ] = $rewrite_rules;
		}

		return [];
	}

	// Methods
	protected function set_post_types() {
		$this->post_types = [
			/* This is where your post-type is added */
			/* POST_TYPE */
		];
	}

	protected function register_post_types() {
		foreach ( $this->post_types as $post_type ) {
			$this->new_child_post_type( $post_type );
		}
	}

	protected function new_child_post_type( array $new_post_type ) {
		gt_add_post_type(
			$new_post_type['name'], // Name of the post type in database (ID / Name)
			$new_post_type['slug'], // Slug of the post type which will be prepended in the URL
			$new_post_type['singular'], // Singular name
			$new_post_type['plural'], // Plural name
			$new_post_type['options'], // Options
		);
	}
}
