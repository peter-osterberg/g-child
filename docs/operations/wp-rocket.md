# WP Rocket

This page documents the selectors in this child theme that usually need review when WP Rocket Remove Unused CSS is enabled.

The build emits selectors without `:is()` (including nested `:not(:is())` and `:has(:is())`), preserves conditional layer scope and source order, and checks the final minified CSS; see [PostCSS Pipeline](../build-and-tooling/postcss-pipeline.md). Runtime selectors still need review. The risk is selectors that are only visible after runtime changes, plugin rendering, or relational selector matching. Those selectors can be missing from the first HTML response even though the theme depends on them later.

Keep this page aligned with the live theme contracts in `resources/`, `inc/`, and the compiled output in `dist/`.

## What Usually Needs Safelisting

Review a selector for the safelist when one of these is true:

- JS adds the class after boot and CSS depends on that state.
- a plugin outputs prefixed classes that are not present on every page.
- the child theme uses relational selectors such as `:has(...)`.
- parent-theme CSS or site CSS depends on a runtime class produced by this child theme.

Not every JS class needs a repo-local safelist entry. If no CSS in this child theme, the parent theme, or the site depends on a runtime class, safelisting it does not change behavior.

## Recommended Safelist

These are the selectors that should be in the WP Rocket safelist for the current child-theme runtime.

```text
(.*).gfield_(.*)
(.*).gform_(.*)
(.*).is-hidden(.*)
(.*).is-scrolled(.*)
(.*).is-solid(.*)
(.*).is-swapping-scroll-state(.*)
(.*).auto-hide-header-no-transition(.*)
(.*).mega-menu-inner(.*)
(.*).is-open(.*)
(.*).submitting(.*)
(.*).gform-loading-overlay(.*)
(.*).gform-loading-overlay-spinner(.*)
(.*).is-trigger-hover(.*)
(.*).is-popover-open(.*)
(.*).loading(.*)
(.*).spinner(.*)
(.*).fade-in(.*)
(.*):has(>:where([type=checkbox],[type=radio]))(.*)
```

These entries cover the selectors that are added after boot, injected by Gravity Forms UI, or matched through a relational selector that WP Rocket may not preserve correctly from the initial HTML snapshot.

## Why These Entries Are In The Safelist

- `.gfield_*` and `.gform_*`: the form layer uses broad Gravity Forms selectors across [`resources/scss/_4-components/forms/`](../../resources/scss/_4-components/forms/) and [`inc/Customization/Gravityforms.php`](../../inc/Customization/Gravityforms.php).
- `.is-hidden`, `.is-scrolled`, `.is-solid`, `.is-swapping-scroll-state`, and `.auto-hide-header-no-transition`: written by [`resources/js/header/header-scroll-visibility.js`](../../resources/js/header/header-scroll-visibility.js) and consumed by [`resources/scss/_6-layouts/_header-main.scss`](../../resources/scss/_6-layouts/_header-main.scss) and [`resources/scss/_6-layouts/_header.scss`](../../resources/scss/_6-layouts/_header.scss). `.is-scrolled` owns sticky motion, `.is-solid` owns the filled/blurred surface, and `.is-swapping-scroll-state` keeps the top handoff visually hidden for one frame.
- `.mega-menu-inner`: injected by [`resources/js/header/mega-menu-content-wrapper.js`](../../resources/js/header/mega-menu-content-wrapper.js) and styled in [`resources/scss/_6-layouts/_header-mega-menu.scss`](../../resources/scss/_6-layouts/_header-mega-menu.scss).
- `.is-open`: shared popover open state from [`resources/js/lib/popover/options.js`](../../resources/js/lib/popover/options.js), consumed by [`resources/scss/_1-lib/mixins/_mixin-card.scss`](../../resources/scss/_1-lib/mixins/_mixin-card.scss).
- `.submitting`, `.gform-loading-overlay`, and `.gform-loading-overlay-spinner`: injected by [`resources/js/integrations/gravity-forms-ui.js`](../../resources/js/integrations/gravity-forms-ui.js) and styled in [`resources/scss/_4-components/forms/_gravity-forms.scss`](../../resources/scss/_4-components/forms/_gravity-forms.scss).
- `.is-trigger-hover`: written by [`resources/js/navigation/menu/menu-item-wiring.js`](../../resources/js/navigation/menu/menu-item-wiring.js) and consumed by [`resources/scss/_6-layouts/_header-main.scss`](../../resources/scss/_6-layouts/_header-main.scss) and [`resources/scss/_5-modules/_menu.scss`](../../resources/scss/_5-modules/_menu.scss).
- `.is-popover-open`: written by [`resources/js/navigation/mobile/popovers.js`](../../resources/js/navigation/mobile/popovers.js) and consumed by [`resources/scss/_6-layouts/_header-mobile.scss`](../../resources/scss/_6-layouts/_header-mobile.scss).
- `.loading`: used by listing results styling in [`resources/scss/_5-modules/module-listing/_results.scss`](../../resources/scss/_5-modules/module-listing/_results.scss), even though the producer is outside this repository.
- `*:has(>:where([type='checkbox'],[type='radio']))`: used in [`resources/scss/_4-components/forms/_form-choice.scss`](../../resources/scss/_4-components/forms/_form-choice.scss).

The header scroll controller also writes `data-hidden`, `data-scrolled`, and `data-solid`. The current child-theme SCSS does not depend on those data attributes directly, so extra data-attribute safelist entries are not needed today.

## Optional Selectors

These selectors are written by child-theme JS and are common candidates for the safelist, but they are not consumed directly by the child-theme SCSS checked in here today.

Keep them in the safelist when the parent theme, site CSS, or custom snippets depend on them:

```text
(.*).is-menu-label-link(.*)
(.*).is-active(.*)
(.*).is-trigger-click(.*)
(.*).is-trigger-mode-hover(.*)
(.*).is-trigger-mode-click(.*)
(.*).is-trigger-mode-mixed(.*)
(.*).is-trigger-mode-click-toggle(.*)
(.*).is-transitioning(.*)
(.*).is-disabled(.*)
```

The current local safelist was missing two runtime state classes that belong in this optional group:

- `.is-trigger-mode-click`
- `.is-trigger-mode-mixed`

## Gravity Forms And Other Prefix Selectors

The form layer uses broad Gravity Forms selectors across several files under [`resources/scss/_4-components/forms/`](../../resources/scss/_4-components/forms/) and customization hooks in [`inc/Customization/Gravityforms.php`](../../inc/Customization/Gravityforms.php).

For WP Rocket, broad prefix patterns are easier to maintain than enumerating individual Gravity Forms classes:

- `.gfield_*`
- `.gform_*`

That covers both the server-rendered Gravity Forms markup and the child-theme styling that targets those prefixes.

## Relational Selectors

The current local safelist includes the checkbox and radio wrapper selector from [`resources/scss/_4-components/forms/_form-choice.scss`](../../resources/scss/_4-components/forms/_form-choice.scss):

```css
*:has(> :where([type='checkbox'], [type='radio'])) {
	/* wrapper styles */
}
```

This repository also contains other `:has(...)` selectors in:

- [`resources/scss/_6-layouts/_header.scss`](../../resources/scss/_6-layouts/_header.scss)
- [`resources/scss/_6-layouts/_header-mobile.scss`](../../resources/scss/_6-layouts/_header-mobile.scss)
- [`resources/scss/_5-modules/_menu.scss`](../../resources/scss/_5-modules/_menu.scss)
- [`resources/scss/_5-modules/_video.scss`](../../resources/scss/_5-modules/_video.scss)
- [`resources/scss/_4-components/forms/_form-labels.scss`](../../resources/scss/_4-components/forms/_form-labels.scss)
- [`resources/scss/_1-lib/mixins/_mixin-links.scss`](../../resources/scss/_1-lib/mixins/_mixin-links.scss)

If a `:has(...)` rule stops applying after WP Rocket optimization, inspect the compiled selector in the app CSS file resolved by `resources/scss/app.scss` in `dist/manifest.json` and safelist the exact relation that the built CSS now contains.

## Legacy Entry To Remove

The older `generation-theme-child/dist/fonts/fontawesome` rule should not stay in the safelist. The current build emits Font Awesome subsets into `dist/assets/` as hashed `fa-*.woff2` files, and that older path string does not match the current output.

## Updating This Page

When adding or changing runtime UI:

1. Check `resources/js/` for new `classList.add()`, `classList.remove()`, and `classList.toggle()` state classes.
2. Check `resources/scss/` for selectors that only become valid after runtime changes, plugin rendering, or `:has(...)` matching.
3. Check the parent theme or site CSS before deleting a broad project-level safelist entry that is not consumed in this repo.
4. Rebuild and inspect the app CSS file resolved by `resources/scss/app.scss` in `dist/manifest.json` when the compiled selector shape matters more than the source SCSS.

## Related Docs

- [JavaScript Architecture](../theme-systems/javascript-architecture.md)
- [Popover System](../theme-systems/popover-system.md)
- [Accessibility](../theme-systems/accessibility.md)
- [Asset Architecture](../build-and-tooling/asset-architecture.md)
