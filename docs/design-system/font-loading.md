# Font Loading

This project loads fonts through two different paths:

- text fonts are static assets declared in [`resources/fonts/fonts.css`](../../resources/fonts/fonts.css)
- icon fonts are generated and subsetted during the PostCSS build

Those two paths look similar in the browser because both end up as `@font-face` rules, but they are built and loaded differently.

## 1. Text Fonts

The text font files live in [`resources/fonts/`](../../resources/fonts/).

That folder currently contains:

- the `Inter` family
- the `Inter Tight` family
- a hand-maintained [`fonts.css`](../../resources/fonts/fonts.css) file with the `@font-face` declarations

### Source Of Truth

[`resources/fonts/fonts.css`](../../resources/fonts/fonts.css) is the source file that defines the text-font faces.

It declares:

- family name
- style
- weight
- `.woff2` source file
- `font-display: swap`

That means the text-font loading model here is static and explicit. The theme does not generate those `@font-face` rules from SCSS tokens.

### Build Behavior

[`vite.config.mjs`](../../vite.config.mjs) builds `resources/fonts/fonts.css` as a CSS entry. Vite follows its font URLs, emits hashed `.woff2` files under `dist/assets/`, and rewrites the stylesheet URLs. The source-relative paths work in hot mode as well.

### Runtime Enqueueing

The child theme resolves the `resources/fonts/fonts.css` manifest entry and enqueues its hashed CSS output through [`inc/Scripts.php`](../../inc/Scripts.php).

It is loaded in three places:

- frontend via `enqueue_frontend_scripts()`
- WordPress admin via `enqueue_admin_scripts()`
- WYSIWYG/editor styles via `append_editor_styles()`

So the browser receives the text fonts because WordPress explicitly loads the font CSS entry, not because `app.scss` imports that file.

## 2. Text Font Tokens And CSS Variables

Once the font files exist and `fonts.css` is enqueued, the SCSS token layer decides which families the design system uses.

The family registry lives in [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss):

- `primary` -> `inter tight`
- `secondary` -> `inter`
- `mono` -> `ui-monospace, sfmono-regular, menlo, consolas, monospace`
- `base` -> `var(--ff-primary)`

Those token values are converted into root CSS variables by [`resources/scss/_2-themes/_design-tokens.scss`](../../resources/scss/_2-themes/_design-tokens.scss):

- `--ff-primary`
- `--ff-secondary`
- `--ff-mono`
- `--ff-base`

The rest of the design system then consumes those variables through shared SCSS variables and mixins.

Examples:

- base document font in [`_reset.scss`](../../resources/scss/_3-base/_reset.scss)
- heading/button/input typography variables in [`_variables.scss`](../../resources/scss/_1-lib/_variables.scss)
- component usage through mixins like [`_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss)

So the text-font chain is:

1. font binaries and `fonts.css` exist in `resources/fonts/`
2. Vite emits the CSS and referenced fonts into `dist/assets/`
3. WordPress enqueues the font CSS through the child manifest loader
4. SCSS token maps expose the intended family names as `--ff-*`
5. components render with those variables

## 3. Icon Fonts

Icon fonts are handled differently.

The source Font Awesome files live under [`resources/lib/fonts/fontawesome/`](../../resources/lib/fonts/fontawesome).

They are not loaded through `resources/fonts/fonts.css`.

Instead, the custom PostCSS plugin configured in [`postcss.config.js`](../../postcss.config.js) scans the compiled CSS for icon usage, resolves the needed glyphs, subsets the source fonts, and prepends generated `@font-face` rules to the compiled CSS output.

That behavior is implemented in:

- [`postcss-plugins/postcss-fontawesome-essentials/postcss-fontawesome-essentials.js`](../../postcss-plugins/postcss-fontawesome-essentials/postcss-fontawesome-essentials.js)
- [`postcss-plugins/postcss-fontawesome-essentials/subsets.js`](../../postcss-plugins/postcss-fontawesome-essentials/subsets.js)
- [`postcss-plugins/postcss-fontawesome-essentials/resolve-icons.js`](../../postcss-plugins/postcss-fontawesome-essentials/resolve-icons.js)

### What The Icon-Font Plugin Does

The plugin:

- scans for icon declarations in the compiled CSS
- figures out which Font Awesome glyphs are actually used
- subsets the original source font files to only those glyphs
- writes optimized `.woff2` files to ignored `.vite-fonts/`
- emits source-relative URLs that Vite resolves, hashes, and publishes
- prepends matching `@font-face` rules to the CSS file that uses them

This is why `app.css` can contain `@font-face` rules for Font Awesome even though `resources/fonts/fonts.css` only contains the text-font families.

### Runtime Loading Model For Icon Fonts

Icon-font faces are loaded indirectly through the compiled CSS that uses them:

- the hashed output of `resources/scss/app.scss`
- builder module frontend CSS files when a module uses icon fonts

There is no separate WordPress enqueue step for a generated Font Awesome stylesheet. The `@font-face` rules are already embedded into the emitted CSS bundle.

## 4. Dev And Hot-Reload Behavior

In hot mode, Vite serves the source CSS and fonts. Regular page styles are imported as modules for native CSS HMR. WYSIWYG styles use direct CSS responses and may need an iframe refresh. The subset generator runs during CSS processing; it does not depend on a prebuilt `dist/fonts/` directory.

## 5. What To Change When Updating Fonts

### To change text fonts

Update:

- files in [`resources/fonts/`](../../resources/fonts/)
- [`resources/fonts/fonts.css`](../../resources/fonts/fonts.css)
- the family tokens in [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss) if the design system should use a different default family

### To change icon-font sources

Update:

- files in [`resources/lib/fonts/fontawesome/`](../../resources/lib/fonts/fontawesome)
- the Font Awesome variable mapping in [`resources/lib/fonts/fontawesome/_variables.scss`](../../resources/lib/fonts/fontawesome/_variables.scss) if needed
- PostCSS plugin configuration in [`postcss.config.js`](../../postcss.config.js) only if the source location or output behavior changes

## Related Docs

- [Typography](./typography.md)
- [SCSS And Tokens](./scss-and-tokens.md)
- [Build Pipeline](../build-and-tooling/build-pipeline.md)
- [PostCSS Pipeline Deep Dive](../build-and-tooling/postcss-pipeline.md)
