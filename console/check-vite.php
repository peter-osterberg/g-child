<?php

namespace GTheme_Child {
	/**
	 * Supply the test loader without booting WordPress or touching a database.
	 *
	 * @return object Test theme instance.
	 */
	function GTheme() { // phpcs:ignore WordPress.NamingConventions.ValidFunctionName
		return $GLOBALS['test_theme'];
	}
}

namespace {
	define( 'ABSPATH', __DIR__ . '/' );
	define( 'GTHEME_CHILD_DIR', dirname( __DIR__ ) );
	define( 'GTheme_Child\PREFIX', trim( file_get_contents( GTHEME_CHILD_DIR . '/prefix' ) ) );

	require GTHEME_CHILD_DIR . '/vendor/autoload.php';

	$parent_autoload = dirname( GTHEME_CHILD_DIR ) . '/generation-theme/vendor/autoload.php';

	if ( ! is_readable( $parent_autoload ) ) {
		echo "Vite PHP integration checks skipped: install the sibling generation-theme to run them.\n";

		return;
	}

	require $parent_autoload;

	$environment = 'production';
	$styles = [];
	$modules = [];
	$registered_styles = [];
	$registered_modules = [];
	$actions = [];
	$asset_hooks = [];
	$current_hook = '';

	/**
	 * Return the test environment.
	 *
	 * @return string Environment type.
	 */
	function wp_get_environment_type(): string {
		return $GLOBALS['environment'];
	}

	/**
	 * Match WordPress URL normalization.
	 *
	 * @param string $url URL.
	 * @return string URL without trailing slashes.
	 */
	function untrailingslashit( string $url ): string {
		return rtrim( $url, '/\\' );
	}

	/**
	 * Record styles queued by the loader and module controller.
	 *
	 * @param string $handle Style handle.
	 * @param string $url Asset URL.
	 * @param array $deps Style dependencies.
	 * @param mixed $version Cache version.
	 * @return void
	 */
	function wp_enqueue_style( string $handle, string $url, array $deps = [], $version = false ): void {
		$GLOBALS['styles'][ $handle ] = compact( 'url', 'deps', 'version' );
	}

	/**
	 * Record stylesheet registration inherited from G-Theme.
	 *
	 * @param string $handle Style handle.
	 * @param string $url Asset URL.
	 * @param array $deps Style dependencies.
	 * @param mixed $version Cache version.
	 * @return void
	 */
	function wp_register_style( string $handle, string $url, array $deps = [], $version = false ): void {
		$GLOBALS['registered_styles'][ $handle ] = compact( 'url', 'deps', 'version' );
	}

	/**
	 * Record module registration; classic script registration is unavailable.
	 *
	 * @param string $handle Module identifier.
	 * @param string $url Asset URL.
	 * @param array $deps Module dependencies.
	 * @param mixed $version Cache version.
	 * @return void
	 */
	function wp_register_script_module( string $handle, string $url, array $deps = [], $version = false ): void {
		$GLOBALS['registered_modules'][ $handle ] = compact( 'url', 'deps', 'version' );
	}

	/**
	 * Record modules; classic script enqueueing is deliberately unavailable.
	 *
	 * @param string $handle Module identifier.
	 * @param string $url Asset URL.
	 * @param array $deps Module dependencies.
	 * @param mixed $version Cache version.
	 * @return void
	 */
	function wp_enqueue_script_module( string $handle, string $url, array $deps = [], $version = false ): void {
		$GLOBALS['modules'][ $handle ] = compact( 'url', 'deps', 'version' );
	}

	/**
	 * Record the builder's asset hooks.
	 *
	 * @param string $hook Action name.
	 * @param mixed ...$args Action arguments.
	 * @return void
	 */
	function do_action( string $hook, ...$args ): void {
		$GLOBALS['actions'][] = $hook;
		$previous_hook = $GLOBALS['current_hook'];
		$GLOBALS['current_hook'] = $hook;

		if ( isset( $GLOBALS['asset_hooks'][ $hook ] ) ) {
			$GLOBALS['asset_hooks'][ $hook ]( ...$args );
		}

		$GLOBALS['current_hook'] = $previous_hook;
	}

	/**
	 * Return the active asset hook.
	 *
	 * @return string Hook name.
	 */
	function current_filter(): string {
		return $GLOBALS['current_hook'];
	}

	/**
	 * Fail the CLI check even when PHP assertions are disabled.
	 *
	 * @param bool $condition Required condition.
	 * @param string $message Failure description.
	 * @return void
	 */
	function check_vite( bool $condition, string $message ): void {
		if ( ! $condition ) {
			throw new \RuntimeException( $message );
		}
	}

	$directory = sys_get_temp_dir() . '/gchild-vite-' . bin2hex( random_bytes( 6 ) );
	mkdir( $directory );
	mkdir( $directory . '/dist' );
	$hot_file = $directory . '/vite.hot';
	$manifest = [
		'app.js'                     => [
			'file'    => 'assets/app-hash.js',
			'imports' => [ '_shared.js' ],
			'css'     => [ 'assets/app-hash.css' ],
		],
		'_shared.js'                 => [
			'file'    => 'assets/shared-hash.js',
			'imports' => [ 'app.js' ],
			'css'     => [ 'assets/shared-hash.css' ],
		],
		'resources/scss/editor.scss' => [ 'file' => 'assets/editor-hash.css' ],
	];

	foreach ( [ '', '-backend' ] as $suffix ) {
		$manifest[ 'inc/Modules/Button/resources/js/button' . $suffix . '.js' ] = [ 'file' => 'assets/button' . $suffix . '-hash.js' ];
		$manifest[ 'inc/Modules/Button/resources/scss/button' . $suffix . '.scss' ] = [ 'file' => 'assets/button' . $suffix . '-hash.css' ];
	}

	file_put_contents( $directory . '/dist/manifest.json', json_encode( $manifest ) );

	try {
		$loader = new \GTheme_Child\Utils\Asset_Loader( $directory . '/dist', 'https://example.test/theme/dist' );
		check_vite( $loader instanceof \GTheme\Utils\Asset_Loader, 'The Vite loader must extend G-Theme.' );

		foreach ( [ 'get_manifest', 'register_style' ] as $method ) {
			check_vite( ( new \ReflectionMethod( $loader, $method ) )->getDeclaringClass()->getName() === \GTheme\Utils\Asset_Loader::class, $method . ' must reuse the parent implementation.' );
		}

		foreach ( [ 'frontend.js', 'frontend.css', 'backend.js', 'backend.css' ] as $asset ) {
			check_vite( $loader->get_asset_url( '/builder-modules/gchild-button/' . $asset ) === null, 'Parent module setup must skip Mix output paths.' );
		}
		check_vite( ( new \ReflectionProperty( $loader, 'hmr_enabled' ) )->getValue( $loader ) === null, 'Parent module setup must not trigger Vite hot-file detection.' );

		check_vite( $loader->get_asset_url( 'app.js' ) === 'https://example.test/theme/dist/assets/app-hash.js', 'Without a hot file, assets must use the built manifest.' );
		check_vite( ! $loader->is_hmr_enabled(), 'Built mode must disable the inherited HMR state.' );
		check_vite( $loader->get_asset_url( 'missing.js' ) === null, 'Missing optional entries must be skipped.' );
		file_put_contents( $directory . '/dist/manifest.json', '{}' );
		check_vite( $loader->get_asset_url( 'app.js' ) === 'https://example.test/theme/dist/assets/app-hash.js', 'G-Theme must cache the manifest for the request.' );
		file_put_contents( $directory . '/dist/manifest.json', json_encode( $manifest ) );
		$loader->enqueue_script( 'app', 'app.js' );
		check_vite( count( $styles ) === 2, 'CSS from shared imports must load once, even with cycles.' );
		check_vite( $modules['app']['version'] === null && $modules['app']['deps'] === [], 'Hashed ES entries must not depend on webpack handles.' );
		check_vite( $loader->get_asset_url( 'resources/scss/editor.scss' ) === 'https://example.test/theme/dist/assets/editor-hash.css', 'Editor CSS must resolve without deployed sources.' );
		check_vite( $loader->enqueue_style( 'editor', 'resources/scss/editor.scss', [ 'g-theme' ] ), 'Built styles must use the inherited enqueue path.' );
		check_vite( $styles['editor']['deps'] === [ 'g-theme' ] && $styles['editor']['version'] === null, 'Inherited style enqueueing must preserve dependencies and hashed URLs.' );
		check_vite( $loader->register_style( 'editor', 'resources/scss/editor.scss', [ 'g-theme' ] ), 'Inherited stylesheet registration must resolve Vite entries.' );
		check_vite( $registered_styles['editor'] === $styles['editor'], 'Registered and enqueued styles must share the Vite URL and dependencies.' );
		check_vite( $loader->register_script( 'registered-app', 'app.js', [ 'shared' ] ), 'Vite scripts must register as modules.' );
		check_vite( $registered_modules['registered-app']['url'] === $modules['app']['url'] && $registered_modules['registered-app']['deps'] === [ 'shared' ], 'Module registration must preserve URLs and dependencies.' );
		$loader->enqueue_script( 'dependent-app', 'app.js', [ 'shared' ] );
		check_vite( $modules['dependent-app']['deps'] === [ 'shared' ], 'Enqueueing must preserve the parent dependency argument for script modules.' );
		check_vite( ! $loader->register_style( 'missing', 'missing.css' ) && ! $loader->register_script( 'missing', 'missing.js' ), 'Registration must skip missing optional entries.' );

		$button_handle = 'module-' . str_replace( '_', '-', \GTheme_Child\PREFIX . 'button' );
		$test_theme = (object) [ 'asset_loader' => $loader ];
		$module_assets = new \GTheme_Child\Customization\Modules();
		$asset_hooks = [
			'gt_module_enqueue_frontend_scripts' => [ $module_assets, 'enqueue_module_assets' ],
			'gt_module_enqueue_backend_scripts'  => [ $module_assets, 'enqueue_module_assets' ],
		];
		$module = new \GTheme_Child\Modules\Button\Button_Controller();
		check_vite( $module->get_asset_loader() === $loader, 'Child module controllers must select the child Vite loader.' );

		foreach ( [ 'setup_frontend_assets', 'setup_backend_assets', 'maybe_enqueue_frontend_assets', 'maybe_enqueue_backend_assets' ] as $method ) {
			check_vite( ( new \ReflectionMethod( $module, $method ) )->getDeclaringClass()->getName() === \GTheme\Page_Builder\Component\Component_Controller::class, 'Child modules must inherit the parent asset lifecycle.' );
		}

		$styles = [];
		$modules = [];
		$module->maybe_enqueue_frontend_assets();
		check_vite( $styles === [] && $modules === [], 'Unused modules must not enqueue frontend assets.' );
		$loaded = new \ReflectionProperty( $module, 'loaded_on_current_page' );
		$loaded->setValue( $module, true );
		$module->maybe_enqueue_frontend_assets();
		check_vite( isset( $styles[ $button_handle ], $modules[ $button_handle ] ), 'Rendered modules must load their CSS and ES entry.' );
		check_vite( $styles[ $button_handle ]['deps'] === [ 'g-theme-child' ], 'Module styles must follow the theme stylesheet.' );
		$module->maybe_enqueue_backend_assets();
		check_vite( isset( $styles[ $button_handle . '-backend' ], $modules[ $button_handle . '-backend' ] ), 'Backend CSS and JS must use their proper enqueue APIs.' );
		check_vite( in_array( 'gt_module_enqueue_frontend_scripts', $actions, true ) && in_array( 'gt_module_enqueue_backend_scripts', $actions, true ), 'Builder asset hooks must remain available.' );
		$styles = [];
		$modules = [];
		$module_assets->enqueue_module_assets( new \GTheme\Page_Builder\Modules\Text\Text_Controller() );
		check_vite( $styles === [] && $modules === [], 'Child Vite hooks must skip parent module sources.' );
		$selected_module = new class extends \GTheme_Child\Modules\Button\Button_Controller {
			/**
			 * Select a different loader to verify the asset hook respects the module.
			 *
			 * @return \GTheme_Child\Utils\Asset_Loader Module-specific test loader.
			 */
			public function get_asset_loader(): \GTheme_Child\Utils\Asset_Loader {
				return new \GTheme_Child\Utils\Asset_Loader( $GLOBALS['directory'] . '/dist', 'https://selected.example.test/dist' );
			}
		};
		$module_assets->enqueue_module_assets( $selected_module );
		check_vite( $styles[ $button_handle ]['url'] === 'https://selected.example.test/dist/assets/button-hash.css' && $modules[ $button_handle ]['url'] === 'https://selected.example.test/dist/assets/button-hash.js', 'Vite hooks must use the module-selected loader for both styles and scripts.' );

		echo "Vite module integration checks passed.\n";

		mkdir( $directory . '/resources' );
		mkdir( $directory . '/resources/js' );
		mkdir( $directory . '/resources/scss' );
		file_put_contents( $directory . '/resources/js/app.js', '' );
		file_put_contents( $directory . '/resources/scss/app.scss', '' );
		file_put_contents( $directory . '/resources/scss/editor.scss', '' );
		$lazy_loader = new \GTheme_Child\Utils\Asset_Loader( $directory . '/dist', 'https://example.test/theme/dist' );
		file_put_contents( $hot_file, "https://dev.example.test:8000/\n" );
		check_vite( $lazy_loader->is_hmr_enabled(), 'The hot file must be read on first use, not during construction.' );
		check_vite( ! $loader->is_hmr_enabled(), 'Disabled HMR must remain cached for the loader instance.' );

		foreach ( [ 'production', 'staging', 'local', 'development' ] as $environment ) {
			$loader = new \GTheme_Child\Utils\Asset_Loader( $directory . '/dist', 'https://example.test/theme/dist' );
			check_vite( $loader->is_hmr_enabled(), 'The inherited HMR API must recognize Vite hot files.' );
			check_vite( $loader->get_asset_url( 'resources/scss/editor.scss' ) === 'https://dev.example.test:8000/resources/scss/editor.scss?direct', 'The hot file must activate remote HMR without additional environment settings, as with Mix.' );
		}
		check_vite( $loader->get_asset_url( 'resources/js/missing.js' ) === null, 'Hot mode must skip nonexistent optional assets.' );
		$styles = [];
		$modules = [];
		$loader->enqueue_style( 'app', 'resources/scss/app.scss' );
		$loader->enqueue_script( 'app', 'resources/js/app.js' );
		check_vite( $styles === [] && isset( $modules['g-theme-child-vite-client'], $modules['app-style'], $modules['app'] ), 'Hot mode must load the client and CSS through native HMR.' );
		check_vite( ! str_contains( $modules['app-style']['url'], '?direct' ), 'HMR styles must be imported as modules.' );
		$loader->register_style( 'hot-editor', 'resources/scss/editor.scss' );
		$loader->register_script( 'hot-app', 'resources/js/app.js' );
		check_vite( $registered_styles['hot-editor']['url'] === 'https://dev.example.test:8000/resources/scss/editor.scss?direct', 'Inherited stylesheet registration must use direct CSS in hot mode.' );
		check_vite( $registered_modules['hot-app']['url'] === $modules['app']['url'], 'Registered hot scripts must use the same module URL as enqueued scripts.' );

		$environment = 'local';
		file_put_contents( $hot_file, 'http://localhost:5173' );
		check_vite( $loader->get_asset_url( 'resources/js/app.js' ) === 'https://dev.example.test:8000/resources/js/app.js', 'The active HMR URL must remain cached for the loader instance.' );
		$loader = new \GTheme_Child\Utils\Asset_Loader( $directory . '/dist', 'https://example.test/theme/dist' );
		check_vite( $loader->get_asset_url( 'resources/js/app.js' ) === 'http://localhost:5173/resources/js/app.js', 'Local development must also read the hot file.' );

		foreach ( [ '', 'not a URL', 'ftp://example.test' ] as $invalid_url ) {
			file_put_contents( $hot_file, $invalid_url );
			$loader = new \GTheme_Child\Utils\Asset_Loader( $directory . '/dist', 'https://example.test/theme/dist' );
			check_vite( ! $loader->is_hmr_enabled(), 'Invalid Vite hot files must leave inherited HMR disabled.' );
			check_vite( $loader->get_asset_url( 'app.js' ) === 'https://example.test/theme/dist/assets/app-hash.js', 'Invalid hot files must fall back to the manifest.' );
		}

		unlink( $hot_file );
		$environment = 'production';
		$loader = new \GTheme_Child\Utils\Asset_Loader( $directory . '/dist', 'https://example.test/theme/dist' );
		check_vite( $loader->get_asset_url( 'app.js' ) === 'https://example.test/theme/dist/assets/app-hash.js', 'Stopping hot mode must restore manifest loading.' );

		echo "Vite loader checks passed.\n";
	} finally {
		if ( is_file( $hot_file ) ) {
			unlink( $hot_file );
		}

		foreach ( glob( $directory . '/resources/*/*' ) as $file ) {
			unlink( $file );
		}

		foreach ( glob( $directory . '/resources/*', GLOB_ONLYDIR ) as $folder ) {
			rmdir( $folder );
		}

		if ( is_dir( $directory . '/resources' ) ) {
			rmdir( $directory . '/resources' );
		}

		unlink( $directory . '/dist/manifest.json' );
		rmdir( $directory . '/dist' );
		rmdir( $directory );
	}
}
