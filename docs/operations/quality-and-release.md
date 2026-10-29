# Quality And Release

## Quality Rules And Conventions

### JavaScript

- linted by ESLint flat config
- browser and Node globals are both enabled
- JSDoc is expected for classes and functions
- source ignores include `dist/` and `vendor/`
- the current `pnpm run lint:js` script fails on ESLint errors, but warning-only runs still exit successfully

### SCSS

- linted by Stylelint with SCSS syntax and Recess ordering
- custom ordering rules enforce structure for declarations, variants, nested selectors, and media or container blocks

### PHP

- PHPCS is configured with WordPress-oriented rules and a custom ruleset in [`phpcs.xml`](../../phpcs.xml)
- `vendor/`, `node_modules/`, and `languages/` are excluded

### Asset Checks

`pnpm run check:assets` fails on:

- `.DS_Store` files under `resources/`
- scratch files named like `*copy*` in the active JS tree
- active references to archived source trees
- scratch files named like `*copy*` in the active SCSS tree
- `*copy*` files left in archived source trees
- module resource files that do not follow the naming contract in `inc/Modules/`, `console/Commands/Modules/`, and `console/Commands/Dummy/`

This is a repo-wide hygiene check, not a diff-only check. Existing stray files in those locations will fail the script even if your own change is unrelated.

### Vite Integration Checks

`pnpm run check:vite` runs four regression checks for the child theme's WordPress integration. A successful Vite build confirms that assets compile; these checks also catch broken PHP asset loading, missing font files, incorrect HMR settings, and the font-subset watch loop returning after a change or dependency update.

| Script                                                                   | What it checks                                                                                                                                                                                                                                                         | Why it exists                                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`console/check-vite.php`](../../console/check-vite.php)                 | Manifest URL resolution, CSS from shared imports without duplication or recursion loops, ES module enqueueing, editor CSS, switching between hot-file URLs and built assets, and builder module enqueueing. Requires the installed sibling parent theme. | The custom PHP loader and module integration must load the correct assets in WordPress; Vite cannot verify that PHP behavior.                               |
| [`console/check-vite-server.mjs`](../../console/check-vite-server.mjs)   | Simulated WP-CLI discovery, the internal/public proxy port mapping, occupied ports, optional overrides, local fallback when WP-CLI fails, hot-file URLs, CORS, and generated WebSocket client settings.                                                                | Protects the automatic local and remote configuration from returning the wrong URL or port, or failing to start locally.                                    |
| [`console/check-font-subsets.mjs`](../../console/check-font-subsets.mjs) | Repeated subset generation preserves the URL and file timestamp; incomplete cached files are repaired; changed glyphs produce a new hash; source fonts remain tracked as dependencies.                                                                                 | Rewriting an unchanged font dependency caused endless watch rebuilds. This check catches that regression and incomplete font files from interrupted writes. |
| [`console/check-vite-build.mjs`](../../console/check-vite-build.mjs)     | Required manifest entries, emitted files and imports, CSS asset URLs, WOFF2 headers, icon subset references, absence of old Webpack output, and exclusion of debug tools from production.                                                                              | A build can succeed while deployed fonts or asset references are broken, or development tools remain in production.                                         |

Run the checks after changing build configuration, the asset loader, font processing, or dependencies. With the project's Node and Composer dependencies installed, run:

```sh
pnpm run build
pnpm run check:vite
```

The command runs the scripts in the table's order and stops with a nonzero exit code on the first failure. The build check reads the existing `dist/` output; it does not build assets itself. To check a development build instead, run:

```sh
pnpm run dev
node console/check-vite-build.mjs --development
```

The other checks use temporary fixtures. The server check briefly starts local listeners, then closes them and removes its temporary files. The PHP check does not boot WordPress or access its database. It uses the installed sibling parent theme and reports the PHP integration checks as skipped when that theme is unavailable.

These scripts run only when requested or invoked by CI. They add no runtime cost to the site and are excluded from the release ZIP with `console/`. They do not replace browser testing or verify a deployed remote HTTPS/WebSocket proxy, certificate trust, or actual page refresh behavior.

## Continuous Validation

The GitHub Actions workflow [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on push and pull request.

It currently runs:

1. Composer install
2. pnpm install
3. `pnpm run check:assets`
4. `pnpm run build`
5. `pnpm run check:vite`

The [Vite integration checks](#vite-integration-checks) run after the production build so CI can reject broken font output or HMR configuration before merging. PHP loader and module integration checks require a sibling parent-theme checkout; standalone CI skips those PHP checks when the parent theme is unavailable.

That means the repo’s basic asset and build gates now run before release packaging, not only at release time.

## Release Packaging

The GitHub Actions workflow [`.github/workflows/create-dist-release.yml`](../../.github/workflows/create-dist-release.yml) builds a deployable ZIP when a GitHub release is published.

The current workflow does this:

1. checks out the repo
2. installs Composer dependencies without dev packages
3. installs Node dependencies
4. runs a production build
5. stages a release tree by excluding development-only files and folders
6. zips the remaining theme into a release asset

### Packaging Direction

An allowlist-based release ZIP would be safer long-term than copying the whole repo and deleting a growing denylist.

The runtime artifact for this theme mainly needs:

- `style.css`
- `functions.php`
- `prefix`
- `inc/`
- `languages/`
- `dist/`
- `vendor/`

That means these source-only or workspace-only paths should stay out of the deployment ZIP:

- `resources/`
- `console/`
- `.github/`
- `.ai/`
- `docs/`
- `postcss-plugins/`
- `.agents/`
- `.claude/`
- `.codex/`
- `.cursor/`
- `.gemini/`
- `.vscode/`
- `.mcp.json`
- `node_modules/`
- the CLI entrypoint `gchild`
- repo docs and metadata such as `README.md`, `AGENTS.md`, `CHANGELOG.md`, and workspace files

`page-builder/` currently only contains a placeholder `index.php`, so it can also be excluded unless that folder gains real runtime content later.

### Implication

- the release ZIP is meant to be a deployment artifact
- it deliberately removes source directories such as `resources/`, `console/`, `.github/`, the CLI entrypoint, and the root `README.md`

So this repository is the source of truth for developers, while the generated release ZIP is the source of truth for deployment.

## Practical Development Notes

- treat `dist/` as generated runtime output, not primary source
- treat `resources/` and `inc/` as the real source trees
- when adding a builder module, keep PHP class names, folder names, and resource filenames aligned
- when changing design tokens, decide whether the change belongs in curated SCSS or should come from the Figma pipeline
- if a change relies on a `gt_*` hook or helper that you cannot find in this repo, inspect the parent `generation-theme`
- if CLI generators are part of your workflow, preserve their marker comments
