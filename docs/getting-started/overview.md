# Overview

This repository is the child theme layer for the `generation-theme` WordPress parent theme. It is not a standalone theme framework. Page-builder APIs, helper functions, base module behavior, and icon rendering come from the parent theme. The child theme owns its Vite build and asset loader.

## What This Repository Contains

- child-theme bootstrap code and WordPress hook registration
- child-specific page-builder modules
- frontend JavaScript for navigation, popovers, listing filters, and plugin integrations
- SCSS architecture, token maps, theme variables, and component/module styling
- a Vite build with the existing PostCSS pipeline
- a Symfony Console based CLI for scaffolding modules, post types, taxonomies, and metaboxes
- Figma variable conversion scripts that generate SCSS token maps
- repo-level asset hygiene checks for active source and module templates
- a CI workflow that runs asset and build validation on push and pull request
- a release workflow that builds and packages a deployable ZIP

## Important Assumptions

- The parent theme `generation-theme` must be installed and available.
- The theme expects parent-theme APIs such as module base classes, icon rendering helpers, `gt_add_post_type()`, `gt_add_taxonomy()`, and multiple `gt_*` filters/actions.
- The active text domain is `g-theme-child`.
- The current module prefix file is `prefix`, and its current value is `gchild_`.
- Build output in `dist/` is part of the runtime contract. The theme enqueues assets from `dist/`, not directly from `resources/`.

## Top-Level Structure

```text
.
├── functions.php                  Child theme bootstrap and service container
├── inc/                           Runtime PHP code
│   ├── Customization/             Hook-based customizations
│   ├── Modules/                   Live child-theme builder modules
│   ├── Traits/                    Shared PHP traits
│   ├── I18n.php                   Translation loading
│   ├── Scripts.php                Frontend/admin/editor asset loading
│   └── Shortcodes.php             Theme shortcodes
├── resources/                     Source assets
│   ├── js/                        Frontend JavaScript source
│   ├── scss/                      Active SCSS source
│   ├── fonts/                     Local font files processed by Vite
│   ├── img/                       Images referenced by JS or CSS
│   └── lib/                       Generated token/intellisense/Figma support files
├── dist/                          Compiled runtime assets consumed by WordPress
├── console/                       CLI generators and Figma tooling
├── postcss-plugins/               Custom PostCSS plugins used by the pipeline
├── .github/                       Validation and release workflows
├── docs/                          Project documentation
├── languages/                     Translation files
├── gchild                         Symfony Console entrypoint
└── vite.config.mjs                 Build pipeline
```

## Relationship To The Parent Theme

This child theme delegates a lot of core behavior to `generation-theme`. Examples from this repo:

- the child owns asset loading; the parent loads its own assets separately
- builder modules extend parent module base classes
- builder modules and layout styling depend on `gt_*` filters defined upstream
- post-type and taxonomy registration use helper functions from the parent ecosystem
- icon rendering uses the parent icon renderer and `gt_icon_svg()`

If you are looking for base module internals, page-builder component classes, or the source of the `gt_*` hook contracts, that code is in the parent theme, not here.
