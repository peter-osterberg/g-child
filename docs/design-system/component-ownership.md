# Component and module SCSS

Shared components live in `resources/scss/_4-components/`. Each component owns its tokens, mixins, public classes and an index that forwards its mixins. Importing that index emits no CSS. Public classes and module selectors use the same mixins.

Module compositions live in `resources/scss/_5-modules/`. Their local parts do not need the four-file component structure. Move a part into shared components when it has another concrete owner.

## Focus rings

`_3-base/_focus.scss` defines the shared zero-specificity `:focus-visible` outline in the `base` layer. `--focus-ring-color` comes from semantic theme colors, `--focus-ring-width` from shared tokens, and `--focus-ring-offset` defaults to `2px` in `_2-themes/_shared-values.scss`. Components override these variables when needed instead of declaring another outline. Buttons, ordinary links, listing controls and Gravity Forms buttons inherit the global offset. Form controls use zero and dropdown options use `-2px`; chips explicitly use `2px` to reset inherited control offsets. Width and color inherit the global focus tokens rather than the exported per-component ring fields.

Component focus selectors still own paint and selection changes. Gravity Forms error summaries retain a variable-based `:focus` outline because script-driven error navigation must stay visible regardless of keyboard/pointer modality. Overlay helpers that draw a ring on an unfocused parent also retain their explicit variable-based outline.

## Listing

`app.scss` loads `listing/_index.scss`, which groups:

| File | Ownership |
| --- | --- |
| `_layout.scss` | Module spacing and the result grid |
| `_filters.scss` | Search, taxonomy filters, active chips and dropdown bindings |
| `_pagination.scss` | Numbered navigation, current page, ellipsis and load more |
| `_post.scss` | Card composition, content spacing and overlay links |

Pagination stays inside listing. Change its appearance or add a listing-specific modifier in `_pagination.scss`. It reuses button styling rather than becoming a global pagination component.

These styles bind to G-Theme 3.11.9 markup and its existing JavaScript states. In particular, taxonomy dropdowns use `.terms-dropdown.open`, options use `aria-selected`, and active filters use `.listing-active-filter-item`. PHP and JavaScript remain owned by the parent module.

Grid columns follow the inline variables produced by the backend: `--listing-cols` and `--listing-cols-{container,xlarge,large,medium,small,xsmall}`. Smaller unset breakpoints inherit the next larger configured value. The breakpoint widths match the current shared theme scale. If the site's image breakpoint filter or container width changes, update the mapping in `_layout.scss` to match.

## Shared dropdown and chip

Both components have public classes for direct use and mixins for existing module markup:

```scss
@use '@components/chip';
@use '@components/dropdown';

.selected-filter {
  @include chip.chip;
  @include chip.selected;
}

.filter-control {
  @include dropdown.control;
}
```

Dropdown exposes `shell`, `control`, `menu`, `option` and `selected`. Its public classes are `.dropdown`, `.dropdown-control`, `.dropdown-menu` and `.dropdown-option`; `.is-open` controls the public menu's visibility. Opening, closing, ARIA updates and keyboard interaction belong to the owner. Listing uses its parent module's implementation.

Chip and dropdown options use direct normal/selected colors. Chip retains one border state value so hover can override selection, and dropdown retains one hover-background state value so selected options keep their fill. Typography keeps only the spacing variables required to compose size and prose.

Chip exposes `chip` and `selected`. Its public `.chip` class accepts `.is-selected` or `aria-pressed="true"`. The old `@lib` chip import forwards to this implementation; it does not contain another renderer.

## Figma values for button, card and forms

These three components consume the exported map structure directly in their local `_tokens.scss` files. Their mixins assign private CSS variables; their shell writes the CSS properties and interaction selectors. Public classes call the same mixins as module compositions and Gravity Forms.

The imported source snapshot is `resources/lib/figma/component-export.scss`. It is data for the importer, not a Sass entry point. Import a new plugin export with:

```sh
node console/import-component-scss.mjs /absolute/path/to/figma-export.scss
```

The export contains Sass maps only. `$variable-values` holds authored values under their CSS names, without the `--` prefix; it emits no CSS. The importer resolves button and card aliases directly into their base and size maps and writes `$shared-values` to `_1-lib/_shared-values.scss`. It also replaces the three local component map files. The theme generates shared scales on `:root` through `_2-themes/_shared-values.scss`. Button and card store final component values in their base and size maps, with no intermediate value maps or Sass resolvers. Both emit the selected size defaults for public classes and mixin compositions. Shared control heights remain global because buttons and form controls use the same scale. Component typography is excluded from the global typography generator. It does not overwrite the global palette or typography scale. The exporter uses the theme's names directly: `--font-size-sm`, `--body-font-family`, `--body-font-weight`, `--border` and `--primary-bg`. There is no alias layer. The input keeps export names such as `button-py-md`; those button aliases do not become CSS declarations. Map properties use `padding-block` and `padding-inline`.

Button exports only typography and sizes from Figma. The theme-owned `variant($variant, $color)` mixin sets the final component values directly from semantic colors, for example `--_button-hover-background: var(--secondary-bg-subtle-hover)`. There is no intermediate palette-variable layer or color-specific Sass map. `$colors` and `$variants` live in the button token file and are included by the importer. They are simple lists used to generate public classes.

The complete `button($color, $variant, $size, $interactive: true)` mixin composes shell, size and variant. `$interactive: false` keeps the normal button styling without interaction selectors or a pointer cursor, as used for the current pagination page. `shell($size: md, $interactive: true)` emits the selected size once, so public buttons have medium sizing when no size class is present. `reset-appearance` clears previous differences before pagination applies `variant(filled)`. Shared defaults live in the shell and variants set their differences. The shell owns focus, hover, pressed and disabled selectors; focus rings use the shared focus color. Ghost uses the subtle tokens directly, with no additional opacity. Font icons use the shared `@lib/mixins/mixin-icon-font` API through `icon-start($name)` and `icon-end($name)`. Their defaults come from `$icon-button-start` / `$icon-button-end` in the shared configuration. Icon-only controls use the end icon by default; pass `$name` to `icon-only` to choose another glyph. The shared icon mixin owns pseudo-element content; the control's visible text or accessible label provides its name. Existing SVG icons keep the backend's `.svg-icon-start`, `.svg-icon-end` and `.svg-icon-only` hooks. `btn-custom-icon-start` / `btn-custom-icon-end` suppress the corresponding font icon; icon-only font rendering is suppressed when `.svg-icon-only` is present. `square` and `round` set geometry only and never render an icon. `icon-only($round: false, $name: ...)` reuses the chosen shape and adds the font icon. `.btn-icon-only.btn-round` combines the icon with a round shape; pagination uses `square` for geometry without a generated glyph. Public overrides remain `--button-padding-block`, `--button-padding-inline`, `--button-gap`, `--button-font-family`, `--button-font-weight`, `--button-font-size`, `--button-radius`, `--button-color`, `--button-bg`, `--button-border` and `--button-shadow`. Size aliases stay in Sass. Icon-only width and height use fixed `rem()` dimensions; font sizes and spacing retain their existing fluid behavior. Padding is used as authored, without automatic border subtraction.

Card exposes `shell($size: md)`, `size`, `state`, `interactive` and the complete `card($size)` mixin. Compositions emit the selected size once. Size-specific export aliases stay in Sass; public overrides are `--card-padding-block`, `--card-padding-inline`, `--card-border-radius`, `--card-border-width`, `--card-bg`, `--card-border` and `--card-shadow`. Colors, borders and shadows use direct CSS properties with public overrides, without forwarding variables. Interactive values come from `$card-states` and emit only differences from the shell; sizing remains independent of interaction states. A standalone `state($state)` remains complete; pass `$from` when replacing a known state and only its differences are needed.

Forms exposes `field`, `label`, `message`, `message-state($status)`, `validation($status)`, `input($size: md)`, `size($size: md)`, `input-icon`, `checkbox`, `radio` and `choice`. Input sizes live in the theme-owned `forms/_sizes.scss`: sm, md and lg. The md entry reads the current Figma input values; additional sizes use existing control, spacing and type tokens. Imports do not overwrite this file. Classes `.input-sm`, `.input-md` and `.input-lg` apply to native text controls or `.input`. Add another entry to `$input-sizes` to generate its class automatically. Use `@include forms.input(lg)` to build a control or `@include forms.size(sm)` to resize an existing control, including a dropdown. Sizing affects the control, not its label/message or checkbox/radio. Textareas keep their separate minimum block size. Local input dimensions can be adjusted with `--input-min-height`, `--input-font-size`, `--input-padding-block` and `--input-padding-inline`. Checkbox/radio retain native input semantics; CSS draws the indicator and the exported states. Forced-colors mode uses native appearance. Gravity Forms and dropdown controls use these same mixins.

Input shells and states use final color, background, border, shadow and opacity values directly; there are no forwarding `--_input-*` appearance variables. The private input variables are limited to selected sizing and the select image. Public input color and dimension overrides remain available. Message typography is emitted once for the public status classes and once for Gravity Forms; `message-state` emits the status color, while `validation` remains the complete message composition.

Form maps follow component responsibility: `$input` contains control appearance, typography and `placeholder-color`; `$input-states` contains only differences from that base. There is no separate value/placeholder text component or input-parts tree. `$label` contains label typography and color. `$field-message` and `$field-message-states` own descriptive/validation messages independently of inputs. Field messages use the size authored in Figma (currently body-md), rather than inheriting the input's sm size. `$input-icon` / `.input-icon` only set icon size and color; shared icon rendering remains separate. Disabled fields apply the field message's disabled state. Boolean Figma settings do not exclude styling for hidden parts.



After importing, run `pnpm run build`, then `node console/check-component-scss.mjs` to verify public class/mixin parity and component variable references. Visual, keyboard and screen-reader checks still belong to the rendered site.

Checkbox and radio share `$choice` and `$choice-states`. `$checkbox` / `$radio` contain radius and an indicator name (`check` or `dot`). Any other authored differences, including state differences, stay in the control map under their own properties / `states`. Both public mixins use `choice-control($variant)`; native semantics and forced-colors appearance are preserved.

Choice rows (`.choice`, Gravity Forms choices and the `choice` mixin) share label typography. Direct controls inherit that typography and use `translateY(calc((1lh - var(--_choice-block-size)) / 2))` to center on the first line, including wrapped labels. Set text size/line-height on the row and control size with `--choice-size`; standalone controls have no row offset.

Choice SVGs live in `forms/_indicators.scss`; `image($shape, $color)` returns an escaped SVG URL with its fill, following the old SVG function pattern. Native checkbox/radio controls and dropdown markers share `choice-box`: the same padding, border, radius and centered background image at 100% of the content box. Selection changes `--_choice-image`; no mask or separate indicator layer is used. `control-images` publishes checked, hover, focus and disabled images at each theme boundary. Fill colors resolve from the palette, semantic aliases and the theme’s Light/Dark choice at Sass build time; runtime CSS-variable changes alone do not recolor an SVG image. Unchecked controls have no image; checked-disabled controls keep their indicator. Forced-colors mode removes the image and restores native appearance. Dropdown markers use the same themed SVG images. In forced colors they use a system-colored background image so selection remains visible.

Listing dropdown markers are composed directly in `_5-modules/listing/_filters.scss`; no additional backend classes are needed:

```scss
.filter-dropdown a {
  @include dropdown.option;
  @include dropdown.option-choice;

  grid-template-columns: var(--_choice-inline-size) minmax(0, 1fr) auto;
}

.filter-dropdown [aria-selected='true'] > a {
  @include dropdown.selected;
  @include dropdown.option-choice-selected;
}
```

G-Theme places `aria-selected` on the parent `<li>`, so `option-choice-selected` applies the checked palette and its hover/focus states to the link. The grid reserves columns for marker, label and optional result count. Existing markup and JavaScript own keyboard interaction and selection. The marker uses only `::before`, with the same box and background-image rendering as a native checkbox, centered on the first line. To use a dot internally, pass the forms `$radio` map to both choice mixins.

Theme ownership: `$themes` in `_1-lib/_tokens.scss` owns each theme's mandatory `bg-canvas`, `color-scheme` and color differences. `$theme-colors` holds shared semantic colors. There is no separate `$canvases` map. Extra Figma modes choose the Light/Dark base with the most matching values (Light on a tie), and export only differences beyond their mandatory canvas and scheme. Shared definitions reset inherited overrides and bind aliases locally at every theme boundary. See `_2-themes/README.md` and run `node console/check-theme-colors.mjs`.

Icon mixins accept `$animation: none` or `$animation: slide`, matching Figma's Button Icon animation names. For example, `@include button.icon-end('arrow-right', $animation: slide)` or `@include button.icon-only($name: 'plus', $weight: 900, $animation: slide)`. Slide moves the generated glyph half its width outward on hover, keyboard focus and pressed states, only under `prefers-reduced-motion: no-preference`. Disabled controls do not move. Duration and easing use the exported `--motion-duration` and `--motion-easing`. The parameter is explicit for each composition; Figma component settings remain data and do not automatically animate every button. Existing custom SVG slots are left unchanged.
