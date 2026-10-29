# Generation Theme Child

This repository is the child theme layer for the `generation-theme` WordPress parent theme. It is not a standalone theme framework. Page-builder APIs, helper functions, base module behavior, and icon rendering come from the parent theme. The child theme owns its Vite build and asset loader.

The documentation has been split into focused files under [`docs/`](./docs/README.md).

## Quick Start

Requirements:

- PHP with Composer support (CI validates PHP 8.2)
- WordPress 6.9+
- Node.js `v24.21.0` as defined in [`.nvmrc`](./.nvmrc)
- pnpm
- a local WordPress install with the parent `generation-theme`
- for `pnpm run hot`: local configuration described in [Build Pipeline](./docs/build-and-tooling/build-pipeline.md); HTTPS sites also require an HTTPS proxy

From the theme root:

```bash
composer install
source "$HOME/.nvm/nvm.sh"
nvm use || nvm install
pnpm install
pnpm run build
```

Or run the full local setup script:

```bash
pnpm run g-setup
```

That installs Composer dependencies, loads `nvm`, repairs local permissions with `fix-perms`, installs Node dependencies with pnpm, and runs a development build.

## Daily Workflow

- `pnpm run dev`: refresh SCSS intellisense maps, then run one development build
- `pnpm run watch`: refresh SCSS intellisense maps, then watch files
- `pnpm run hot`: refresh intellisense maps, then start the Vite development server
- `pnpm run lint:js`
- `pnpm run lint:scss`
- `pnpm run lint:php`
- `pnpm run check:assets`
- `pnpm run check:vite`: run [Vite integration checks](./docs/operations/quality-and-release.md#vite-integration-checks) after a production build
- `pnpm run fix-perms`: repair local `node_modules/`, `vendor/`, and PO merge-driver script permissions when the local environment needs `sftp` group access
- `php gchild`: open the interactive generator menu

For Figma token updates:

- `pnpm run setup-vars`: rebuild and merge Figma-derived token maps into `resources/scss/_1-lib/_tokens.scss`
- `pnpm run get-intell`: refresh intellisense helper files after token changes

PO merge setup:

- `.gitattributes` maps `languages/*.po` to the `merge-po-files` driver
- `composer install` and `composer update` now configure the local merge driver automatically in dev mode
- `./bin/install-po-merge-driver.sh`: rerun the setup manually if you need to refresh the local merge-driver config
- the `.po` merge driver requires gettext tools such as `msgcat`, `msgmerge`, `msguniq`, `msgattrib`, and `msggrep`

## Documentation Map

### Start Here

- [Docs Index](./docs/README.md)
- [Overview](./docs/getting-started/overview.md)
- [Setup And Commands](./docs/getting-started/setup-and-commands.md)

### Theme Systems

- [Runtime And Customizations](./docs/theme-systems/runtime-and-customizations.md)
- [Modules](./docs/theme-systems/modules.md)
- [Button Pattern](./docs/theme-systems/button-pattern.md)
- [Accessibility](./docs/theme-systems/accessibility.md)
- [JavaScript Architecture](./docs/theme-systems/javascript-architecture.md)
- [Reveal On Scroll](./docs/theme-systems/reveal-on-scroll.md)
- [Popover System](./docs/theme-systems/popover-system.md)

### Design System

- [SCSS And Tokens](./docs/design-system/scss-and-tokens.md)
- [Typography](./docs/design-system/typography.md)
- [Custom Media Reference](./docs/design-system/custom-media.md)
- [Font Loading](./docs/design-system/font-loading.md)
- [Color Theming Deep Dive](./docs/design-system/color-theming.md)
- [SCSS Functions Deep Dive](./docs/design-system/scss-functions.md)
- [SCSS Mixins Deep Dive](./docs/design-system/scss-mixins.md)
- [Button Mixins Deep Dive](./docs/design-system/button-mixins.md)

### Build And Tooling

- [Build Pipeline](./docs/build-and-tooling/build-pipeline.md)
- [PostCSS Pipeline Deep Dive](./docs/build-and-tooling/postcss-pipeline.md)
- [Asset Architecture](./docs/build-and-tooling/asset-architecture.md)
- [CLI And Generators](./docs/build-and-tooling/cli-and-generators.md)
- [AI Guidance And Skills](./docs/build-and-tooling/ai-guidance.md)

### Operations

- [Quality And Release](./docs/operations/quality-and-release.md)
- [WP Rocket](./docs/operations/wp-rocket.md)
- [Changelog](./CHANGELOG.md)

## Validation Status

The repository now has two GitHub Actions workflows:

- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml): asset check and build on push and pull request
- [`.github/workflows/create-dist-release.yml`](./.github/workflows/create-dist-release.yml): build and attach the deployable ZIP on GitHub release publish
