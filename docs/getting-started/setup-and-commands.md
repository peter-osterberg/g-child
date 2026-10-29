# Setup And Commands

## Requirements

- PHP with Composer support (CI validates PHP 8.2)
- WordPress 6.9+
- Node.js `v24.21.0` as defined in [`.nvmrc`](../../.nvmrc)
- pnpm
- a local WordPress install with the parent `generation-theme`
- for remote `pnpm run hot`: WP-CLI and the existing HTTPS/WebSocket proxy used by the former Mix setup; local hot mode falls back to Vite's native server when WP-CLI cannot read the site URL

## First-Time Setup

From the theme root:

```bash
composer install
source "$HOME/.nvm/nvm.sh"
nvm use || nvm install
pnpm install
pnpm run build
```

PO merge setup for this clone:

```bash
./bin/install-po-merge-driver.sh
```

`composer install` and `composer update` already run that setup automatically in dev mode. Run it manually if you need to refresh the local config.

That setup enables the local `merge-po-files` driver used by [`.gitattributes`](../../.gitattributes) for `languages/*.po`.

The PO merge driver requires gettext commands such as `msgcat`, `msgmerge`, `msguniq`, `msgattrib`, and `msggrep`.

There is also a convenience script for the full local setup flow:

```bash
pnpm run g-setup
```

That script runs the equivalent of:

```bash
composer install
. "$HOME/.nvm/nvm.sh"
nvm use || nvm install
pnpm run fix-perms
pnpm install
pnpm run dev
```

It installs Composer dependencies, loads `nvm`, switches to the project Node version or installs it, repairs local permissions, installs Node dependencies with pnpm, and runs a development build.

### Permission Repair

If local file permissions get out of sync after dependency installs or shared-environment access, run:

```bash
pnpm run fix-perms
```

This script uses `sudo` to set `bin/install-po-merge-driver.sh` to the current user with the `sftp` group, grants group read, write, and execute permissions on `node_modules/` and `vendor/`, then sets `node_modules/` to the current user with the `sftp` group.

## Daily Commands

### Build And Watch

- `pnpm run dev`: generate intellisense maps, then build once
- `pnpm run watch`: generate intellisense maps, then watch files
- `pnpm run hot`: generate intellisense maps, then start Vite
- `pnpm run build`: production build with hashed assets and a Vite manifest

Hot mode automatically reads the WordPress URL and uses the former Mix port convention: an available listener at `18000–18020`, exposed through HTTPS/WSS at the same hostname on internal port minus `10000`. When WP-CLI cannot read the URL, Vite starts its native local HTTP/WebSocket server instead. The plugin writes the actual URL to `vite.hot` to activate the child loader. No `.env.local` or PHP environment constant is needed. See [Build Pipeline](../build-and-tooling/build-pipeline.md#hot-mode).

`pnpm run watch` can also hit OS watcher limits in restrictive environments. If you see `EMFILE: too many open files, watch`, raise the local watcher or file-descriptor limit and retry.

### Token And Utility Generation

- `pnpm run setup-vars`: run the Figma build-and-merge sequence
- `pnpm run get-vars`: build `resources/lib/figma/figma-output.scss` from Figma JSON
- `pnpm run set-vars`: merge generated Figma maps/lists into `resources/scss/_1-lib/_tokens.scss`
- `pnpm run get-intell`: extract SCSS maps into intellisense helper files

`pnpm run setup-vars` only runs the build and merge steps. If token maps changed, run `pnpm run get-intell` afterwards to refresh the editor helper files. `pnpm run dev` and `pnpm run watch` already do that before invoking Vite.

### Quality Checks

- `pnpm run lint:js`
- `pnpm run lint:scss`
- `pnpm run lint:php`
- `pnpm run check:assets`
- `pnpm run check:vite`: run [Vite integration checks](../operations/quality-and-release.md#vite-integration-checks) after a production build

`pnpm run check:assets` validates the active `resources/` trees and module template assets under `inc/Modules/`, `console/Commands/Modules/`, and `console/Commands/Dummy/`.

It fails on repo-wide hygiene issues such as `.DS_Store` files under `resources/`, scratch-copy filenames containing `copy` in the active JS or SCSS trees, archived-tree references from active source files, and module asset naming mismatches.

`pnpm run lint:js` currently reports warnings without failing on warnings because the script does not pass `--max-warnings 0`. `pnpm run check:assets` and `pnpm run lint:php` both scan repo-wide paths rather than only your diff.

### CLI

- `php gchild`: open the interactive `manage` menu for generators

The entrypoint is configured to force the `manage` command as the default command, so the menu is the normal interface for this CLI.

## Key Files To Know Early

- [`functions.php`](../../functions.php): child-theme bootstrap and singleton registry
- [`inc/Scripts.php`](../../inc/Scripts.php): runtime asset enqueue rules
- [`inc/Customization/Modules.php`](../../inc/Customization/Modules.php): live module registration
- [`inc/Modules/Button/`](../../inc/Modules/Button): current reference example of a live child-theme module
- [`resources/js/app.js`](../../resources/js/app.js): frontend bootstrap
- [`resources/scss/app.scss`](../../resources/scss/app.scss): main stylesheet entry and layer assembly
- [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss): token source of truth
- [`vite.config.mjs`](../../vite.config.mjs): build system
- [`postcss.config.js`](../../postcss.config.js): CSS transformation pipeline
- [`console/check-assets.js`](../../console/check-assets.js): asset hygiene rules
- [`console/`](../../console): generators and token tooling
- [`gchild`](../../gchild): CLI entrypoint
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml): push and pull request validation
- [`.github/workflows/create-dist-release.yml`](../../.github/workflows/create-dist-release.yml): deployable ZIP workflow
