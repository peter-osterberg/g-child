# Custom Media Reference

The theme defines its shared media-query aliases in [`resources/scss/_1-lib/_custom-media.scss`](../../resources/scss/_1-lib/_custom-media.scss).

Those aliases are consumed in SCSS as author-friendly names like:

- `@media (--sm-up)`
- `@media (--motion-ok)`
- `@media (--mouse)`

They are then expanded into normal media conditions by the `postcss-custom-media` step described in [PostCSS Pipeline Deep Dive](../build-and-tooling/postcss-pipeline.md).

## Why This Exists

Custom media gives the project one shared vocabulary for:

- breakpoint ranges
- motion and accessibility preferences
- input capability differences
- orientation and display capability checks

That avoids repeating raw conditions like `(width >= 576px)` or `(hover) and (pointer: fine)` across many files.

## Where Breakpoint Aliases Come From

Breakpoint aliases are generated from the `$breakpoints` map in [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss).

The current active breakpoint keys are:

- `xs` = `350px`
- `sm` = `576px`
- `md` = `768px`
- `lg` = `992px`
- `nav` = `1100px`
- `xl` = `1200px`
- `xxl` = `1440px`

For each breakpoint key, `_custom-media.scss` generates:

- `--<name>-only`
- `--<name>-up`
- `--<name>-down`

For selected “phone” breakpoints it also generates:

- `--<name>-phone`

## Breakpoint Semantics

The breakpoint values in `$breakpoints` act as upper bounds for each named range, and as threshold values for the generated `-up` and `-down` aliases.

Examples:

- `--xs-only` -> `0 <= width < 350px`
- `--xs-up` -> `width >= 350px`
- `--xs-down` -> `width < 350px`
- `--sm-only` -> `350px <= width < 576px`
- `--sm-up` -> `width >= 576px`
- `--sm-down` -> `width < 576px`

That means `--sm-up` does not mean “inside the `sm` range”. It means “at the `sm` threshold and above”, which starts at `576px`.

## Generated Breakpoint Families

### `--<name>-only`

Use this when you want one bounded range.

Examples:

- `--xs-only`
- `--sm-only`
- `--nav-only`

### `--<name>-up`

Use this when a layout change should start at that breakpoint value and continue upward.

Examples:

- `--sm-up`
- `--nav-up`
- `--xl-up`

### `--<name>-down`

Use this when a rule should apply below that breakpoint value.

Examples:

- `--sm-down`
- `--lg-down`
- `--nav-down`

### `--<name>-phone`

This is a convenience alias for `(--<name>-only) and (--portrait)`.

The generator only emits `-phone` aliases for breakpoint names that are both:

- listed in `$phone-breakpoints`
- present in `$breakpoints`

In the current codebase that means:

- `--xs-phone`
- `--sm-phone`
- `--md-phone`
- `--lg-phone`

## Preference Aliases

These aliases describe user or system preferences:

- `--motion-ok`
- `--motion-not-ok`
- `--opacity-ok`
- `--opacity-not-ok`
- `--use-data-ok`
- `--use-data-not-ok`
- `--os-dark`
- `--os-light`
- `--high-contrast`
- `--low-contrast`
- `--inverted-colors`
- `--forced-colors`

Common usage:

- use `--motion-ok` before adding transitions or transforms
- use `--os-dark` or `--os-light` only for OS preference branching, not for the project’s own theme system
- use `--high-contrast` and `--forced-colors` for accessibility-specific fallback styling

## Orientation, Display, And Input Aliases

The remaining aliases cover device capabilities:

- `--portrait`
- `--landscape`
- `--hd-color`
- `--touch`
- `--stylus`
- `--pointer`
- `--mouse`

Input semantics:

- `--touch` -> `(hover: none) and (pointer: coarse)`
- `--stylus` -> `(hover: none) and (pointer: fine)`
- `--pointer` -> `(hover) and (pointer: coarse)`
- `--mouse` -> `(hover) and (pointer: fine)`

In the current codebase, the usual distinction is:

- `--mouse` for true hover-capable fine pointers
- `--touch` for touch-first interactions where `:hover` should not drive state

## Typical Usage Patterns

### Layout breakpoint

```scss
@media (--sm-up) {
	.module-listing-results {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
```

### Motion-aware interaction

```scss
@media (--motion-ok) {
	transition: opacity 180ms ease, transform 180ms ease;
}
```

### Input-aware hover behavior

```scss
@media (--mouse) {
	&:hover {
		--_btn-bg: var(--btn-bg-hover);
	}
}
```

## Practical Rules

- Prefer a custom media alias when the condition is part of the shared system.
- Prefer `-only` for bounded responsive adjustments.
- Prefer `-up` and `-down` for threshold-based layout changes.
- Prefer `--mouse` and `--touch` over raw `(hover)` and `(pointer)` checks when matching the existing interaction model.
- Keep raw media queries for one-off conditions that are not part of the project-wide vocabulary.

## Related Docs

- [SCSS And Tokens](./scss-and-tokens.md)
- [Button Mixins Deep Dive](./button-mixins.md)
- [PostCSS Pipeline Deep Dive](../build-and-tooling/postcss-pipeline.md)
