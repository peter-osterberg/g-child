<?php

namespace GTheme_Child\Utils;

use GTheme\Utils\Asset_Loader as Parent_Asset_Loader;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Resolve Vite entries and enqueue child-theme assets through WordPress.
 */
class Asset_Loader extends Parent_Asset_Loader {
	/**
	 * Configure the child theme's build directory.
	 *
	 * @param string $dir Build directory.
	 * @param string $dist_url Public build URL.
	 */
	public function __construct( private string $dir = '', private string $dist_url = '' ) {
		parent::__construct( $dir, $dist_url );
	}

	/**
	 * Read and cache Vite's hot-file state on first use.
	 *
	 * @return bool Whether Vite HMR is active.
	 */
	public function is_hmr_enabled(): bool {
		if ( $this->hmr_enabled !== null ) {
			return $this->hmr_enabled;
		}

		$this->hmr_enabled = false;
		$hot_file = dirname( $this->dir ) . '/vite.hot';

		if ( is_readable( $hot_file ) ) {
			$dev_url = trim( file_get_contents( $hot_file ) );

			if ( filter_var( $dev_url, FILTER_VALIDATE_URL ) && in_array( parse_url( $dev_url, PHP_URL_SCHEME ), [ 'http', 'https' ], true ) ) {
				$this->hmr_enabled = true;
				$this->hmr_url = untrailingslashit( $dev_url );
			}
		}

		return $this->hmr_enabled;
	}

	/**
	 * Resolve a source entry; editor styles require direct CSS responses in dev.
	 *
	 * @param string $asset_name Theme-relative source path.
	 * @return string|null Asset URL, or null when the entry does not exist.
	 */
	public function get_asset_url( string $asset_name ): ?string {
		// The parent controller probes Mix output paths when booting modules.
		if ( str_starts_with( $asset_name, '/builder-modules/' ) ) {
			return null;
		}

		if ( $this->is_hmr_enabled() ) {
			if ( ! is_file( dirname( $this->dir ) . '/' . $asset_name ) ) {
				return null;
			}

			$url = $this->hmr_url . '/' . $asset_name;

			if ( preg_match( '/\.(css|scss)$/', $asset_name ) ) {
				$url .= '?direct';
			}

			return $url;
		}

		$manifest = $this->get_manifest( $this->dir . '/manifest.json' );

		if ( empty( $manifest[ $asset_name ]['file'] ) ) {
			return null;
		}

		return $this->dist_url . '/' . $manifest[ $asset_name ]['file'];
	}

	/**
	 * Enqueue the Vite client once in development.
	 *
	 * @return void
	 */
	private function enqueue_dev_client(): void {
		wp_enqueue_script_module( 'g-theme-child-vite-client', $this->hmr_url . '/@vite/client', [], null );
	}

	/**
	 * Enqueue a standalone stylesheet, using native CSS HMR in development.
	 *
	 * @param string $handle WordPress style handle.
	 * @param string $asset_name Theme-relative CSS or SCSS source path.
	 * @param string[] $dependencies WordPress style dependencies.
	 * @return bool Whether the entry exists.
	 */
	public function enqueue_style( string $handle, string $asset_name, array $dependencies = [] ): bool {
		if ( ! $this->is_hmr_enabled() ) {
			return parent::enqueue_style( $handle, $asset_name, $dependencies );
		}

		if ( $this->get_asset_url( $asset_name ) === null ) {
			return false;
		}

		$this->enqueue_dev_client();
		wp_enqueue_script_module( $handle . '-style', $this->hmr_url . '/' . $asset_name, [], null );

		return true;
	}

	/**
	 * Collect CSS from an entry and its static imports without duplicates or cycles.
	 *
	 * @param string $entry Manifest entry key.
	 * @param array<string,bool> $seen Visited entries.
	 * @return string[] CSS files relative to dist.
	 */
	private function get_entry_css( string $entry, array &$seen ): array {
		$manifest = $this->get_manifest( $this->dir . '/manifest.json' );

		if ( isset( $seen[ $entry ] ) || ! isset( $manifest[ $entry ] ) ) {
			return [];
		}

		$seen[ $entry ] = true;
		$chunk = $manifest[ $entry ];
		$css = [];

		foreach ( $chunk['imports'] ?? [] as $import ) {
			$css = array_merge( $css, $this->get_entry_css( $import, $seen ) );
		}

		return array_unique( array_merge( $css, $chunk['css'] ?? [] ) );
	}

	/**
	 * Enqueue an ES entry and the CSS belonging to its static imports.
	 *
	 * @param string $handle WordPress module identifier.
	 * @param string $asset_name Theme-relative JavaScript source path.
	 * @param string[] $dependencies WordPress module dependencies.
	 * @return bool Whether the entry exists.
	 */
	public function enqueue_script( string $handle, string $asset_name, array $dependencies = [] ): bool {
		$url = $this->get_asset_url( $asset_name );

		if ( $url === null ) {
			return false;
		}

		if ( $this->is_hmr_enabled() ) {
			$this->enqueue_dev_client();
		} else {
			$seen = [];

			foreach ( $this->get_entry_css( $asset_name, $seen ) as $css ) {
				wp_enqueue_style( 'g-theme-child-css-' . md5( $css ), $this->dist_url . '/' . $css, [], null );
			}
		}

		wp_enqueue_script_module( $handle, $url, $dependencies, null );

		return true;
	}

	/**
	 * Register Vite JavaScript with WordPress's module API.
	 *
	 * @param string $handle WordPress module identifier.
	 * @param string $asset_name Theme-relative JavaScript source path.
	 * @param string[] $dependencies WordPress module dependencies.
	 * @return bool Whether the entry exists.
	 */
	public function register_script( string $handle, string $asset_name, array $dependencies = [] ): bool {
		$url = $this->get_asset_url( $asset_name );

		if ( $url === null ) {
			return false;
		}

		wp_register_script_module( $handle, $url, $dependencies, null );

		return true;
	}
}
