# Asset Architecture

## JS Source Tree

- `resources/js/app.js`: main frontend bootstrap entry
- `resources/js/navigation/`: shared navigation package and its public barrel
- `resources/js/header/`: header-specific behaviors
- `resources/js/listing/`: listing-specific behaviors
- `resources/js/lib/`: reusable primitives and helpers
- `resources/js/integrations/`: WordPress and plugin glue code
- `resources/js/site-config.js`: site-level selectors and option overrides for the reusable JS packages
- `resources/js/dev-tools/`: development-only entry files merged into the non-production app bundle
- `resources/lib/`: generated Figma and intellisense support assets, not runtime frontend source

## JS Rules

- Use lowercase kebab-case for filenames and folders.
- Keep `index.js` only for package barrels such as `navigation/` and `lib/popover/`.
- `app.js` may import anything.
- `navigation/`, `header/`, and `listing/` may import from `lib/`.
- `integrations/` may import from `lib/` and feature areas only when necessary.
- `lib/` must not import from `navigation/`, `header/`, `listing/`, or `integrations/`.

## SCSS Rules

- Active SCSS source stays under `resources/scss/`.
- Only compiled entry files stay non-partials: `app.scss`, `editor.scss`, and `editor-admin.scss`.

## Module Asset Contract

- Live module assets live beside the module PHP under `inc/Modules/<ModuleName>/resources/`.
- Module JS: `inc/Modules/<ModuleName>/resources/js/<module-kebab>.js`
- Module SCSS: `inc/Modules/<ModuleName>/resources/scss/<module-kebab>.scss`
- Optional backend variants: `inc/Modules/<ModuleName>/resources/js/<module-kebab>-backend.js` and `inc/Modules/<ModuleName>/resources/scss/<module-kebab>-backend.scss`
- The same naming contract is mirrored by the insertable module templates under `console/Commands/Modules/` and `console/Commands/Dummy/`.
- Asset filenames must match the module folder name converted to kebab-case.

## Validation

Run `pnpm run check:assets` to catch:

- `.DS_Store` files anywhere under `resources/`
- active JS or SCSS filenames containing `copy`
- active JS or SCSS references to archived source trees
- `copy` files left in archived source trees
- module asset naming mismatches under `inc/Modules/`, `console/Commands/Modules/`, and `console/Commands/Dummy/`
