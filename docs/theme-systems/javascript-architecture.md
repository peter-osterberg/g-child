# JavaScript Architecture

The frontend JS entrypoint is [`resources/js/app.js`](../../resources/js/app.js).

For the cross-cutting accessibility patterns built into the theme, see [Accessibility](./accessibility.md).

It bootstraps:

- desktop navigation and mega-menu behavior
- mobile dialog navigation
- header scroll visibility
- listing filter dropdown popovers
- reveal-on-scroll wiring when enabled in `site-config.js`
- Gravity Forms UI enhancements
- Polylang accessibility cleanup
- WordPress a11y shims
- `noscript` cleanup
- viewport-related CSS custom properties

## JS Folder Responsibilities

- `resources/js/app.js`: main bootstrap entry
- `resources/js/site-config.js`: site-level selectors and menu or popover overrides consumed by the bootstrap
- `resources/js/navigation/`: menu system and mobile menu implementation
- `resources/js/header/`: header-specific behavior
- `resources/js/listing/`: listing filter dropdown wiring
- `resources/js/integrations/`: plugin and WordPress integration glue
- `resources/js/lib/`: reusable primitives and helpers
- `resources/js/dev-tools/`: dev-only debugging utilities

## Site Config

[`resources/js/site-config.js`](../../resources/js/site-config.js) is the central place for site-level runtime decisions such as:

- header and desktop menu trigger behavior
- mobile menu panel wiring
- declarative popover overrides such as the fixed-position header search popover
- reveal-on-scroll rules

Reveal-on-scroll is gated by `SITE_REVEAL_ENABLED` and configured through `SITE_REVEAL_OPTIONS`.

The current config keeps the feature disabled by default, but still defines the selector rules that `app.js` passes into the reveal initializer when it is enabled.

For the runtime flow, rule model, reduced-motion handling, and listing-row behavior, see [Reveal On Scroll](./reveal-on-scroll.md).

## Header Scroll Visibility

[`resources/js/header/header-scroll-visibility.js`](../../resources/js/header/header-scroll-visibility.js) drives the sticky desktop header against the shell layout in [`resources/scss/_6-layouts/_header.scss`](../../resources/scss/_6-layouts/_header.scss) and the header surface rules in [`resources/scss/_6-layouts/_header-main.scss`](../../resources/scss/_6-layouts/_header-main.scss).

`SITE_HEADER_OPTIONS.autoHide` currently exposes two tuning knobs:

- `offset`: the scroll position where the sticky shell takes over
- `threshold`: the minimum directional movement before the sticky header hides or reveals again

The runtime class contract is deliberately split:

- `.is-scrolled`: sticky mechanics only; this class moves the header into or out of the shell and applies sticky height rules
- `.is-solid`: the solid scrolled surface; this class owns the filled background and blur
- `.is-hidden`: hides the sticky header by sliding it back into the shell pocket
- `.is-swapping-scroll-state`: one-frame hidden swap used when leaving sticky mode so the surface/theme change is never visible
- `.auto-hide-header-no-transition`: temporary escape hatch for instant state syncs during resize or reduced-motion paths

The important implementation rule is that visible motion is transform-only. Surface changes between the transparent hero state and the solid sticky state are swapped while the header is hidden, not animated in view.

### Hero Overlay Reference Rules

The header SCSS also contains two commented reference patterns for first-section media heroes:

- [`resources/scss/_6-layouts/_header.scss`](../../resources/scss/_6-layouts/_header.scss) includes a commented rule that offsets `#main > :first-child:is(.has-bg-image, .has-bg-video)` with top padding plus a matching negative margin.
- [`resources/scss/_6-layouts/_header-main.scss`](../../resources/scss/_6-layouts/_header-main.scss) includes a commented `html:has(...)` rule that keeps the header transparent and re-applies the dark theme until the sticky header switches into its solid surface state.

These are not active right now because they are commented out in the source, but they document the intended pattern when a page should treat the first section as an underlapping hero.

The first rule exists to solve layout overlap cleanly. The header shell sits over the top of the page, so a media hero can visually start underneath it. Adding `padding-top` equal to the header shell height pushes the hero's actual content below the overlaid header, while the matching negative `margin-top` keeps the section itself visually pulled up behind the header instead of leaving a blank gap above it.

The second rule exists to solve the visual theme handoff. When the first section is a media hero, the header can stay transparent and use the dark theme variant while it is still in the hero-overlay state. Once the sticky controller applies `.is-solid`, that override stops applying, so the header falls back to the normal filled, blurred sticky surface instead of trying to mix hero-overlay styling with the scrolled surface styling.

## Reveal On Scroll

The reveal system spans both JS and SCSS:

- [`resources/js/app.js`](../../resources/js/app.js) conditionally initializes the feature from the main bundle
- [`resources/js/site-config.js`](../../resources/js/site-config.js) defines the site rules
- [`resources/js/lib/reveal-on-scroll/init.js`](../../resources/js/lib/reveal-on-scroll/init.js) scans the DOM and creates controllers
- [`resources/js/lib/reveal-on-scroll/index.js`](../../resources/js/lib/reveal-on-scroll/index.js) runs the AnimeJS-powered scroll animations
- [`resources/scss/_7-utilities/_reveal-on-scroll.scss`](../../resources/scss/_7-utilities/_reveal-on-scroll.scss) provides the initial hidden-state utility selectors

A core implementation detail is that the JS rules and SCSS helper selectors need to stay aligned. The SCSS hides unrevealed targets for the helper patterns it knows about, and the JS adds `.is-revealed` plus `data-gc-reveal-complete="true"` when the animation is complete.

For the full breakdown, see [Reveal On Scroll](./reveal-on-scroll.md).

## Shared Popover System

`GcPopover` in [`resources/js/lib/popover/`](../../resources/js/lib/popover) is the main shared frontend primitive.

It wraps:

- positioning via Floating UI
- lifecycle hooks
- focus handling
- outside-click dismissal
- keyboard dismissal
- hover and click trigger handling
- motion handling

That same popover primitive is reused by desktop menus, mobile menu panels, and listing filter dropdowns.

For a dedicated breakdown of the popover package, see [Popover System](./popover-system.md).

## Navigation System

Desktop and mobile navigation are implemented as reusable JS packages rather than inline theme scripts:

- `MenuController` wires hierarchical menu items to popovers
- `MobileMenu` manages a `<dialog>`-based mobile navigation shell
- `header/menu-label-inert-links.js` and `Child_Functions::parent_menu_dropdown()` work together to make submenu triggers accessible and interactive
- `header/mega-menu-content-wrapper.js` ensures mega-menu panels have a stable inner wrapper element

## Viewport Layout Vars

[`resources/js/header/viewport-layout-vars.js`](../../resources/js/header/viewport-layout-vars.js) writes the CSS custom properties that the layout uses for header offset and viewport sizing:

- `--scrollbar-width`
- `--viewport-width`
- `--viewport-height`

Header shell spacing is now handled statically in SCSS, so this controller is only responsible for viewport and scrollbar measurements.

## Integrations

- `gravity-forms-ui.js`: textarea autoresize, loading overlay, submit state handling, rerender awareness
- `polylang-accessibility.js`: marks Polylang flag images as decorative
- `wordpress-a11y-shim.js`: creates a no-op `wp.a11y.speak` when needed
- `noscript-cleanup.js`: removes `noscript` tags after JS boot

## Dev Tools

[`resources/js/dev-tools/debug.js`](../../resources/js/dev-tools/debug.js) is a browser debugging utility that can render outlines, grid overlays, and token or variable panels. The build only compiles dev-tool assets outside production.
