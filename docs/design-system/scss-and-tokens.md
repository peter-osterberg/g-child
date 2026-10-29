# SCSS And Tokens

The active SCSS source tree is `resources/scss/`.

## Entry Files

- `resources/scss/app.scss`
- `resources/scss/editor.scss`
- `resources/scss/editor-admin.scss`

Only these entry files should remain non-partials in the active SCSS tree.

## Layer Model

[`app.scss`](../../resources/scss/app.scss) builds the stylesheet using cascade layers in this order:

1. `theme`
2. `base`
3. `components`
4. `modules`
5. `layouts`
6. `utilities`
7. `_8-no-layer`

The file loads these layer groups via aliases configured in [`vite.config.mjs`](../../vite.config.mjs).

## SCSS Folder Map

- `_1-lib/`: functions, mixins, variables, token maps
- `_2-themes/`: design tokens, colors, theme variants, shadows, motion tokens
- `_3-base/`: resets, typography, layout primitives
- `_4-components/`: buttons, cards, typography, form controls
- `_5-modules/`: generic module styling
- `_6-layouts/`: site header and layout styling
- `_7-utilities/`: spacing, screen-reader, grid helpers
- `_8-no-layer/`: intentionally outside cascade layers

## Tokens And Generated Variables

[`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss) is a core source-of-truth file for:

- breakpoints
- spacing scale
- color palette
- theme maps
- button color registry
- shadow tokens
- typography maps

It is also the source used by `pnpm run get-intell` to generate intellisense helper files.

[`resources/scss/_2-themes/_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss) converts map data into CSS custom properties on `:root`.

Typography tokens do not load font binaries by themselves. They describe which family names the design system should use after the font assets have already been made available to the browser.

## Custom Media

[`resources/scss/_1-lib/_custom-media.scss`](../../resources/scss/_1-lib/_custom-media.scss) defines the shared custom media aliases used across the SCSS layer.

That file contains:

- generated breakpoint aliases such as `--sm-only`, `--sm-up`, and `--sm-down`
- convenience aliases like `--sm-phone`
- preference aliases such as `--motion-ok` and `--os-dark`
- interaction aliases such as `--touch` and `--mouse`

These aliases are authored in SCSS and then expanded by PostCSS during the asset build.

## Figma Variable Workflow

The theme has a built-in Figma-to-SCSS pipeline.

### Source Files

- Figma JSON input: `resources/lib/figma/variables.json`
- generated intermediate SCSS: `resources/lib/figma/figma-output.scss`
- merged target token file: `resources/scss/_1-lib/_tokens.scss`

### Export Source

The note in [`resources/lib/figma/readme.md`](../../resources/lib/figma/readme.md) points to the `variables2json` Figma plugin as the export source for `variables.json`.

### Pipeline Steps

1. export variables from Figma to `resources/lib/figma/variables.json`
2. run `pnpm run get-vars` to build `figma-output.scss`
3. run `pnpm run set-vars` to merge generated maps and lists into `_tokens.scss`
4. run `pnpm run get-intell` to refresh intellisense helper files

The scripts behind those commands currently live under [`console/figma-converter/`](../../console/figma-converter). The sibling `console/figma-converter-old/` tree is a legacy copy and is not used by the pnpm scripts.

Or use the convenience script for steps 2 and 3:

```bash
pnpm run setup-vars
```

Then refresh the intellisense helper files:

```bash
pnpm run get-intell
```

`pnpm run dev` and `pnpm run watch` already run `get-intell` before invoking Vite.

### What The Converter Produces

The Figma converter scripts process:

- core variables
- color variables
- typography variables
- effect variables
- theme artifacts
- button variants
- font-space, line-height, and letter-spacing maps

The output is merged rather than blindly replacing the whole token file, which preserves the project's curated token structure.

## Further Reading

For a deeper explanation of the color theming model, see [Color Theming Deep Dive](./color-theming.md).

For the project’s shared media-query vocabulary, naming scheme, breakpoint semantics, and input/preference aliases, see [Custom Media Reference](./custom-media.md).

For the full path from `resources/fonts/fonts.css` and copied `.woff2` files through SCSS font-family tokens and WordPress enqueueing, see [Font Loading](./font-loading.md).

For the type scale, rhythm model, typography mixins, and public heading/text utility bindings, see [Typography](./typography.md).

For the shared helper layer behind unit conversion, color derivation, SVG escaping, and generated form-control icons, see [SCSS Functions Deep Dive](./scss-functions.md).

For the shared composition layer behind cards, choice controls, typography, icon rendering, and utility helpers, see [SCSS Mixins Deep Dive](./scss-mixins.md).

For the shared button composition system, see [Button Mixins Deep Dive](./button-mixins.md).

For the PostCSS pipeline, see [PostCSS Pipeline Deep Dive](../build-and-tooling/postcss-pipeline.md).
