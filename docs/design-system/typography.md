# Typography

This theme has a dedicated typography system rather than scattered one-off font declarations.

The contract is split across token maps, generated CSS variables, base flow rules, and a small set of public element and utility bindings.

## Source Files

- token maps: [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss)
- generated CSS variable export: [`resources/scss/_2-themes/_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss)
- shared Sass aliases: [`resources/scss/_1-lib/_variables.scss`](../../resources/scss/_1-lib/_variables.scss)
- typography mixins: [`resources/scss/_1-lib/mixins/_mixin-typography.scss`](../../resources/scss/_1-lib/mixins/_mixin-typography.scss)
- base document flow rules: [`resources/scss/_3-base/_typography.scss`](../../resources/scss/_3-base/_typography.scss)
- semantic element and utility bindings: [`resources/scss/_4-components/_typography.scss`](../../resources/scss/_4-components/_typography.scss)

## Token Model

The main typography maps in [`_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss) are:

- `$font-family`
- `$font-weight`
- `$font-size`
- `$font-space`
- `$line-height`
- `$letter-spacing`

[`_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss) exports those maps onto `:root` as:

- `--ff-*`
- `--fw-*`
- `--fs-*`
- `--font-space-*`
- `--lh-*`
- `--ls-*`

Current family aliases:

- `primary` -> `inter tight`
- `secondary` -> `inter`
- `mono` -> `ui-monospace, sfmono-regular, menlo, consolas, monospace`
- `base` -> `var(--ff-primary)`

Current scale tokens in [`_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss):

- display and headings: `d1` -> `size(110)`, `h1` -> `size(64)`, `h2` -> `size(42)`, `h3` -> `size(34)`, `h4` -> `size(24)`, `h5` -> `size(20)`, `h6` -> `size(16)`
- text sizes: `lg` -> `size(24)`, `md` -> `size(20)`, `sm` -> `size(17)`, `tn` -> `size(15)`, `mi` -> `size(13)`
- headings and display use `1.2` line-height
- body-sized text uses `1.6` line-height
- all current size tokens use `0em` letter-spacing

Each size token also has a matching `font-space` value. That rhythm token feeds the document flow rules through `--font-margin`.

## Base Runtime Behavior

[`_reset.scss`](../../resources/scss/_3-base/_reset.scss) applies the typography defaults at the document level:

- `html` gets the base family and line-height
- `body` gets the base font size and weight
- form controls inherit font metrics instead of redefining them

[`_3-base/_typography.scss`](../../resources/scss/_3-base/_typography.scss) then normalizes content flow:

- headings set spacing on the following sibling
- paragraphs, lists, blockquotes, and `pre` blocks use shared follow-on spacing
- paragraphs inherit the current type metrics and use `text-wrap: pretty`
- lists, description lists, blockquotes, `code`, and `pre` get baseline content styling

## Mixins And Public Selectors

[`_mixin-typography.scss`](../../resources/scss/_1-lib/mixins/_mixin-typography.scss) exposes the reusable Sass API:

- `text-base($size-token)`
- `d1`
- `h1` through `h6`
- `text-lg`, `text-md`, `text-sm`, `text-tn`, `text-mi`

`text-base($size-token)` is the core primitive. It sets:

- `--font-margin`
- `font-size`
- `line-height`
- `letter-spacing`

[`_4-components/_typography.scss`](../../resources/scss/_4-components/_typography.scss) binds those mixins to semantic elements and utility classes:

- `h1` through `h6`
- `.h1` through `.h6`
- `.large`, `.text-lg`, `.lg`
- `.medium`, `.text-md`, `.md`
- `.small`, `.text-sm`, `.sm`
- `.tiny`, `.text-tn`, `.tn`
- `.micro`, `.text-mi`, `.mi`

A `d1` mixin exists for a display size, but the public `.d1` selector currently reuses the `h1` mixin. This is documented here because the token exists even though the exposed class does not currently use it.

## Authoring Guidance

- prefer semantic HTML headings before utility classes
- use the typography mixins inside SCSS partials instead of hardcoding font-size, line-height, and letter-spacing tuples
- use utility classes when the markup is fixed or editor-generated and you only need a size alias
- change font files and `@font-face` declarations separately from token values; token maps do not load font binaries on their own

## Updating Typography

When the type system changes:

1. update [`resources/fonts/`](../../resources/fonts/) and [`resources/fonts/fonts.css`](../../resources/fonts/fonts.css) if the underlying font families or binaries change
2. update the typography maps in [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss) if the scale, rhythm, family aliases, weights, or letter-spacing change
3. keep relying on [`resources/scss/_2-themes/_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss) to export the CSS custom properties
4. update [`resources/scss/_1-lib/mixins/_mixin-typography.scss`](../../resources/scss/_1-lib/mixins/_mixin-typography.scss) and [`resources/scss/_4-components/_typography.scss`](../../resources/scss/_4-components/_typography.scss) only when you need a new reusable mixin or public class alias

## Related Docs

- [SCSS And Tokens](./scss-and-tokens.md)
- [Font Loading](./font-loading.md)
- [SCSS Mixins Deep Dive](./scss-mixins.md)
