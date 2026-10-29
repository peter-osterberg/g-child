# Color Theming Deep Dive

This document explains how the color theming system is assembled and propagated into components and builder output.

## Color Theming Overview

The theme does not hardcode final colors directly into most components. Instead it builds a layered system:

1. base palette tokens
2. semantic theme maps
3. CSS custom properties
4. theme selectors and builder background classes
5. component mixins that read the semantic variables

That separation is what makes it possible for the same button, card, form, or listing filter CSS to work in both light and dark contexts without duplicating full component styles.

## The Source Of Truth

The main color source of truth is [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss).

The main maps in that file are:

- `$colors`: raw palette entries such as `gray-800`, `pink-50`, `blue-700`, `white`, `black`
- `$theme-light`: semantic tokens for the default theme
- `$theme-dark`: semantic overrides for dark mode
- `$themes`: registry of named theme maps
- `$theme-by-background`: mapping from builder background token to theme name
- `$button-colors`: list of semantic button color names that should generate utility classes

### Base palette vs semantic theme tokens

The palette contains stable color names:

- `gray-800`
- `pink-50`
- `green-500`

The theme maps contain semantic roles:

- `background-1`
- `text-1`
- `primary`
- `primary-text`
- `link-hover`
- `form-border-error`

This is the main design decision in the system. Components almost never need to know that `primary` currently resolves to `var(--pink-500)`. They only consume `var(--primary)`, `var(--primary-text)`, and related semantic variables.

## How Theme Variables Become CSS Variables

There are two separate flows:

- raw token maps become `:root` custom properties
- theme maps become active semantic colors on themed selectors

### 1. Design tokens on `:root`

[`resources/scss/_2-themes/_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss) converts non-color maps into CSS variables on `:root`, for example:

- spacing -> `--spacing-*`
- font family -> `--ff-*`
- font size -> `--fs-*`
- line height -> `--lh-*`
- letter spacing -> `--ls-*`
- radius -> `--br-*`

It does this through the `@include as-props(...)` mixin from [`resources/scss/_1-lib/mixins/_mixin-api.scss`](../../resources/scss/_1-lib/mixins/_mixin-api.scss).

### 2. Base colors on `:root`

[`resources/scss/_2-themes/_colors.scss`](../../resources/scss/_2-themes/_colors.scss) applies:

```scss
:root {
	@include theme-colors($colors);
}
```

That turns the palette into root-level custom properties like:

- `--gray-800`
- `--pink-50`
- `--white`
- `--black`

The `theme-colors()` mixin is slightly misleadingly named. It does not only work for themes. It just writes map entries as CSS custom properties with the bare token name.

## Theme Application Mixin

[`resources/scss/_1-lib/mixins/_mixin-theme.scss`](../../resources/scss/_1-lib/mixins/_mixin-theme.scss) defines the theme payload through `@mixin apply-theme($theme-name)`.

That mixin:

- looks up the named theme in `$themes`
- emits semantic custom properties with `@include theme-colors(...)`
- sets `color-scheme`
- for `dark`, swaps in dark form-control SVG icons for selects/checks/radios

## How Themes Are Activated

[`resources/scss/_2-themes/_colors.scss`](../../resources/scss/_2-themes/_colors.scss) activates themes through selectors:

```scss
html,
.theme-light,
[data-theme='light'] {
	@include apply-theme(light);
}

.theme-dark,
[data-theme='dark'] {
	@include apply-theme(dark);
}
```

That means:

- the whole site defaults to light theme because `html` receives the light semantic variables
- any subtree can switch to dark by adding `.theme-dark` or `data-theme="dark"`
- any subtree can explicitly switch back with `.theme-light` or `data-theme="light"`

In practice, component styles are written against semantic variables, so the same component can be dropped inside either subtree.

## Builder Backgrounds And Theme Switching

The most project-specific part of the system is the bridge between page-builder background settings and semantic theme activation.

### PHP side

[`inc/Customization/Child_Functions.php`](../../inc/Customization/Child_Functions.php) does two things for builder components:

1. adds a class based on the selected background color:

- `has-bg-c-background-1`
- `has-bg-c-background-2`
- `has-bg-c-background-3`
- `has-bg-c-background-4`

2. injects CSS variables for that component:

- `--bg-color: var(--background-X)`
- `--text-color: var(--background-X-text)`

It also removes the builder’s direct `background-color`, `color`, and `--fg-color` output so the child theme variables remain the single styling source.

### SCSS side

The same `_colors.scss` file contains:

```scss
:where([class*='has-bg-c-']) {
	--_bg: var(--bg-color, #{$background-base});
	--_text: var(--text-color, #{$text-base});

	color: var(--_text);
	background-color: var(--_bg);
}
```

That gives every builder section, row, column, or module with a `has-bg-c-*` class a normalized text and background pair.

Then this loop applies the matching theme variant:

```scss
@each $color, $theme-name in $theme-by-background {
	.has-bg-c-#{$color} {
		@include apply-theme($theme-name);
	}
}
```

The registry lives in `_tokens.scss`:

```scss
$theme-by-background: (
	'background-1': light,
	'background-2': light,
	'background-3': light,
	'background-4': dark,
);
```

So the builder background choice does not only set a background color. It also chooses which semantic theme map should be active for descendants.

### Why this matters

If a section gets `background-4`, it does all of the following:

1. the builder component receives `has-bg-c-background-4`
2. PHP injects `--bg-color: var(--background-4)`
3. PHP injects `--text-color: var(--background-4-text)`
4. SCSS applies `background-color: var(--bg-color)`
5. SCSS applies `color: var(--text-color)`
6. SCSS also applies `@include apply-theme(dark)` because `$theme-by-background` maps `background-4 -> dark`
7. every descendant component that reads semantic variables now inherits the dark semantic set

That is the core theme-bridging mechanic in this project.

## How Components Consume The Theme

Most component mixins do not care whether they are in light or dark mode. They just read semantic CSS variables.

Examples:

- [`resources/scss/_1-lib/_variables.scss`](../../resources/scss/_1-lib/_variables.scss) sets foundation aliases like:
  - `$background-base: var(--background-1)`
  - `$text-base: var(--text-1)`
  - `$focus-ring-color: var(--focus-ring)`
- [`resources/scss/_1-lib/mixins/_mixin-card.scss`](../../resources/scss/_1-lib/mixins/_mixin-card.scss) uses:
  - `--card-bg: var(--bg-color, #{$background-base})`
  - `color: var(--text-color, #{$text-base})`
- [`resources/scss/_1-lib/mixins/_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) turns semantic tokens like `primary` into:
  - `--btn-color: var(--primary)`
  - `--btn-color-text: var(--primary-text)`
  - `--btn-color-hover: var(--primary-hover)`
  - `--btn-color-active: var(--primary-active)`
- [`resources/scss/_5-modules/module-listing/_filters.scss`](../../resources/scss/_5-modules/module-listing/_filters.scss) derives tonal chip backgrounds from the current background context:
  - `tonal(var(--bg-color, #{$background-base}))`

The pattern is consistent:

- root semantic theme variables define meaning
- local component variables adapt those meanings to a component API
- component styles render from those local variables

## Buttons As A Good Example

Buttons provide a clear example of the semantic color system in use.

### Step 1: class generation

[`resources/scss/_4-components/_buttons.scss`](../../resources/scss/_4-components/_buttons.scss) loops through `$button-colors` and creates classes like:

- `.btn-primary`
- `.btn-success`
- `.btn-secondary`

### Step 2: semantic binding

The `btn-color()` mixin in [`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) maps `primary` to:

- `--btn-color: var(--primary)`
- `--btn-color-text: var(--primary-text)`
- `--btn-color-hover: var(--primary-hover)`
- `--btn-color-active: var(--primary-active)`

### Step 3: visual variant

The variant mixins like `btn-variant('filled')` or `btn-variant('outline')` decide how those semantic button variables should be used:

- as background
- as border
- as text
- or as transparent or tonal overlays

Because `--primary` and friends come from the active theme scope, the same `.btn.btn-filled.btn-primary` class combination can adapt to the currently active theme without any extra modifier class.

For the full button composition model, including `btn`, `btn-variant()`, `btn-color()`, `btn-size()`, and the icon helpers, see [Button Mixins Deep Dive](./button-mixins.md).

## Figma’s Role In The Theme System

The repo’s Figma pipeline is not only for spacing and typography. It also feeds the theme maps.

Relevant files:

- [`console/figma-converter/build-figma-scss.js`](../../console/figma-converter/build-figma-scss.js)
- [`console/figma-converter/figma-process-colors.js`](../../console/figma-converter/figma-process-colors.js)
- [`console/figma-converter/figma-write-scss.js`](../../console/figma-converter/figma-write-scss.js)

### Color pipeline behavior

The converter:

- reads the `Color` collection from Figma
- treats each Figma mode as a theme
- normalizes token names into the SCSS naming convention
- maps raw hex colors to stable base-color names
- converts alpha colors into `alpha(...)` expressions
- turns the Figma mode named `main` into the SCSS theme named `light`
- emits `$theme-light`, `$theme-dark`, and the `$themes` registry
- derives `$button-variants` by checking which semantic groups have matching `-text`, `-hover`, and `-active` tokens

One subtle optimization: for non-main themes, the generator only keeps entries that differ from the `main` theme. That keeps dark-theme maps smaller and more semantic.

## Practical Theme Debugging

When a color looks wrong, check the system in this order:

1. Is the component reading the semantic variable you expect?
2. Is the element inside a `.theme-dark` subtree or a `has-bg-c-*` builder context?
3. Did PHP inject `--bg-color` and `--text-color` for that builder component?
4. Does `$theme-by-background` map that builder background to the intended light or dark theme?
5. Did the Figma pipeline regenerate `_tokens.scss` in a way that changed a semantic token?

Most theme bugs in this repo come from one of those boundaries, not from a single hardcoded color value.
