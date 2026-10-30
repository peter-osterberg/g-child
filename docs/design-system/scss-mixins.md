# SCSS mixin ownership

`resources/scss/_1-lib/mixins/` contains general helpers shared across components. Component mixins live with their component and are imported explicitly.

## Global helpers

| File | Purpose |
| --- | --- |
| `_mixin-custom-media.scss` | Generate named responsive media definitions from supplied breakpoints |
| `_mixin-api.scss` | Emit tokens as CSS custom properties and utilities |
| `_mixin-icon-font.scss` | Font Awesome family, weight and glyph rendering |
| `_mixin-sr-only.scss` | Visually hidden and focusable screen-reader content |
| `_mixin-links.scss` | Overlay links and shared link interaction helpers |
| `_mixin-clamp-lines.scss` | Multiline text truncation |
| `_mixin-fade-content.scss` | Content fade masks |
| `_mixin-hide-scrollbar.scss` | Hide scrollbars while preserving scrolling |
| `_mixin-offset-inset.scss` | Align content with shared page edges |

The library index forwards functions and general mixins only. It does not forward theme values or media definitions. Theme generation lives in `resources/scss/_2-themes/_mixins.scss` and is imported by the theme color generator.

## Component mixins

| Owner | Import | Examples |
| --- | --- | --- |
| Button | `@components/button` | `button`, `variant`, `size`, `icon-only`, `icon-start`, `icon-end` |
| Card | `@components/card` | `card`, `shell`, `size`, `interactive` |
| Forms | `@components/forms` | `input`, `select`, `checkbox`, `radio`, `input-leading-icon` |
| Chip | `@components/chip` | `chip`, `selected` |
| Dropdown | `@components/dropdown` | `control`, `menu`, `option`, `selected` |
| Typography | `@components/typography` | `body`, `heading`, `size`, `prose` |

```scss
@use '@components/button';
@use '@components/forms';

.action {
  @include button.button($variant: outline);
}

.email-input-wrapper {
  @include forms.input-leading-icon('envelope');
}
```

Old global button, card, typography and choice-control implementations have been removed. Chip and input-icon forwarding files have also been removed; import the owning component directly. The unused legacy loading and content-card recipes were removed rather than introducing additional component implementations.

Module compositions, such as listing search, filters and post cards, stay under `resources/scss/_5-modules/` and use component mixins. See [component ownership](./component-ownership.md) for component details and Figma import flow.

## Values and emitted CSS

- `_2-themes/_tokens.scss` owns global design scales, palette and theme maps.
- `_2-themes/_shared-tokens.scss` holds imported shared Sass values; `_shared-values.scss` emits their CSS variables.
- `_2-themes/_icon-config.scss` owns shared icon families and weights. Button and forms own their local `_config.scss` choices.
- `_2-themes/_media.scss` emits custom-media definitions. Stylesheet entrypoints import it explicitly when using named queries.
- `_3-base/_icons.scss` owns shared SVG icon styling; `_typography.scss` owns default body, heading and link styling.
- Form-specific SVG generators live in `_4-components/forms/_svg-icons.scss`.

The old global `_variables.scss` was removed. Its unused component settings were not carried forward.
