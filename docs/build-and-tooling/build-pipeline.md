# Build Pipeline

The build is configured in [`vite.config.mjs`](../../vite.config.mjs). Vite handles Sass, PostCSS, asset URLs, content hashes, shared JavaScript chunks, and hot updates. WordPress renders the HTML and decides which entries to load.

## Entries And Output

The standard entries are:

- `resources/js/app.js`
- `resources/scss/app.scss`
- `resources/scss/editor.scss`
- `resources/scss/editor-admin.scss`
- `resources/fonts/fonts.css`

The config also discovers frontend/backend JS and SCSS following the existing asset contract under `inc/Modules/`. Module filenames still match their folder name converted to lowercase kebab-case, with optional `-backend` suffixes.

Vite emits hashed files under `dist/assets/` and a standard `dist/manifest.json`, keyed by source paths. Do not assume output filenames or directory names in PHP. The child [`inc/Utils/Asset_Loader.php`](../../inc/Utils/Asset_Loader.php) extends `GTheme\Utils\Asset_Loader`, reusing its manifest cache, HMR state, stylesheet registration, and production stylesheet enqueueing. Its overrides resolve Vite source entries, load ES modules and their imported CSS, and enable native CSS HMR. Shared JS chunks load through native ES imports; there are no child webpack runtime or vendor handles.

Child modules extend G-Theme's `Module_Controller` directly and return the child Vite loader from `get_asset_loader()`. [`inc/Customization/Modules.php`](../../inc/Customization/Modules.php) uses each module's selected loader in the parent's frontend/backend asset hooks. The parent handles conditional loading and the builder lifecycle. Backend CSS uses the style API and scripts use WordPress script modules. The parent theme continues to load its own assets separately.

Production requires WordPress 6.9+ for frontend and admin script modules. CI validates PHP 8.2.

## Commands

- `pnpm run dev`: regenerate intellisense maps, then write an unminified development build with source maps.
- `pnpm run watch`: the same build, watching existing entries for changes.
- `pnpm run hot`: regenerate maps and run the Vite development server.
- `pnpm run build`: clean production build with hashed assets and no debug tools.
- `pnpm run check:vite`: run the [Vite integration checks](../operations/quality-and-release.md#vite-integration-checks) for built assets, the PHP loader, HMR configuration, and font-subset watch behavior.

Restart `watch` or `hot` after adding a module entry: filesystem entry discovery runs when the configuration loads. `watch` writes to disk and does not reload the browser automatically.

The app imports the debug tool behind `import.meta.env.DEV`. JSON uses a native import. The unused intellisense CSS copy-back step has been removed; `get-intell` still generates maps used by the debug tool and editor integrations.

## Fonts And Images

`fonts.css` is a CSS entry. Vite follows its `url()` references, emits the font files, and rewrites the URLs in development and production.

The Font Awesome PostCSS plugin retains glyph resolution and subsetting. It writes content-addressed subsets to ignored `.vite-fonts/` and emits CSS URLs relative to each source entry. Unchanged subsets are not rewritten: changing a watched font's timestamp would trigger another build. Incomplete cached files from interrupted builds are regenerated. Vite handles the resulting font assets; no bundler-specific asset messages or output-directory heuristics are needed.

Import images from JS or reference them in CSS to include them in the build. Files needing stable names, including assets referenced directly from PHP, belong under `public/`; Vite serves and copies those files unchanged. There is no automatic copy of unreferenced `resources/img/` files. PHP URLs for public assets should use the theme's `dist/` URL in production and the dev-server URL in hot mode.

Production uses a relative base so CSS and chunk URLs work when the theme directory or WordPress content URL changes. Vite uses `sass-embedded` to compile SCSS before the PostCSS pipeline. Vite handles file watching; pnpm excludes Sass's optional `@parcel/watcher` dependency. JS uses Vite's default browser target; the former Babel usage-based polyfill injection has been removed. If older-browser support becomes a requirement, define that policy before adding legacy tooling.

## Hot Mode

Run `pnpm run hot` without `.env.local` or a PHP environment constant. As with the former Mix setup, successful WP-CLI discovery enables the existing trusted HTTPS proxy; unavailable or failing WP-CLI falls back to a local dev server.

The local fallback uses Vite's native HTTP/WebSocket server on `127.0.0.1`, starting at port `5173` and choosing another port if it is occupied. The Laravel plugin writes the actual URL to `vite.hot` and allows local `.test` WordPress origins through its default CORS settings. No hostname discovery or proxy is needed for this local setup.

Hot mode reads `wp option get siteurl`, derives its hostname, and selects a free internal HTTP port from `18000` through `18020`. It advertises `https://<hostname>:<internal-port - 10000>` for assets and WSS. The proxy mapping is unchanged. Ports are probed with Node's native networking API; `lsof` is no longer needed. Vite uses `strictPort` so it cannot silently change the selected port without updating the public proxy URL. Builds and disk watch mode do not invoke WP-CLI or probe ports.

`laravel-vite-plugin` writes the public URL to the theme's ignored `vite.hot` file when Vite starts and removes it on normal shutdown. Like the former parent loader, the child loader treats this file as the explicit hot-mode switch, regardless of WordPress environment type. Without it, the loader uses the built manifest. The release workflow excludes the file. If Vite is forcibly killed and leaves it behind, remove `vite.hot` before using disk builds or deploying.

For another setup, [`.env.example`](../../.env.example) documents optional overrides: `WP_SITE_URL` replaces WP-CLI URL discovery, `VITE_PORT` fixes the internal listener, and `VITE_DEV_SERVER_URL` replaces the public origin. For direct local HTTP without the HTTPS proxy, set all three to your local WordPress URL, `5173`, and `http://localhost:5173` respectively. With an explicit public URL and no port override, the listener defaults to `5173`.

The plugin's Herd/Valet TLS detection is disabled because TLS is terminated by the proxy. `APP_URL` in the plugin's startup output reflects the discovered WordPress origin; `undefined` in local fallback mode is informational and does not prevent HMR.

The plugin refreshes the browser when root PHP files, `inc/**/*.php`, or `page-builder/**/*.php` change. CSS and JavaScript continue to use Vite's native HMR.

The loader enqueues `@vite/client` once and imports normal styles as modules for native CSS HMR. Editor stylesheet URLs use `?direct` to return real CSS; editor iframes may need a refresh after stylesheet changes.

## Release Checks

Run `pnpm run check:assets`, `pnpm run build`, and `pnpm run check:vite`. The release ZIP includes `dist/manifest.json`, all emitted assets, runtime PHP, and Composer autoloading. It excludes source assets, `.vite-fonts/`, `vite.hot`, local env configuration, and build tooling. Deploy the manifest and assets together, then clear page and WP Rocket caches.
