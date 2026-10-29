# Modules

## Live Modules

The live child-theme modules are under [`inc/Modules/`](../../inc/Modules/).

Current live module:

- `Button`

## Library Modules

The CLI ships with insertable module templates under [`console/Commands/Modules/`](../../console/Commands/Modules/).

Current library modules:

- `Counter`
- `Expand`

These library modules are not active until copied into `inc/Modules/` and registered.

## Module Anatomy

A typical module folder contains:

```text
inc/Modules/Example/
├── Example.php
├── Example_Controller.php
├── fields.php
├── template.php
└── resources/
    ├── js/example.js
    └── scss/example.scss
```

Responsibilities:

- `*_Controller.php`: builder metadata, title/icon, asset loading, field setup
- `*.php`: module model/state and computed behavior
- `fields.php`: field definitions returned to the page builder
- `template.php`: rendered output
- `resources/js` and `resources/scss`: optional module-scoped frontend assets compiled into hashed assets under `dist/assets/`

## Module SCSS Layer Contract

Builder-module SCSS entries should declare the same top-level layer order as [`resources/scss/app.scss`](../../resources/scss/app.scss), then place their own rules inside `@layer modules`.

That keeps builder-module CSS aligned with the main app cascade order when a module entry uses shared component mixins or emits rules into component sublayers.

## Module Asset Naming Contract

Vite entry discovery and the asset checker expect module resource filenames to match the module folder name converted to lowercase kebab-case.

Examples:

- `Button` -> `button.js`, `button.scss`
- `My_Module` -> `my-module.js`, `my-module.scss`

Optional backend variants are also supported:

- `<module>.js`
- `<module>.scss`
- `<module>-backend.js`
- `<module>-backend.scss`

See [Asset Architecture](../build-and-tooling/asset-architecture.md) for the short ruleset used by the asset checker.

## Module Asset Loading

Child controllers extend G-Theme's `GTheme\Page_Builder\Components\Module\Module_Controller` directly and select the child Vite loader through `get_asset_loader()`. [`inc/Customization/Modules.php`](../../inc/Customization/Modules.php) uses that module-selected loader in the parent's frontend/backend asset hooks. The generator templates use the same pattern.

The prefix still determines builder identifiers and WordPress handles, such as `module-gchild-button`. It does not determine compiled filenames. Vite's manifest uses source paths, for example `inc/Modules/Button/resources/scss/button.scss`, and resolves them to hashed output.

Frontend assets load only when a module is rendered. Backend scripts use ES modules and backend styles use the stylesheet API. Both retain the parent builder asset hooks.

The Vite loader skips the parent's legacy `/builder-modules/` output paths before accessing the hot file or manifest. Module setup therefore leaves Vite resolution until actual asset loading. Each asset hook retrieves the selected loader once for all child extensions.

## The `Button` Module

The custom Button module is the current reference example of the project's module style:

- it supports repeatable buttons
- it supports inline and stacked layouts plus left, center, and right alignment
- it derives variant, color, size, and modifier options from the style-format system rather than duplicating class definitions by hand
- it normalizes URLs into standard links, `mailto:`, or `tel:`
- it supports icon-only buttons, accessible labels, prefix and suffix icons, custom classes, custom `data-*` attributes, and disabled state handling
- its template renders either `<a>` or `<button>` depending on whether a URL exists

For the deeper pattern behind this module, see [Button Pattern](./button-pattern.md).
