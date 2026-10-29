# Button Mixins Deep Dive

> Status: verified against the current button mixin and public class layers. Treat this as an architectural reference for the button system; exact property-by-property details can drift as the mixins evolve.

The shared button system lives primarily in [`resources/scss/_1-lib/mixins/_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss).

That file defines the shared button behavior for the theme. The builder Button module only feeds class names into this system. The mixins themselves define:

- button structure
- state handling
- variant behavior
- semantic color binding
- size behavior
- icon-only behavior
- icon pseudo-elements

The public class layer for those mixins is in [`resources/scss/_4-components/_buttons.scss`](../../resources/scss/_4-components/_buttons.scss).

## The Main Idea

The button mixins are built around CSS custom properties rather than hardcoded final values.

That gives the project a composable stack:

1. SCSS tokens in [`resources/scss/_1-lib/_variables.scss`](../../resources/scss/_1-lib/_variables.scss) define default spacing, typography, border, motion, and icon values.
2. Mixins write component-scoped CSS variables like `--btn-bg`, `--btn-color`, `--btn-py`, and `--btn-min-height`.
3. State logic in the base mixin maps those stable variables into current-state variables like `--_btn-bg`.
4. Public classes such as `.btn-filled`, `.btn-primary`, `.btn-lg`, and `.btn-icon-start` compose those mixins into actual button APIs.

That means the system is not “one big button style”. It is a small variable-driven runtime for button styling.

## Where The Public Classes Come From

[`_buttons.scss`](../../resources/scss/_4-components/_buttons.scss) turns the mixins into reusable classes:

- `.btn` -> `@include btn`
- `.btn-filled`, `.btn-outline`, `.btn-ghost`, `.btn-text` -> `@include btn-variant(...)`
- `.btn-sm`, `.btn-lg` -> `@include btn-size(...)`
- `.btn-primary`, `.btn-secondary`, etc -> `@include btn-color(...)`
- `.btn-icon-start`, `.btn-icon-end` -> icon pseudo-element mixins
- `.btn-square`, `.btn-round`, `.btn-block` -> layout and icon-only helpers

That file shows the intended composition model:

- one base class
- one variant class
- zero or one color classes
- zero or one size classes
- optional modifier/icon classes

## Variable Model

The easiest way to understand the mixins is to separate their variables into three layers.

### 1. Token layer

The SCSS token layer comes from [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss).

Examples:

- `$btn-padding-y`
- `$btn-padding-x`
- `$btn-font-size`
- `$btn-border-radius`
- `$btn-min-height`
- `$btn-duration`
- `$btn-easing`
- `$btn-icon-size`

These are the design defaults. They are not stateful.

### 2. Button API layer

The mixins write stable component variables like:

- `--btn-bg`
- `--btn-text`
- `--btn-border`
- `--btn-color`
- `--btn-color-text`
- `--btn-color-hover`
- `--btn-color-active`
- `--btn-py`
- `--btn-px`
- `--btn-fs`
- `--btn-min-height`

These are the variables that variant, color, and size mixins coordinate through.

### 3. Current-state layer

The base `btn` mixin introduces transient variables:

- `--_btn-bg`
- `--_btn-text`
- `--_btn-border`

These are the values the element actually renders from:

- `color: var(--_btn-text)`
- `background-color: var(--_btn-bg)`
- `border: ... solid var(--_btn-border)`

That distinction is the core pattern.

The stable variables like `--btn-bg-hover` define what hover should mean. The transient variables `--_btn-*` define what the element is currently showing right now.

## The Base `btn` Mixin

`@mixin btn` is the foundation. Everything else assumes it exists.

It handles:

- inline-flex button layout
- gap, padding, min-height, typography, border, radius
- disabled-state behavior
- hover and active state variable switching
- motion-aware transitions

### What it actually renders

The base mixin outputs the physical button box:

- `display: inline-flex`
- `align-items: center`
- `justify-content: center`
- `white-space: nowrap`
- `appearance: none`
- `cursor: pointer`
- `background-color: var(--_btn-bg)`
- `border: ... solid var(--_btn-border)`
- `color: var(--_btn-text)`

That means `btn` is not only a reset. It is the actual rendering shell.

### Why the `--_btn-*` variables matter

The base mixin starts with:

```scss
--_btn-bg: var(--btn-bg, transparent);
--_btn-text: var(--btn-text, currentcolor);
--_btn-border: var(--btn-border, transparent);
```

Then hover and active states only swap those transient variables.

That has two advantages:

- variant and color mixins only need to define semantic state values once
- the rendered properties always read from one consistent set of current-state variables

This is cleaner than rewriting `background-color`, `border-color`, and `color` directly in every state block.

### Disabled state

The disabled selector covers several forms:

- `:disabled`
- `[disabled]`
- `[aria-disabled='true']`
- `.disabled`

That is deliberate because this theme supports both real `<button disabled>` elements and `<a aria-disabled="true" class="disabled">` link-like buttons.

In the disabled state, the mixin:

- disables pointer events
- sets `cursor: not-allowed`
- applies `opacity: var(--btn-disabled-opacity, ...)`

The base mixin currently does not remap the rendered colors to separate disabled-state CSS variables. Disabled appearance is handled through interaction blocking and opacity.

### Input-mode-specific interaction handling

The base mixin uses custom media from [`resources/scss/_1-lib/_custom-media.scss`](../../resources/scss/_1-lib/_custom-media.scss):

- `@media (--mouse)` for hover-capable fine pointers
- `@media (--touch)` for coarse touch input
- `@media (--motion-ok)` when reduced motion is not requested

This matters because the button system does not assume hover exists everywhere.

Behavior:

- on mouse devices, `:hover` and `:active` can each get distinct state values
- on touch devices, `:active` reuses the hover state values
- transitions only run when motion preferences allow them

This centralizes interaction differences in the shared base layer instead of making each button consumer solve that separately.

## The `btn-variant()` Mixin

`@mixin btn-variant($name)` decides how a button should use the current color semantics.

Supported variants in this file:

- `filled`
- `tonal`
- `outline`
- `ghost`
- `text`

### `filled`

The filled variant maps the semantic color directly into the button box:

- background = `--btn-color`
- text = `--btn-color-text`
- border = `--btn-color`

Hover and active use the `--btn-color-hover` and `--btn-color-active` variables.

This is the most standard button mapping.

### `tonal`

The tonal variant creates translucent surfaces from the color token using the helper `alpha(...)`.

Examples:

- background = `alpha(var(--btn-color), 12%)`
- border = `alpha(var(--btn-color), 16%)`

This is why tonal buttons work well for subtle icon buttons such as social media links. They tint the surface instead of filling it fully.

### `outline`

The outline variant makes the border carry the main color while the background stays transparent until interaction.

Key behavior:

- idle background is transparent
- border uses `--btn-color`
- hover fills the background with `--btn-color`
- hover text flips to `--btn-color-text`

### `ghost`

The ghost variant keeps both background and border mostly transparent and uses translucent fills on interaction.

This is useful for filters, lightweight controls, and places where a filled button would be visually too heavy.

### `text`

The text variant is the most special case.

It does not behave like the other variants:

- background stays transparent
- border is effectively removed
- padding is set to `0`
- border radius is set to `0`
- min-height is set to `0`

It also underlines the inner `span` and hides that underline on hover/focus/active.

The practical consequence is that `.btn-text` is not just a color skin. It turns the button into a link-like inline control.

One detail to note is that this variant uses `currentcolor` rather than semantic `--btn-color` values, which is why the Button module does not expose the normal color field for text-style buttons.

## The `btn-color()` Mixin

`@mixin btn-color($name)` binds a button to either:

- a named semantic token like `primary`
- a literal color
- `currentcolor`
- a CSS variable like `var(--bullet)`

This mixin supports both design-system colors and local runtime colors.

### Semantic-token mode

When called like:

```scss
@include btn-color('primary');
```

it outputs:

- `--btn-color: var(--primary)`
- `--btn-color-text: var(--primary-text)`
- `--btn-color-hover: var(--primary-hover)`
- `--btn-color-active: var(--primary-active)`

This is how the theme ties buttons into the global color-theming system.

### Literal-color mode

When called with a literal Sass color:

```scss
@include btn-color(#222);
```

the mixin writes:

- `--btn-color: <that color>`
- `--btn-color-text: contrast-color(...)`
- hover and active colors by mixing toward the text color with `color-mix(...)`

### Runtime-color mode

When called with `currentcolor` or a CSS variable:

```scss
@include btn-color(var(--bullet));
@include btn-color(currentcolor);
```

the mixin switches to a different path.

It writes:

- `--btn-color: <that value>`
- `--btn-color-hover: var(--btn-color)`
- `--btn-color-active: var(--btn-color)`
- `--btn-color-text: var(--btn-on-color, #fff)`

This is why the same button system can be reused for cases like:

- slider bullets using `var(--bullet)`
- listing filter close buttons using `currentcolor`

### Why the helper functions matter

The mixin depends on helper functions from [`_function-color-mix.scss`](../../resources/scss/_1-lib/functions/_function-color-mix.scss):

- `alpha($color, $alpha)`
- `contrast-color($value)`
- `is-current-color($value)`
- `is-css-var($value)`

Those helpers let the mixin distinguish between:

- named semantic tokens
- actual Sass color values
- CSS variable strings
- `currentcolor`

Without that branch, the button system could not safely support both theme tokens and runtime-computed colors.

For the full SCSS helper layer, including sizing, SVG escaping, and generated icon data-URI functions, see [SCSS Functions Deep Dive](./scss-functions.md).

## The `btn-size()` Mixin

`@mixin btn-size($size)` changes the dimension variables, not the final rendered box directly.

Supported modes:

- `sm`
- `lg`
- a numeric/custom value
- a CSS variable value

### Preset sizes

For `sm` and `lg`, the mixin overrides:

- `--btn-py`
- `--btn-px`
- `--btn-fs`
- `--btn-gap`
- `--btn-min-height`

### Custom size mode

If the argument is a number or CSS variable, the mixin only sets:

- `--btn-min-height`

This is why components like slider bullets can do:

```scss
@include btn-size(1.5rem);
```

and get a square control size without inheriting the normal small/large padding model.

## Layout And Shape Mixins

Several smaller mixins build on the base variable system.

### `btn-block`

This one is simple:

- `width: 100%`

It is a layout helper, not a visual variant.

### `btn-icon-only($style)`

This mixin also changes control sizing and icon layout, not only shape.

It turns a button into an icon button by:

- removing gap
- forcing `inline-size` to the button min-height
- removing padding
- setting `line-height: 1`
- resizing pseudo-elements and SVGs to a rounded `1em`-based size

It also chooses shape behavior:

- `round` -> round radius
- `square` -> smaller corner radius

This mixin is one reason the button system is reusable outside “normal CTA buttons”. It works equally well for arrows, close buttons, social icons, and small utility controls.

### `btn-square` and `btn-round`

These are just convenience wrappers around `btn-icon-only(...)` with explicit shape selection.

## Icon Mixins

The icon mixins split into two concerns:

- icon sizing
- icon insertion and animation

### `btn-icon`

This mixin only sets:

- `font-size: var(--btn-icon-fs, ...)`

It is used both for pseudo-element icons and for inline SVG icon sizing hooks.

### `btn-icon-start()` and `btn-icon-end()`

These mixins create pseudo-element icons:

- start icon uses `::before`
- end icon uses `::after`

Defaults come from [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss):

- start icon = `angle-left`
- end icon = `angle-right`

They call the shared `icon(...)` mixin from [`mixin-icon-font.scss`](../../resources/scss/_1-lib/mixins/_mixin-icon-font.scss), then apply button-icon sizing and optional motion.

### Hover translation behavior

These mixins animate using `translate`, but they do not invent the movement value themselves.

Instead:

- the base `btn` mixin sets `--btn-icon-translate: 0.25em` on hover/active
- `btn-icon-start()` uses `translate: calc(var(--btn-icon-translate, 0) * -1)`
- `btn-icon-end()` uses `translate: var(--btn-icon-translate, 0)`

That means icon motion is coordinated through variables, just like color and size are.

### The `$animate` flag

Both icon mixins accept `$animate: true` by default.

Setting `$animate: false` keeps color transitions but disables the translate animation.

That is used in places like slider arrows and pagination controls where the extra directional nudge is not wanted.

## How Custom SVG Icons Fit In

The button system supports two icon strategies:

- generated font-icon pseudo-elements
- custom SVG markup rendered by the template layer

The public class layer in [`_buttons.scss`](../../resources/scss/_4-components/_buttons.scss) includes:

```scss
.btn-icon-only,
.btn-custom-icon-start,
.btn-custom-icon-end {
	.svg-icon {
		@include btn-icon;
	}
}
```

And the pseudo-element icon mixins deliberately guard against clashes:

- `btn-icon-start()` only applies on `:not(.btn-custom-icon-start)::before`
- `btn-icon-end()` only applies on `:not(.btn-custom-icon-end)::after`

That is how the Button module can switch from default decorative pseudo-icons to template-rendered SVG icons without double-rendering.

## Cascade Layer Structure

The mixins are emitted inside `@layer components`, with smaller conceptual sublayers such as:

- `root`
- `variant`
- `color`
- `size`

This structure does two things:

- it keeps button rules inside the overall component layer of the project
- it separates different concerns so the compiled CSS stays easier to reason about

The main architectural split is still the variable split:

- `btn` defines the shell and current-state variables
- variant mixins define how a color should behave
- color mixins provide the semantic palette
- size mixins adjust dimensional variables

## Recommended Composition Order

When authoring a custom control with these mixins, the normal composition is:

```scss
.my-control {
	@include btn;
	@include btn-variant('filled');
	@include btn-color('primary');
	@include btn-size('sm');
}
```

Then add optional helpers such as:

- `@include btn-icon-start`
- `@include btn-icon-end`
- `@include btn-icon-only`
- `@include btn-round`
- `@include btn-block`

This matches how the project uses the system across components and modules.

## Real Examples In This Repo

### Standard class-based buttons

[`_buttons.scss`](../../resources/scss/_4-components/_buttons.scss) builds the reusable button class API for general theme usage.

### Social icon buttons

[`resources/scss/_5-modules/_social-media.scss`](../../resources/scss/_5-modules/_social-media.scss) composes:

- `btn`
- `btn-icon-only`
- `btn-color('primary')`
- `btn-variant('tonal')`

That creates a subtle tonal icon button without needing a separate “social button” system.

### Slider arrows

[`resources/scss/_5-modules/module-slider/_controls.scss`](../../resources/scss/_5-modules/module-slider/_controls.scss) composes:

- `btn`
- `btn-color('primary')`
- `btn-variant('filled')`
- `btn-icon-only`
- `btn-icon-start(..., $animate: false)` or `btn-icon-end(..., $animate: false)`

That shows how the mixins can be used for utility controls, not just content buttons.

### Dynamic-color bullets

The same slider file also uses:

```scss
--bullet: #{tonal(var(--bg-color, #{$background-base}))};
@include btn-color(var(--bullet));
```

This example shows why `btn-color()` supports CSS variable inputs instead of only semantic token names.

## Practical Rules

When working with this system, the main rules are:

- always start with `@include btn`
- treat `btn-variant()` as behavior, not just cosmetics
- treat `btn-color()` as the semantic bridge into the theme system
- use `btn-size()` to change variable inputs, not to patch layout after the fact
- use `btn-icon-only()` when the control is structurally an icon button
- use custom-icon classes when rendering SVG icons from templates

## Summary

The button mixins form a small composition system:

- `btn` renders the shell and state machine
- `btn-variant()` decides how the color semantics become a visual style
- `btn-color()` binds the control to either semantic theme colors or local runtime colors
- `btn-size()` adjusts dimensional variables
- icon and shape mixins specialize the result for icon-driven controls

As a result, the same mixin stack can power:

- normal CTA buttons
- text buttons
- filter chips
- slider arrows
- pagination controls
- social media icons
- button-builder output from the page builder
