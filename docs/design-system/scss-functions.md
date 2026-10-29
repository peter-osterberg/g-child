# SCSS Functions Deep Dive

> Status: verified against the current shared function files and their active call sites. This page is still a deep-dive reference, so exact example lists and “where used” sections may lag small source-level changes.

The shared SCSS functions live in [`resources/scss/_1-lib/functions/`](../../resources/scss/_1-lib/functions/).

These helpers are forwarded through [`resources/scss/_1-lib/functions/_index.scss`](../../resources/scss/_1-lib/functions/_index.scss), which means the rest of the SCSS layer can pull them in through the shared `@lib` aliases without importing each file individually.

Current function files:

- [`_function-size.scss`](../../resources/scss/_1-lib/functions/_function-size.scss)
- [`_function-color-mix.scss`](../../resources/scss/_1-lib/functions/_function-color-mix.scss)
- [`_function-escape-svg.scss`](../../resources/scss/_1-lib/functions/_function-escape-svg.scss)
- [`_function-svg-icon.scss`](../../resources/scss/_1-lib/functions/_function-svg-icon.scss)

The function layer is small. These helpers allow the mixin and token layers to stay expressive without repeating conversion or encoding logic everywhere.

## What These Functions Are For

Broadly, the SCSS functions solve four kinds of problems:

- unit conversion and typographic normalization
- color derivation and color-type detection
- safe SVG embedding in CSS
- generating data-URI icons for form controls

They are not large algorithmic utilities. They are a thin compatibility and design-token layer for the rest of the stylesheet architecture.

## How The Function Layer Fits The SCSS Architecture

The usual flow in this repo is:

1. tokens in [`_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss) and [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss) define design values
2. functions convert or derive values from those tokens
3. mixins consume the tokens and functions to emit component styles
4. component and module partials use the mixins and occasional direct function calls

Examples:

- `rem(40)` converts design dimensions into rem units for reusable variables
- `lh(1.6)` creates rounded line-height values for typography tokens
- `alpha(var(--btn-color), 18%)` creates translucent surfaces for tonal and ghost button variants
- `escape-svg($select-icon)` makes SVG data URIs safe for use in `background-image`
- `svg-select-icon(...)` generates the actual select-arrow icon data URI used by form controls

## Sizing Functions

Sizing helpers live in [`_function-size.scss`](../../resources/scss/_1-lib/functions/_function-size.scss).

### `strip-unit($value)`

Purpose:

- remove the CSS unit from a numeric value so it can be used in math

Implementation:

```scss
@function strip-unit($value) {
	@return math.div($value, ($value * 0 + 1));
}
```

What it does:

- `strip-unit(16px)` -> `16`
- `strip-unit(1.5rem)` -> `1.5`

Why it exists:

- Sass unit math is stricter than plain CSS math
- functions like `rem()` and `em()` need the numeric part without carrying the original unit through the division

### `rem($pxValue)`

Purpose:

- convert a pixel-based design value into `rem`

Implementation concept:

- divide the value by the base HTML font size
- append the `rem` unit

The file sets:

- `$html-font-size: 16px`

So:

- `rem(40)` -> `2.5rem`
- `rem(8)` -> `0.5rem`

Where it matters in this repo:

- button heights in [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss)
- form control sizing
- header sizes
- spacing-like fixed dimensions inside the token layer

This helper appears throughout the codebase.

### `em($pxValue, $contextPxValue)`

Purpose:

- convert a pixel value into an `em` value relative to a specific context size

Typical mental model:

- `em(24, 16)` means “24px in a 16px context”

So:

- `em(24, 16)` -> `1.5em`

Where it is used:

- typography token maps in [`_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss), especially letter-spacing values

Why `em()` is useful here:

- token definitions can stay readable in pixel-like design terms
- output remains relative to the consuming text size

Implementation note:

- the current implementation is a single direct conversion from the provided context size to `em`

### `lh($value, $roundValue: $base-round-value)`

Purpose:

- generate rounded line-height values as `em`-based output

Typical use:

- `lh(1.2)`
- `lh(1.6)`

What it returns conceptually:

- a line-height value based on `1em`, rounded to a consistent step

Why that matters:

- line heights stay proportional to font size
- the output is rounded so typography tokens do not produce awkward fractional layout values everywhere

Where it is used:

- line-height maps in [`_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss)

This function is part typography normalization and part visual-rhythm control.

## Color Functions

Color helpers live in [`_function-color-mix.scss`](../../resources/scss/_1-lib/functions/_function-color-mix.scss).

These functions support a theme architecture that relies heavily on CSS variables and semantic color tokens. The helpers let component mixins derive consistent hover, active, tonal, and contrast behavior without duplicating color math in many files.

### `alpha($color, $alpha)`

Purpose:

- create a translucent version of a color using `color-mix(...)`

Implementation:

```scss
@function alpha($color, $alpha) {
	@return color-mix(in oklch, $color $alpha, transparent);
}
```

What it means:

- `alpha(var(--btn-color), 18%)` mixes the color with transparency
- this acts like “apply opacity to the color” while keeping the value composable in CSS

Where it is used:

- button tonal and ghost variants
- shadows and backdrop tokens
- focus rings in choice-control mixins
- general translucent UI surfaces

Why this is better than hardcoding `rgba(...)` everywhere:

- it works more cleanly with CSS variables
- it keeps the code in the same color-mix idiom used across the theme

### `light($color, $value)`

Purpose:

- lighten a color by mixing it toward white

Implementation:

```scss
@function light($color, $value) {
	@return color-mix(in oklch, $color, #fff $value);
}
```

Current role:

- it is part of the shared color helper set
- it is not heavily used in the active SCSS right now

It exists as a general-purpose design-token helper for cases where a lighter derived color is needed in the same color space the rest of the theme uses.

### `dark($color, $value)`

Purpose:

- darken a color by mixing it toward black

Implementation mirrors `light(...)`:

```scss
@function dark($color, $value) {
	@return color-mix(in oklch, $color, #000 $value);
}
```

Current role:

- like `light(...)`, this is part of the shared function toolkit
- it is available for derived token work even though the active SCSS leans more on semantic hover/active variables and `alpha(...)`

### `tonal($color)`

Purpose:

- create a toned surface color by mixing toward a neutral midpoint

Implementation:

```scss
@function tonal($color) {
	@return color-mix(in oklch, $color, #7f7f7f 25%);
}
```

What it is for:

- softer surfaces that still relate to a source color
- neutralized tints that feel less aggressive than a pure filled color

Where it is used:

- slider bullets in [`module-slider/_controls.scss`](../../resources/scss/_5-modules/module-slider/_controls.scss)
- listing filter chip backgrounds in [`module-listing/_filters.scss`](../../resources/scss/_5-modules/module-listing/_filters.scss)
- tab borders in [`_tabs.scss`](../../resources/scss/_5-modules/_tabs.scss)

This helper encodes a stable design decision: `tonal` means the same kind of softened surface across components rather than a one-off color treatment.

### `contrast-color($value, $light: #fff, $dark: #000, $threshold: 60%)`

Purpose:

- return a readable foreground color for a given background color

Behavior:

- if the input is not a Sass color type, it returns `currentcolor`
- if the input is light enough, it returns the dark option
- otherwise it returns the light option

Why that branch matters:

- the theme often works with CSS variables like `var(--bullet)` rather than literal Sass colors
- Sass cannot calculate true lightness from an unresolved CSS variable

Where it is used:

- `btn-color()` in [`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) when the color input is a literal color

Practical effect:

- if a component passes a real color like `#111`, the helper can choose white text
- if a component passes `var(--bullet)`, it falls back to `currentcolor` because Sass cannot inspect the runtime value

That is a pragmatic compromise between static Sass logic and dynamic CSS-variable-based theming.

### `is-current-color($value)`

Purpose:

- detect whether a value is literally `currentcolor`

Why it exists:

- some mixins need to distinguish semantic token names like `'primary'` from special CSS keywords like `currentcolor`

Where it is used:

- `btn-color()` in the button mixin stack

This helper is part of the type-detection utilities that make `btn-color()` flexible.

### `is-css-var($value)`

Purpose:

- detect whether a string looks like a CSS variable reference, for example `var(--bullet)`

Why it exists:

- Sass needs to branch differently for:
  - semantic token names
  - literal colors
  - CSS runtime variables

Where it is used:

- `btn-color()`
- `btn-size()`

Practical effect:

- `btn-color(var(--bullet))` is treated as a dynamic runtime color
- `btn-size(var(--control-size))` is treated as a runtime size value

This helper lets the SCSS layer work with the project’s CSS-variable architecture.

## SVG String Functions

String/SVG helpers live in [`_function-escape-svg.scss`](../../resources/scss/_1-lib/functions/_function-escape-svg.scss).

These are used when SVG data URIs need to be embedded inside CSS safely.

### `str-replace($string, $search, $replace: '')`

Purpose:

- recursively replace all instances of a substring inside a string

Role in this project:

- it is a helper used by `escape-svg()`
- it is not usually called directly from component partials

Why it exists:

- Sass does not provide a general global replace helper in the same ergonomic form
- encoding SVG data URIs requires repeated targeted character replacement

### `escape-svg($string)`

Purpose:

- escape characters in an SVG data URI so the string is safe to use inside CSS

Escaped characters include:

- `<`
- `>`
- `#`
- `(`
- `)`

Why this matters:

- raw SVG markup inside `url(...)` can break CSS parsing
- unescaped `#` is especially problematic in data URIs

Where it is used:

- select control backgrounds in [`_form-controls.scss`](../../resources/scss/_4-components/forms/_form-controls.scss)
- dark-theme icon overrides in [`_mixin-theme.scss`](../../resources/scss/_1-lib/mixins/_mixin-theme.scss)
- choice-control icons in [`_form-choice.scss`](../../resources/scss/_4-components/forms/_form-choice.scss) and [`_mixin-choice-control.scss`](../../resources/scss/_1-lib/mixins/_mixin-choice-control.scss)

Example pattern:

```scss
background-image: var(--select-icon, #{escape-svg($select-icon)});
```

That means:

- use a runtime CSS variable icon if one exists
- otherwise use the escaped built-in SVG data URI

## Generated SVG Icon Functions

Icon generator functions live in [`_function-svg-icon.scss`](../../resources/scss/_1-lib/functions/_function-svg-icon.scss).

These are less “math utilities” and more “data factories”.

They return prebuilt SVG data URIs for specific UI control icons.

## Why These Functions Exist At All

The theme uses form controls that need icons in CSS backgrounds:

- select arrows
- checkbox ticks
- radio dots

Rather than storing a separate static asset file for every icon family/weight/color combination, the SCSS function layer generates the right data URI at compile time.

That keeps the icon styling:

- themeable by color
- configurable by Font Awesome family/weight
- local to the token layer

### `svg-select-icon($fa-family, $fa-weight, $icon-color)`

Purpose:

- return the select-arrow SVG as a data URI based on:
  - Font Awesome family
  - icon weight
  - icon color

Supported families in the function:

- `Font Awesome 7 Pro`
- `Font Awesome 7 Sharp`

Supported weights:

- thin / `100`
- light / `300`
- regular / `400`
- solid / `900`

How it works:

- the function contains hardcoded SVG path variants for each supported family/weight combination
- it picks the correct one
- it returns a `url("data:image/svg+xml,...")` string

Where it is used:

- [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss) builds `$select-icon`
- that value becomes the fallback `background-image` for select controls

### `svg-check-icon($fa-family, $fa-weight, $icon-color)`

Purpose:

- generate the checkbox/tick icon data URI

It follows the same general pattern as `svg-select-icon(...)`, but for checkmark icons rather than select arrows.

Where it is used:

- `$check-icon` and `$check-icon-dark` in [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss)
- choice-control fallbacks in [`_mixin-choice-control.scss`](../../resources/scss/_1-lib/mixins/_mixin-choice-control.scss)

### `svg-radio-icon($icon-color)`

Purpose:

- generate the radio “filled circle” icon data URI

Compared with the select/check helpers, this one is simpler because it does not branch by Font Awesome family or weight.

Where it is used:

- `$radio-icon` and `$radio-icon-dark`
- radio control styling in the forms layer

## Real Usage Patterns In The Active SCSS

The functions are small, but their usage is spread through key layers of the theme.

### Tokens and variables

[`_variables.scss`](../../resources/scss/_1-lib/_variables.scss) uses:

- `rem(...)` for button, form, and header dimensions
- `svg-select-icon(...)`, `svg-check-icon(...)`, and `svg-radio-icon(...)` to build icon variables

[`_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss) uses:

- `alpha(...)` for backdrop, border, placeholder, and shadow values
- `em(...)` for letter-spacing maps
- `lh(...)` for line-height maps

### Button system

[`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) uses:

- `alpha(...)` in tonal and ghost variants
- `contrast-color(...)`, `is-current-color(...)`, and `is-css-var(...)` in `btn-color()`
- `is-css-var(...)` in `btn-size()`

### Forms layer

[`_form-controls.scss`](../../resources/scss/_4-components/forms/_form-controls.scss) uses:

- `escape-svg($select-icon)` for select backgrounds

[`_mixin-choice-control.scss`](../../resources/scss/_1-lib/mixins/_mixin-choice-control.scss) uses:

- `alpha(...)` for ring colors
- `escape-svg($check-icon)` for checkbox visuals

### Module styling

[`module-slider/_controls.scss`](../../resources/scss/_5-modules/module-slider/_controls.scss) uses:

- `tonal(...)` for slider bullets and progress backgrounds
- `rem(...)` for progress height

[`module-listing/_filters.scss`](../../resources/scss/_5-modules/module-listing/_filters.scss) uses:

- `tonal(...)` for filter chip surfaces
- `rem(...)` for icon sizing

## Design Principles Behind These Functions

The function layer reveals a few consistent design choices in this project.

### 1. Prefer derived values over duplicated literals

Instead of hardcoding many semi-transparent or tonal colors, the theme derives them from a smaller semantic base using helpers like:

- `alpha(...)`
- `tonal(...)`
- `contrast-color(...)`

### 2. Prefer CSS-variable-friendly helpers

Helpers like `is-css-var(...)` exist because the system expects runtime theming through CSS custom properties, not only static Sass colors.

### 3. Keep CSS-asset generation in SCSS when it depends on theme variables

The SVG icon functions exist because select/check/radio icons depend on:

- theme color
- icon family
- icon weight

That is easier to solve at compile time inside SCSS than with a pile of separate static assets.

### 4. Let tokens and mixins stay readable

Without these helpers, many token and mixin files would be harder to read:

- `rem(40)` is clearer than repeating a long unit conversion
- `alpha(var(--black), 25%)` is clearer than hand-building color-mix expressions everywhere
- `escape-svg($select-icon)` is clearer than inlining URI escaping logic at every use site

## What To Reach For When

Use these helpers like this:

- use `rem(...)` for fixed design dimensions that should scale from the root font size
- use `em(...)` for values that should stay relative to a local text size
- use `lh(...)` when defining line-height tokens
- use `alpha(...)` for translucent surfaces from theme colors
- use `tonal(...)` for softened, neutralized tinted surfaces
- use `contrast-color(...)` only when Sass has enough static color information to make that choice meaningful
- use `escape-svg(...)` whenever embedding SVG data URIs into CSS
- use the `svg-*icon(...)` helpers when a form/control icon needs to be generated from theme/icon settings

## Summary

The SCSS function layer in this repo is not a generic utility dump. It is a focused support layer for the theme system.

It provides:

- unit conversion helpers for tokens and typography
- color derivation helpers for semantic UI states
- runtime-value detection helpers for CSS-variable-aware mixins
- SVG escaping and icon-generation helpers for form controls

Together, these functions make the token files, mixins, and component partials much simpler than they would be if each file had to repeat the same conversions, color math, and data-URI logic manually.
