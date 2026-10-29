# PostCSS Pipeline

PostCSS runs after Sass. The pipeline avoids `:is()` in emitted selectors while preserving cascade layers, conditional scope and declaration source order. WP Rocket Remove Unused CSS receives the built CSS rather than the SCSS.

The Browserslist policy in `package.json` is `baseline widely available with downstream`. PostCSS targets browsers supporting the Baseline Widely available feature set, including compatible downstream browsers. The resolved versions advance as browser data is updated; this policy does not configure Vite's JavaScript build target.

## Active Plugins

The order in [`postcss.config.js`](../../postcss.config.js) is:

| Plugin                           | Behavior and constraints                                                                                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postcss-custom-media`           | Expands the shared `--mouse`, `--touch`, breakpoint and motion aliases into standard media queries.                                                                                                                                                                 |
| `postcss-fontawesome-essentials` | Resolves icon declarations and emits entry-scoped, hashed font subsets. It does not rewrite selectors. Generated `@font-face` rules are intentionally global.                                                                                                       |
| `postcss-rfs`                    | Converts literal `fs()` and `size()` calls into sizes or `clamp()` values. It does not change selectors or layer scope; unsupported expressions fail the build.                                                                                                     |
| `postcss-hover-wrap`             | Wraps selectors that require hover in `(hover) and (pointer: fine)` at their source position. Mixed top-level selector lists are split. Hover/focus alternatives keep keyboard focus available on touch devices, including after the subsequent selector expansion. |
| `postcss-preset-env`             | Applies the configured value/browser compatibility transforms and Autoprefixer. Simple `:is()` lists expand as a fallback. Native `:not()` lists, logical properties, custom properties, Sass nesting output and cascade layers are preserved.                      |
| `postcss-hoist-global-layers`    | Rebases explicitly declared global layers emitted by mixins. It retains conditional ancestors and splits surrounding blocks at the original source position.                                                                                                        |
| `postcss-merge-top-layers`       | Merges adjacent root blocks of the same named layer. Rules, conditions, ordering statements and anonymous layers act as barriers.                                                                                                                                   |
| `postcss-merge-nested-layers`    | Merges adjacent same-name child layers. Genuine sublayers retain their identity; same-name nesting is not automatically unwrapped.                                                                                                                                  |

PostCSS runs `Once` hooks, node visitors, then `OnceExit` hooks; array order alone does not describe every mutation. Layer normalization runs at `OnceExit`, after hover and compatibility visitors have produced their rules.

## Layer Contract

The SCSS entries declare the layer order before loading their buckets. Mixins may deliberately emit a global layer inside the current bucket:

```css
@layer theme, components.root, components, modules;
@layer modules {
	@layer components {
		@layer root {
			.card {
				padding: 1rem;
			}
		}
	}
}
```

The hoister assigns `.card` to `components.root`, as intended by this project's mixin contract. This is an explicit authoring convention, not a general CSS equivalence: native nesting would otherwise create `modules.components.root`.

Hoisting retains enclosing `@media`, `@supports`, `@container`, `@scope` and `@starting-style` conditions inside the global layer. Declarations before and after a hoisted block keep their relative positions. Anonymous layer ancestors and rule nesting are left intact because splitting them can change layer identity or selector scope.

Empty named layers are retained because their first occurrence establishes cascade order. Empty global blocks emitted for unused Sass placeholders must also be hoisted: otherwise minification retains accidental sublayers such as `theme.theme`, `base.theme` and `utilities.theme`. Statement-form ordering rules are also retained. Unlayered plugin overrides stay unlayered.

## Disabled Optimizations

These passes are no longer used by the pipeline:

- `postcss-merge-direct-media`: moving media blocks to the end and sorting breakpoints changes the cascade when conditions overlap or later unconditional rules override earlier conditional rules.
- `postcss-combine-identical-rules`: aggressive merging moves declarations across intervening rules and combines unrelated selectors. Even adjacent selector grouping needs care with browser-specific pseudo-elements.
- `postcss-combine-duplicated-selectors`: consolidating repeated selectors can move declarations past intervening selectors or conditions.
- `postcss-discard-unused`: per-entry animation pruning cannot see references from other stylesheets, CSS variables, inline styles or JavaScript.
- `postcss-preset-env`'s forced logical-properties transform: the default left-to-right conversion changes `margin-inline-start` into `margin-left` and loses direction-aware behavior.
- `postcss-preset-env`'s `not-pseudo-class` transform: converting `:not(.a, .b)` to `:not(.a):not(.b)` increases specificity. Direct native exclusion lists retain the source cascade.

The theme already requires native cascade layers. Keeping native `:not()` lists and `:where()` is consistent with that browser requirement.

## WP Rocket Selector Contract

SCSS uses explicit positive selector lists and direct arguments inside `:not()` and `:has()`. Avoid `:is()`, especially nested forms such as `:not(:is(...))` and `:has(:is(...))`.

The enabled `is-pseudo-class` transform handles simple lists as a fallback, but it is not a general solution: complex relational cases can remain intact, and mixed-specificity branches can introduce artificial `does-not-exist` selectors. Write those selectors explicitly instead.

The overlay mixin attaches its condition to every target before constructing one `:has()` list. This preserves matching and the list's maximum specificity without nested `:is()`. The input-icon helper uses each explicit branch's natural specificity; its field-shell scope still overrides this theme's base controls. Review site-specific form overrides when deploying that change.

Vite still minifies production CSS. Lightning CSS's `IsSelector` feature is excluded from minification so it cannot wrap explicit selector lists back in `:is()`. The build check parses every emitted CSS selector and rejects `:is()` and artificial specificity selectors, including any introduced after PostCSS. It also rejects nested global layer names in the emitted CSS, including empty layer declarations.

## Verification

Run `pnpm run check:postcss` for regression examples covering declaration order, layer conditions, sublayer identity, empty layers, native exclusion lists, simple `:is()` expansion, hover/focus alternatives, responsive sizes, logical properties and animation preservation. The check also compiles the app, editor, editor-admin and Button SCSS entries and compares every declaration's selector, effective layer, conditions and source order before and after layer normalization.

Run `pnpm run build && pnpm run check:vite` to check the production artifacts, font assets and loader contract. `check:vite` includes the PostCSS regressions. Development builds use the same PostCSS safety rules.

## WP Rocket Validation

Clear Used CSS after deploying stylesheet changes, then compare the regenerated `wpr-usedcss` block and rendered UI with `?nowprocket` on desktop and mobile. Check menu/popover states, forms, hover, keyboard focus and animations. Preserve the layer ordering statement and enclosing layer/conditional blocks when comparing optimized rules.

Simple selector output cannot guarantee WP Rocket's remote extraction behavior. Runtime state classes and relational selectors may still need targeted safelisting; see [WP Rocket](../operations/wp-rocket.md). WP Rocket documents [clearing Used CSS after stylesheet changes](https://docs.wp-rocket.me/article/1529-remove-unused-css) and [comparing optimized pages with `?nowprocket`](https://docs.wp-rocket.me/article/1718-troubleshoot-remove-unused-css-issues).
