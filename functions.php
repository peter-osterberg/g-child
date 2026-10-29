<?php

namespace GTheme_Child;

use GTheme_Child\Utils\Asset_Loader;
use GTheme_Child\Customization\Admin;
use GTheme_Child\Customization\Child_Functions;
use GTheme_Child\Customization\Gravityforms;
use GTheme_Child\Customization\Modules;
use GTheme_Child\Customization\Style_Options;
use GTheme_Child\Customization\Templates;
use GTheme_Child\Customization\Utils\Child_Post_Types;
use GTheme_Child\Customization\Utils\Child_Taxonomies;
use GTheme_Child\Customization\Utils\Child_Metaboxes;

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

if ( ! defined( 'GTHEME_CHILD_DIR' ) ) {
	define( 'GTHEME_CHILD_DIR', __DIR__ );
}

if ( ! defined( 'GTHEME_CHILD_FILE' ) ) {
	define( 'GTHEME_CHILD_FILE', __DIR__ );
}

if ( ! defined( __NAMESPACE__ . '\PREFIX' ) ) {
	$file = __DIR__ . '/prefix';

	if ( file_exists( $file ) ) {
		define( __NAMESPACE__ . '\PREFIX', trim( file_get_contents( $file ) ) );
	}
}

if ( ! class_exists( 'GTheme_Child\\Theme' ) ) :


	/**
	 * Class to capsulate functions
	 */
	class Theme {

		/**
		 * @var string
		 */
		const THEME_NAME = 'g-theme-child';

		/**
		 * @var string
		 *
		 */
		const VERSION = '1.0.0';

		/**
		 * The single instance of the class.
		 *
		 * @var object
		 */
		protected static $instance = null;

		/**
		 * Asset loader
		 *
		 * @var \GTheme_Child\Utils\Asset_Loader
		 */
		public $asset_loader = null;

		/**
		 * Class for translations
		 *
		 * @var I18n
		 */
		public $i18n;

		/**
		 * Class for scripts
		 *
		 * @var Scripts
		 */
		public $scripts;

		/**
		 * Class for shortcodes
		 *
		 * @var Shortcodes
		 */
		public $shortcodes;

		/**
		 * Class for style options
		 *
		 * @var Style_Options
		 */
		public $style_options;

		/**
		 * Class for modules
		 *
		 * @var Modules
		 */
		public $modules;

		/**
		 * Class for templates
		 *
		 * @var Templates
		 */
		public $templates;

		/**
		 * Class for admin functions
		 *
		 * @var Admin
		 */
		public $admin;

		/**
		 * Class for child theme functions
		 *
		 * @var Child_Functions
		 */
		public $child_functions;

		/**
		 * Class for child post types
		 *
		 * @var Child_Post_Types
		 */
		public $child_post_types;

		/**
		 * Class for child taxonomies
		 *
		 * @var Child_Taxonomies
		 */
		public $child_taxonomies;

		/**
		 * Class for child metaboxes
		 *
		 * @var Child_Metaboxes
		 */
		public $child_metaboxes;

		/**
		 * Class for handling gravityforms customizations
		 *
		 * @var Gravityforms
		 */
		public $gravityforms;

		/**
		 * Classes to be loaded
		 */
		const CLASSES = [
			'i18n'             => I18n::class,
			'scripts'          => Scripts::class,
			'shortcodes'       => Shortcodes::class,
			'style_options'    => Style_Options::class,
			'modules'          => Modules::class,
			'templates'        => Templates::class,
			'admin'            => Admin::class,
			'gravityforms'     => Gravityforms::class,
			'child_functions'  => Child_Functions::class,
			'child_post_types' => Child_Post_Types::class,
			'child_taxonomies' => Child_Taxonomies::class,
			'child_metaboxes'  => Child_Metaboxes::class,
		];

		/**
		 * Get class instance.
		 *
		 * @return static Instance.
		 */
		public final static function get_instance() {
			if ( static::$instance === null ) {
				static::$instance = new static();
			}

			return static::$instance;
		}

		/**
		 * Generation_Theme_Child constructor
		 *
		 * @return void
		 */
		public function __construct() {
			$this->load_dependencies();
			$this->init_classes();
		}

		/**
		 * Load dependencies
		 *
		 * @return void
		 */
		public function load_dependencies() {
			require_once __DIR__ . '/vendor/autoload.php';
		}

		/**
		 * Init theme classes
		 *
		 * @return void
		 */
		public function init_classes() {
			// Load base classes
			foreach ( static::CLASSES as $var_name => $class_name ) {
				$this->{$var_name} = $class_name::get_instance();
			}
		}

		/**
		 * Load dependencies and init all modules
		 *
		 * @return void
		 */
		public function run() {
			add_action( 'init', [ $this, 'setup_asset_loader' ], 1 );

			$class_vars = array_keys( static::CLASSES );

			foreach ( $class_vars as $var_name ) {
				$this->{$var_name}->init();
			}
		}

		/**
		 * Setup the child-owned Vite asset loader before modules boot
		 *
		 * @return void
		 */
		public function setup_asset_loader() {
			$this->asset_loader = new Asset_Loader( GTHEME_CHILD_DIR . '/dist', get_stylesheet_directory_uri() . '/dist' );
		}
	}

	/**
	 * Wrapper for getting the theme instance
	 *
	 * @return Theme
	 */
	function GTheme() { // phpcs:ignore
		return Theme::get_instance();
	}

	GTheme()->run();

endif;
