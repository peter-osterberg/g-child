# Generation Theme Child

## 3.2.3 (2026-07-02)

- Feature: Add G-Boost AI guidance, generated tool guide files, and shared AI skill directories
- Feature: Add human-facing documentation for AI guidance and G-Boost-managed skills
- Chore: Exclude G-Boost guidance and generated tool files from the release ZIP
- Chore: Update PostCSS config to simplify selectors and transform logical properties
- Chore: Update Anime.js to `4.5`
- Bugfix: Refine cookie switch styles
- Chore: Bump theme version to `3.2.3`

## 3.2.2 (2026-06-08)

- Bugfix: Keep generated Font Awesome `@font-face` rules in production builder-module CSS and fix builder-module relative font-path detection
- Feature: Move shared custom media aliases into `resources/scss/_1-lib/_custom-media.scss` so builder modules can reuse them directly
- Feature: Rename builder background utility classes from `has-bg-*` to `has-bg-c-*` to avoid collisions with `has-bg-image` and `has-bg-video`
- Feature: Declare the full cascade-layer order inside builder-module SCSS entries so module-local component mixins keep the intended layer order
- Chore: Bump theme version to `3.2.2` and refresh build dependencies

## 3.2.1 (2026-04-20)

- Feature: Switch project tooling, documentation, CI, and release workflows from npm to pnpm
- Bugfix: General bug fixes and improvements

## 3.2.0 (2026-04-08)

- Feature: Add support for `g-theme 3.10`
- Feature: Introduce a new SCSS structure built around cascade layers
- Feature: Update build, validation, and release tooling
- Feature: Rebuild the Button module configuration with updated builder fields, normalization logic, template output, and module styling
- Feature: Add a full in-repo documentation set for setup, runtime systems, build tooling, and the design system
- Bugfix: Remove the client feedback role override from admin customization \#180

## 3.1.0 (2025-04-04)

- Feature: Add G-Child CLI tool and Counter and Expand Module to the module library \#173
- Feature: WCAG adds background color to backgorund images for better contrast
- Feature: WCAG adds aria-hidden to polylang flag image
- Feature: WCAG remove noscript tags
- Feature: Add styles for sitemap module
- Feature: Vendor JS handling \#174
- Bugfix: Fix Gravity Forms CSS override by disabling GF CSS \#171
- Bugfix: Fix issue when new color theme was added from Figma was placed at the end of the file \#176
- Remove pagination template from child theme \#175

## 3.0.2 (2024-12-18)

- Update .gitignore to ignore \*.php im languages folder
- Change gitworkflow release types to `published`

## 3.0.1 (2024-12-09)

- Feature: Adds a variable button to dev-tools for easy access to available variables and their values.
- Cleanup some npm scripts

## 3.0.0 (2024-11-28)

- Feature: Big rewrite of the child theme to be more modular and easier to work with
- Feature: Buildt in figma variables converter
- Feature: Automatic generation of color/spacings/typography/theme variables and classes from figma
- Feature: Default styles for two different mobile menu types
- Feature: Default styles for mega menu with icons and descriptions for each menu item
- Feature: Adds alot of accessibility improvements
- Feature: Uses Rem as default unit
- Feature: Adds a Button module
- And a lot more

## 2.4.3 (2024-05-27)

- Feature: Updated the fontawesome-essentials to include MD5 hashes in the names of optimized font files for enhanced cache management

## 2.4.2 (2024-03-13)

- Feature: Update phpcs ruleset

## 2.4.1 (2024-02-26)

- Feature: Update class names for G-Cookies from `gen-cookie-notice` to `g-cookies`.

## 2.4.0 (2024-02-20)

- Feature: Adds new `gchild make:` commands to generate new CPTs, taxonomies, and metaboxes. \#159
- Feature: Updates `gchild make:module` command to follow same pattern as the new commands. \#160

## 2.3.2 (2024-02-02)

- Feature: Adds postcss plugin to remove unused CSS variables.
- Feature: Introduces the `initial-load` folder within the `/js` directory, generating a dedicated JavaScript file called `initial-load.js` in the `/dist` folder. This file is excluded from lazy loading in WP Rocket.

## 2.3.1 (2024-01-30)

- Feature: New default pagination template. \#151
- Feature: Adds a new Mixin to make it easier to handle fontawesome icons. \#152

## 2.3.0 (2023-12-20)

- Feature: Updates Font Awesome to 6.5.1. \#133
- Feature: Introduces a 'dev-tools' folder within the 'js' directory for development purposes, removes in production.
- Feature: Default styling for the 'light-header' body class. \#109
- Feature: Script for version number incrementation and creation of release tags. \#122
- Feature: Removed unused code. \#132
- Bugfix: Resolved issue requiring a double-click to open the mobile menu. \#136
- Bugfix: Corrected stacking context for elements. \#138

## 2.2.2 (2023-12-12)

- Bugfix: Wrong path to assets in css when in production. \#147
- Bugfix: Font Awesome's duotone where the secondary glyph is incorrect. \#146

## 2.2.1 (2023-11-15)

- Feature: Removes goBack.js because it will not be used anymore

## 2.2.0 (2023-10-20)

- Feature: Rewrote all forms to improve flexibility,accessibility, and extend styling for third-party plugins
- Feature: Enhances support for Gravity Forms layout classes configurable within the plugin.
- Feature: Introduced RGB values as CSS variables for all colors, enabling their use in `rgba()`
- Feature: Introduces the CSS class `.theme-negative`, which can be applied to sections, rows, modules, and more. This class enables the switching of the current color theme to the negative theme for that specific element.
- Feature: Add new heading format for D1. \#110
- Feature: Close dropdown menus on scroll. \#117
- Feature: Workspace settings that recomend plugins for this workspace. \#120
- Feature: Set default width of images in image/blurb-modules to 100%. \#128
- Feature: Adds same colors to buttons in cookie notice. \#108
- Bugfix: Remove var() from Sass variables in predefined animations. \#113
- Bugfix: Fix console error when closing sub menus without a search field
- Bugfix: Implements a Font Awesome font-family check in the fontawesome-essentials-postcss plugin. \#129
- Bugfix: Remove admin bar spacing duplicates. \#116

## 2.0.0 (2023-05-19)

- Feature: Webpack mix building of styles
- Feature: Add scaffolding for modules with `php gchild make:module`

## 1.4.0 (2022-03-22)

- Feature: Changes in line with working locally

## 1.3.1 (2021-12-16)

- Bugfix: Add correct version numbers

## 1.3.1 (2021-12-16)

- Feature: Add add_hooks function and remove add_filters and add_actions
- Feature: Remove shortcodes function
- Feature: Structure blurbs and listing elements filters in add_hooks
- Feature: Add filter to make Gravity Forms input to button (commented out)
- Feature: Add date_format filter (commented out) in add_hooks
- Feature: List all available elements in listing item element function
- Feature: Add wrapper in blurbs item element
- Feature: Move admin label field in dummy module fields array

## 1.2.0 (2021-10-15)

- Feature: Make classic editor default for regular posts

## 1.2.0 (2021-10-11)

- Bugfix: Update dummy module to follow standards and add more fields types
- Feature: Move autoprefixer browserlist to package.json
- Feature: Implement CodeSniffer
