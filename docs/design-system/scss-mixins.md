# SCSS Mixins Deep Dive

The shared mixin layer lives in [`resources/scss/_1-lib/mixins/`](../../resources/scss/_1-lib/mixins/).

This folder is the main composition API for the SCSS architecture. The rest of the theme rarely imports individual mixin files directly. Instead, it usually pulls them through the shared library barrel:

- [`resources/scss/_1-lib/mixins/_index.scss`](../../resources/scss/_1-lib/mixins/_index.scss)
- [`resources/scss/_1-lib/_index.scss`](../../resources/scss/_1-lib/_index.scss)

Most active partials therefore simply do:

```scss
@use '@lib' as *;
```

and then call mixins like `@include btn`, `@include card-dropdown`, or `@include text-sm`.

## What The Mixin Layer Does

The mixin layer is where the project turns:

- token maps
- shared variables
- helper functions
- CSS-variable conventions

into reusable styling behaviors.

In practice, the mixins are doing one or more of these jobs:

- define component shells
- map semantic variables to visual output
- generate utility classes or CSS custom properties
- encapsulate state handling
- wrap repetitive browser quirks or accessibility patterns

The mixins are not all the same type. Some are large component systems, while others are tiny single-purpose helpers.

## The Mixin Inventory

Current shared mixin files:

- [`_mixin-api.scss`](../../resources/scss/_1-lib/mixins/_mixin-api.scss)
- [`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss)
- [`_mixin-card.scss`](../../resources/scss/_1-lib/mixins/_mixin-card.scss)
- [`_mixin-clamp-lines.scss`](../../resources/scss/_1-lib/mixins/_mixin-clamp-lines.scss)
- [`_mixin-chip.scss`](../../resources/scss/_1-lib/mixins/_mixin-chip.scss)
- [`_mixin-choice-control.scss`](../../resources/scss/_1-lib/mixins/_mixin-choice-control.scss)
- [`_mixin-content-card.scss`](../../resources/scss/_1-lib/mixins/_mixin-content-card.scss)
- [`_mixin-fade-content.scss`](../../resources/scss/_1-lib/mixins/_mixin-fade-content.scss)
- [`_mixin-hide-scrollbar.scss`](../../resources/scss/_1-lib/mixins/_mixin-hide-scrollbar.scss)
- [`_mixin-icon-font.scss`](../../resources/scss/_1-lib/mixins/_mixin-icon-font.scss)
- [`_mixin-input-icons.scss`](../../resources/scss/_1-lib/mixins/_mixin-input-icons.scss)
- [`_mixin-links.scss`](../../resources/scss/_1-lib/mixins/_mixin-links.scss)
- [`_mixin-loading.scss`](../../resources/scss/_1-lib/mixins/_mixin-loading.scss)
- [`_mixin-sr-only.scss`](../../resources/scss/_1-lib/mixins/_mixin-sr-only.scss)
- [`_mixin-theme.scss`](../../resources/scss/_1-lib/mixins/_mixin-theme.scss)
- [`_mixin-typography.scss`](../../resources/scss/_1-lib/mixins/_mixin-typography.scss)

## The Main Pattern

The dominant pattern in this codebase is:

1. tokens define base values
2. mixins write component-scoped CSS variables
3. the component renders from those variables
4. state or variant mixins override only the relevant variables

That is exactly how the button system works, and it also shows up in cards and choice controls.

This is why the mixin layer feels consistent even though the files do different things. The project prefers variable-driven composition over large static selector trees.

## How To Think About The Mixin Families

The mixin layer breaks down into a few families.

### 1. API and token-export mixins

These mixins turn Sass maps into CSS variables or utility selectors:

- `color-as-props`
- `as-props`
- `as-bg-shadow-props`
- `as-utilities`
- `theme-colors`

### 2. Component-shell mixins

These define a reusable UI surface or base control:

- `btn`
- `card`
- `chip`
- `choice-control-base`

### 3. Variant/state mixins

These specialize the base shell:

- `btn-variant`
- `btn-color`
- `btn-size`
- `card-size`
- `card-outlined`
- `card-elevation`
- `choice-control-state-*`

### 4. Infrastructure/helper mixins

These wrap a recurring CSS trick or platform concern:

- `hide-scrollbar`
- `visually-hidden`
- `visually-hidden-focusable`
- `fade-content-*`
- `loading-spinner`

### 5. Font/icon mixins

These bridge the theme into the Font Awesome token model:

- `icon`
- `fa`
- `fa-render-single`
- `fa-render-duotone`

### 6. Typography mixins

These expose the text scale as composable APIs:

- `text-base`
- `h1` through `h6`
- `d1`
- `text-lg`, `text-md`, `text-sm`, `text-tn`, `text-mi`

For the broader type-system contract, token flow, and public class bindings, see [Typography](./typography.md).

### 7. Layout and interaction helpers

These smaller files round out the current mixin tree:

- `clamp-lines` for multi-line truncation
- `content-card*` for reusable linked card shells and hover treatment
- `input-leading-icon*` for icon-bearing form fields and dropdown labels
- `overlay-link*` and `link-reset` for stretched-link patterns
- `apply-theme` for semantic theme payloads and dark-form icon swaps

## `@mixin-api.scss`

[`_mixin-api.scss`](../../resources/scss/_1-lib/mixins/_mixin-api.scss) is the bridge between Sass maps and CSS custom properties or utility classes.

Important mixins:

- `color-as-props($prefix, $name, $value)`
- `as-props($prefix, $name, $value, $size: false)`
- `as-bg-shadow-props($prefix, $name, $value)`
- `as-utilities($prefix, $name)`
- `theme-colors($theme)`

### What they are for

These mixins are mostly used in the theme/token generation layer, not in component partials.

Examples:

- [`_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss) loops token maps and calls `as-props(...)` to emit variables like `--spacing-*`, `--fs-*`, `--lh-*`, and `--br-*`
- [`_colors.scss`](../../resources/scss/_2-themes/_colors.scss) and [`_mixin-theme.scss`](../../resources/scss/_1-lib/mixins/_mixin-theme.scss) use `theme-colors(...)` to emit semantic color variables
- [`_spacing.scss`](../../resources/scss/_7-utilities/_spacing.scss) uses `as-utilities(...)` to generate utility classes

### Why this file matters

This file defines the “export Sass maps into CSS” pattern for the project.

It is foundational because the rest of the component mixins assume those CSS variables already exist.

## `@mixin-button.scss`

[`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) is the largest and most feature-rich mixin family in the repo.

It defines:

- the base button shell
- variants
- semantic color binding
- sizes
- icon-only behavior
- icon pseudo-elements

This file has its own dedicated deep dive:

- [Button Mixins Deep Dive](./button-mixins.md)

That page is the main reference for the project’s variable-driven mixin style as a whole.

## `@mixin-card.scss`

[`_mixin-card.scss`](../../resources/scss/_1-lib/mixins/_mixin-card.scss) is a smaller sibling to the button system.

Important mixins:

- `card`
- `card-size($name)`
- `card-outlined`
- `card-elevation($level)`
- `floating-card`
- `card-dropdown`

### Pattern

Like the button system, the card mixins are built around CSS variables:

- `--card-py`
- `--card-px`
- `--card-br`
- `--card-bg`
- `--card-bw`
- `--card-bc`
- `--card-shadow`

`card()` renders the shell from those variables, while the other mixins specialize them.

### Typical composition

The main public class API in [`_cards.scss`](../../resources/scss/_4-components/_cards.scss) uses:

- `.card` -> `@include card`
- `.card-<size>` -> `@include card-size(...)`
- `.card-dropdown` -> `@include card-dropdown`

`card-dropdown` is especially useful because it composes:

- `card`
- `card-size('sm')`
- `card-outlined`
- `card-elevation(200)`
- `floating-card`

That shows another common repo pattern: one higher-level convenience mixin can bundle several smaller mixins into a stable component recipe.

### Where it is used

- generic `.card` classes
- header dropdown shells in [`_header-main.scss`](../../resources/scss/_6-layouts/_header-main.scss)
- mega-menu shells in [`_header-mega-menu.scss`](../../resources/scss/_6-layouts/_header-mega-menu.scss)
- listing filter popovers in [`module-listing/_filters.scss`](../../resources/scss/_5-modules/module-listing/_filters.scss)
- date-picker surfaces in [`_form-date-picker.scss`](../../resources/scss/_4-components/forms/_form-date-picker.scss)

## `@mixin-content-card.scss`

[`_mixin-content-card.scss`](../../resources/scss/_1-lib/mixins/_mixin-content-card.scss) builds the shared linked-card pattern used by listing items and blurbs.

Important mixins:

- `content-card`
- `content-card-vars`
- `content-card-host`
- `content-card-interaction($media-zoom, $underline-color)`
- `content-card-frame`
- `content-card-media`
- `content-card-body`
- `content-card-title-link`

### Pattern

This file is a composition layer on top of the lower-level card and link helpers.

The pattern is:

1. write content-card scoped CSS variables from shared defaults in [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss)
2. establish the host as a full-height card container
3. attach overlay-link and focus-ring behavior so nested title/read-more links can drive whole-card interaction
4. render the visible shell through `content-card-frame`
5. split media, body, and title-link styling into separate mixins so modules can override one region without replacing the whole recipe

### Variable Contract

The defaults come from [`resources/scss/_1-lib/_variables.scss`](../../resources/scss/_1-lib/_variables.scss).

Important variables include:

- `--content-card-bg`
- `--content-card-br`
- `--content-card-px`
- `--content-card-py`
- `--content-card-content-px`
- `--content-card-content-py`
- `--content-card-gx`
- `--content-card-gy`
- `--content-card-media-width`
- `--content-card-media-aspect`
- `--content-card-media-br`
- `--content-card-media-zoom`
- `--content-card-min-height`
- `--content-card-dur`
- `--content-card-ease-hover`
- `--content-card-underline-color`

Those variables let modules customize spacing, media behavior, hover motion, and title underline state without forking the shared structure.

### How The Pieces Fit Together

`content-card` is the top-level entry point. It:

- includes `content-card-vars`
- includes `content-card-host`
- includes `overlay-link-before`
- includes `overlay-focus-ring`

That means the host itself does not render the visible card shell. It sets up the interaction model and scoped variables.

`content-card-frame` renders the visible card container. It maps content-card variables onto the lower-level card contract:

- `--content-card-bg` -> `--card-bg`
- `--content-card-br` -> `--card-br`
- `--content-card-px` -> `--card-px`
- `--content-card-py` -> `--card-py`

It then composes:

- `card`
- `card-outlined`
- `card-elevation(200)`

and adds the content-card-specific layout:

- `display: grid`
- `grid-template-rows: auto 1fr`
- `gap` from the content-card variables
- `overflow: clip`
- transitions for background and shadow

`content-card-media` owns the media region. It sets width, min-height, aspect ratio, overflow, and border radius, and it scales nested `img` elements from `--content-card-media-zoom`.

`content-card-body` creates the flexible text column with the shared content padding.

`content-card-title-link` keeps the title link inheriting surrounding typography while letting the underline color animate from `--content-card-underline-color`.

### Interaction Model

`content-card-interaction()` does not style `:hover` directly on the host.

Instead it uses the overlay helpers from [`_mixin-links.scss`](../../resources/scss/_1-lib/mixins/_mixin-links.scss), which look for hover or focus-visible state on specific nested interactive targets such as:

- `.blurb-read-more`
- `.listing-item-title a`
- `.listing-item-read-more a`

When one of those targets is hovered or focused, `content-card-interaction()` updates:

- `--content-card-media-zoom`
- `--content-card-underline-color`

This allows the image zoom and title underline to react as one system even though the actual interactive element is a nested link or button-like link.

### Expected Structure

The mixins are meant to be split across a small DOM structure rather than dropped onto one selector.

Typical usage looks like:

```scss
.listing-post {
  @include content-card;
  @include content-card-interaction;
}

.listing-post-inner {
  @include content-card-frame;
}

.listing-item-image-wrapper {
  @include content-card-media;
}

.listing-item-text-wrapper {
  @include content-card-body;
}

.listing-item-title {
  @include content-card-title-link;
}
```

That is the same pattern used in:

- [`resources/scss/_5-modules/module-listing/_post.scss`](../../resources/scss/_5-modules/module-listing/_post.scss)
- [`resources/scss/_5-modules/_blurb.scss`](../../resources/scss/_5-modules/_blurb.scss)

### Why It Exists

This mixin family gives the repo one shared answer for “linked card with media, body, hover zoom, and coordinated title underline”.

Without it, listing cards and blurbs would each have to duplicate:

- the card shell composition
- the image zoom transitions
- the overlay-link hover/focus wiring
- the full-height body layout
- the title-link underline behavior

## `@mixin-chip.scss`

[`_mixin-chip.scss`](../../resources/scss/_1-lib/mixins/_mixin-chip.scss) is a compact component-shell mixin.

It defines a small inline chip/tag surface through variables like:

- `--chip-bg`
- `--chip-text`
- `--chip-height`
- `--chip-padding-x`
- `--chip-fs`
- `--chip-br`

What it renders:

- inline-flex layout
- centered content
- chip block size
- inline padding
- background
- border radius

Where it is used:

- listing filter chips in [`module-listing/_filters.scss`](../../resources/scss/_5-modules/module-listing/_filters.scss)

This mixin is a lightweight shell mixin with a narrow, single-purpose surface.

## `@mixin-choice-control.scss`

[`_mixin-choice-control.scss`](../../resources/scss/_1-lib/mixins/_mixin-choice-control.scss) handles checkbox/radio visuals.

Important mixins:

- `choice-control-vars`
- `choice-control-base`
- `choice-control-state-hover`
- `choice-control-state-focus`
- `choice-control-state-checked`
- `choice-control-state-checked-focus`
- `choice-control-state-disabled`

### Pattern

This file uses the same stable/transient variable pattern seen in buttons:

- `--_choice-bg`
- `--_choice-border`
- `--_choice-ring`
- `--_choice-icon`

`choice-control-vars()` initializes the current-state variables.

`choice-control-base()` renders the box:

- dimensions
- background
- border
- ring
- background icon

Then the state mixins only override the state variables.

### Why this pattern is used

The main form selectors in [`_form-choice.scss`](../../resources/scss/_4-components/forms/_form-choice.scss) can stay very readable:

- base state calls `choice-control-vars` and `choice-control-base`
- each pseudo-state calls one matching mixin

That keeps complex form-control state styling from turning into a large monolithic selector block.

### Generated icons

This mixin family also ties into the SCSS function layer:

- `alpha(...)`
- `escape-svg(...)`
- `$check-icon`

This mixin family shows how mixins and functions cooperate in the repo.

## `@mixin-fade-content.scss`

[`_mixin-fade-content.scss`](../../resources/scss/_1-lib/mixins/_mixin-fade-content.scss) is a focused effect/helper file.

Important mixins:

- `mask-image($value)`
- `fade-mask($direction, $fade-width, $dual: false)`
- `fade-content-x($fade-width)`
- `fade-content-left($fade-width)`
- `fade-content-right($fade-width)`
- `fade-content-y($fade-width)`
- `fade-content-top($fade-width)`
- `fade-content-bottom($fade-width)`

### What it does

This family uses CSS masks to fade overflowing content at one or both edges.

The internal helper:

- reads a local `--fade-width` CSS variable when present
- otherwise falls back to the supplied Sass value

That means the effect can be customized at runtime without rewriting the mixin.

### Where it is used

- horizontal slider fade treatment in [`module-slider/_slides.scss`](../../resources/scss/_5-modules/module-slider/_slides.scss)

This mixin family wraps a reusable CSS mask pattern in a small API.

## `@mixin-hide-scrollbar.scss`

[`_mixin-hide-scrollbar.scss`](../../resources/scss/_1-lib/mixins/_mixin-hide-scrollbar.scss) is a small cross-browser utility mixin.

It hides scrollbars while preserving scroll behavior by handling:

- Firefox
- IE/old Edge
- WebKit

Where it is used:

- mobile header containers in [`_header-mobile.scss`](../../resources/scss/_6-layouts/_header-mobile.scss)
- tab navigation in [`_tabs.scss`](../../resources/scss/_5-modules/_tabs.scss)

This mixin centralizes the browser-specific rules needed to hide scrollbars while preserving scroll behavior.

## `@mixin-icon-font.scss`

[`_mixin-icon-font.scss`](../../resources/scss/_1-lib/mixins/_mixin-icon-font.scss) is the Font Awesome bridge layer.

It is more infrastructure-heavy than the other mixin files because it also contains helper functions:

- `fa-is-weight`
- `fa-resolve-weight`
- `fa-resolve-family`
- `fa-parse-args`

Important mixins:

- `fa-icon`
- `fa-render-single`
- `fa-render-duo-layer`
- `fa-render-duotone`
- `icon`
- `fa`

### What it solves

The project wants to work with icon names, optional family arguments, and optional weight arguments without every consumer needing to understand the full Font Awesome variable model.

So the `icon(...)` mixin:

- parses the optional arguments
- resolves family and weight
- decides whether the icon family is duotone
- emits either a single-layer or duotone icon render strategy

### The `%fa-icon` placeholder

Inside `@layer theme`, the file defines `%fa-icon`, which contains the shared icon font rendering rules:

- font-family
- font-weight
- smoothing
- content
- display

Then mixins like `fa-icon()` and `fa-render-single()` extend that placeholder.

That keeps the icon rendering rules centralized and avoids repeating the whole declaration block for every icon consumer.

### Where it is used

- button icon pseudo-elements via [`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss)
- any other icon-bearing components that use `@include icon(...)`

This file plays a role similar to the API mixin file: it standardizes icon-font rendering so higher-level mixins can stay focused on component behavior.

## `@mixin-loading.scss`

[`_mixin-loading.scss`](../../resources/scss/_1-lib/mixins/_mixin-loading.scss) provides a simple loading affordance layer.

Important mixins:

- `loading-overlay`
- `loading-spinner($size: 1.5em, $color: currentColor)`

### What they do

- `loading-overlay` simply establishes `position: relative`
- `loading-spinner()` renders an `::after` pseudo-element using the shared loading icon token and a `spin` animation

This is another example of a convenience abstraction: the actual styling is small, but centralizing it keeps loading affordances consistent.

### Where it is used

- listing result loading states in [`module-listing/_results.scss`](../../resources/scss/_5-modules/module-listing/_results.scss)
- Gravity Forms loading UI in [`_gravity-forms.scss`](../../resources/scss/_4-components/forms/_gravity-forms.scss)

## `@mixin-sr-only.scss`

[`_mixin-sr-only.scss`](../../resources/scss/_1-lib/mixins/_mixin-sr-only.scss) handles visually-hidden accessibility patterns.

Important mixins:

- `visually-hidden`
- `visually-hidden-focusable`
- `sr-only`

### What they do

`visually-hidden` applies the standard accessibility hiding pattern:

- tiny box
- clipped content
- off-normal flow positioning
- hidden overflow

`visually-hidden-focusable` hides the element unless it or its descendants receive focus.

This is particularly useful for skip links.

`sr-only` is just an alias for `visually-hidden`.

### Where it is used

- screen-reader utility class generation in [`_screen-reader.scss`](../../resources/scss/_7-utilities/_screen-reader.scss)
- skip-link behavior in [`_buttons.scss`](../../resources/scss/_4-components/_buttons.scss)

This file is small, but it centralizes visually-hidden helpers so the accessibility pattern stays consistent.

## `@mixin-typography.scss`

[`_mixin-typography.scss`](../../resources/scss/_1-lib/mixins/_mixin-typography.scss) exposes the text scale as a reusable API.

Important mixins:

- `text-base($size-token)`
- `d1`
- `h1` through `h6`
- `text-lg`
- `text-md`
- `text-sm`
- `text-tn`
- `text-mi`

### Pattern

The entire file is built on top of `text-base($size-token)`, which writes:

- `--font-margin`
- `font-size`
- `line-height`
- `letter-spacing`

based on the token name.

Then all the named mixins are just semantic wrappers around that base function.

### Where it is used

- global heading and text class definitions in [`_typography.scss`](../../resources/scss/_4-components/_typography.scss)
- smaller module-specific text treatments such as breadcrumbs in [`_breadcrumbs.scss`](../../resources/scss/_5-modules/_breadcrumbs.scss)

This is the typography equivalent of the component-shell pattern: one base mixin, then several semantic aliases.

## How The Mixin Layer Is Actually Consumed

Most active SCSS partials do not assemble everything from scratch. They compose a few shared mixins.

Examples:

### Card/dropdown surfaces

Header and listing dropdowns often use:

- `card-dropdown`

which bundles a whole recipe of smaller card mixins.

### Form choice controls

Checkboxes and radios use:

- `choice-control-vars`
- `choice-control-base`
- one state mixin per selector branch

### Typography

Typography classes and semantic elements use:

- `h1` through `h6`
- `text-lg` through `text-mi`

### Utility-like helpers

Specific components sprinkle in:

- `hide-scrollbar`
- `loading-spinner`
- `fade-content-x(...)`
- `sr-only`

This is the intended style of the SCSS architecture: compose from a shared library rather than rewriting patterns locally.

## Relationship To The Function Layer

The mixins do not stand alone. Many of them depend directly on the SCSS function layer:

- card and chip mixins use sizing/token helpers indirectly
- choice-control mixins use `alpha(...)` and `escape-svg(...)`
- button mixins use `alpha(...)`, `contrast-color(...)`, and `is-css-var(...)`
- effect mixins and token definitions rely on sizing helpers like `rem(...)`

For the helper layer behind this, see [SCSS Functions Deep Dive](./scss-functions.md).

## Relationship To The Button Deep Dive

The button mixin family is the most sophisticated example in the repo, so it has its own dedicated page:

- [Button Mixins Deep Dive](./button-mixins.md)

If you want to understand the general mixin philosophy of this codebase, start there after reading this file.

## Practical Rules

If you are adding new mixins to this repo, the current codebase suggests a few rules:

- prefer one responsibility per mixin family
- write stable component variables first, then render from them
- split shell, variant, size, and state concerns when the component is complex enough
- create convenience composition mixins like `card-dropdown` only when the recipe is stable and reused
- centralize platform quirks and accessibility patterns instead of repeating them in component files
- expose semantic wrapper mixins when a token scale needs a public API

## Summary

The shared mixin layer is the operational core of the SCSS architecture.

It provides:

- token-to-CSS export helpers
- component shell mixins
- variant and state mixins
- icon/font infrastructure
- accessibility and platform utility helpers
- semantic typography APIs

The button mixins are the deepest example, but the same architectural ideas show up across cards, choice controls, typography, icon rendering, and small effect helpers.
