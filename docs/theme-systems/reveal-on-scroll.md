# Reveal On Scroll

The reveal-on-scroll system is the project’s optional scroll-animation layer for modules, text blocks, rows, and listing cards.

It is split across:

- runtime bootstrap in [`resources/js/app.js`](../../resources/js/app.js)
- site-level rule config in [`resources/js/site-config.js`](../../resources/js/site-config.js)
- DOM scanning and controller setup in [`resources/js/lib/reveal-on-scroll/init.js`](../../resources/js/lib/reveal-on-scroll/init.js)
- animation orchestration in [`resources/js/lib/reveal-on-scroll/index.js`](../../resources/js/lib/reveal-on-scroll/index.js)
- utility selectors in [`resources/scss/_7-utilities/_reveal-on-scroll.scss`](../../resources/scss/_7-utilities/_reveal-on-scroll.scss)

## Bootstrap Flow

[`app.js`](../../resources/js/app.js) imports the reveal initializer into the main frontend bundle.

At runtime it:

1. reads `SITE_REVEAL_ENABLED` from [`site-config.js`](../../resources/js/site-config.js)
2. exits early if the feature is disabled
3. calls [`initRevealOnScroll()`](../../resources/js/lib/reveal-on-scroll/init.js) with `document` and `SITE_REVEAL_OPTIONS`

That keeps the feature optional at the runtime layer while avoiding a separate chunk request for the reveal package.

## Site Config Contract

[`SITE_REVEAL_OPTIONS`](../../resources/js/site-config.js) is the main site-facing API.

It currently defines a `rules` array with selectors such as:

- `.animate-this` -> reveal the container itself
- `.animate-row` -> reveal nested `.row` elements
- `.animate-module, .animate-mod` -> reveal module elements
- `.animate-text` -> reveal text children and list items
- `.animate-list` -> use the special listing-row controller

Each rule can supply:

- `id`
- `containerSelector`
- `targetSelector`
- `group`
- `mode`
- `reveal`

The special target selectors are:

- `self`: reveal the container itself
- `children`: reveal direct element children

Everything else is treated as a scoped selector resolved inside the matched container.

## Adding New Reveals Beyond The Built-Ins

The current site config already covers the default module and listing-row cases:

- module reveals through `.animate-module, .animate-mod`
- listing-row reveals through `.animate-list` with `mode: 'listing-rows'`

If you need a new reveal pattern beyond those defaults, there are two supported approaches.

### 1. Add another site rule

Use this when the pattern should be available declaratively in markup across the site.

Add a new rule to [`SITE_REVEAL_OPTIONS.rules`](../../resources/js/site-config.js), for example:

```js
{
	id: 'feature-cards',
	containerSelector: '.animate-feature-cards',
	targetSelector: '.feature-card',
	group: true,
	reveal: {
		preset: 'fade-up',
		stagger: 100,
		duration: 650,
	},
}
```

That tells `initRevealOnScroll()` to:

- find every `.animate-feature-cards` container
- resolve `.feature-card` targets inside it
- create a grouped staggered reveal for those cards

If you introduce a new helper-class pattern like `.animate-feature-cards`, also add the matching hidden-state selector to [`resources/scss/_7-utilities/_reveal-on-scroll.scss`](../../resources/scss/_7-utilities/_reveal-on-scroll.scss). Otherwise the JS may still animate the targets, but they will not start from the expected hidden state.

Use this approach when you want authors or templates to opt in through markup alone.

### 2. Create one-off instances in feature code

Use this when the reveal behavior belongs to a single JS feature and should not become part of the global site rule registry.

You can instantiate [`RevealOnScroll`](../../resources/js/lib/reveal-on-scroll/index.js) directly:

```js
import { RevealOnScroll } from './lib/reveal-on-scroll/index.js';

const cards = document.querySelectorAll('.feature-card');

new RevealOnScroll(cards, {
	group: true,
	preset: 'scale-up',
	stagger: 90,
	target: document.querySelector('.feature-cards'),
});
```

Or create multiple one-off instances at once with `RevealOnScroll.batch(...)`:

```js
RevealOnScroll.batch([
	['.hero-copy > *', { group: true, stagger: 80 }],
	['.feature-card', { preset: 'fade-up', stagger: 100 }],
]);
```

Use this approach when:

- the reveal targets are discovered by feature code
- the behavior is page-specific
- the timing or trigger target is too custom for the global rule list
- you do not want to add another shared helper selector

### Which approach to choose

- extend `SITE_REVEAL_OPTIONS.rules` for reusable markup-driven patterns
- instantiate `RevealOnScroll` directly for feature-owned or one-off behaviors
- use `mode: 'listing-rows'` only for listing wrappers that need mutation-aware row grouping after dynamic item insertion

If the new reveal should behave like the existing module and listing defaults, prefer another site rule. If it is tightly coupled to a single JS component, prefer manual instances.

## CSS Helper Layer

[`_reveal-on-scroll.scss`](../../resources/scss/_7-utilities/_reveal-on-scroll.scss) provides the CSS side of the contract.

Inside `@media (--motion-ok)` it hides unrevealed targets by applying:

- `opacity: 0`
- `will-change: opacity, transform`

to elements that do not yet have `.is-revealed`.

The utility file currently maps that behavior onto these helper selectors:

- `.animate-this`
- `.animate-row`
- `.animate-module`
- `.animate-mod`
- `.animate-text`
- `.animate-list`

That means the SCSS provides the initial hidden state for those utility patterns, while the JS decides when each target transitions into view.

## What `initRevealOnScroll()` Does

[`init.js`](../../resources/js/lib/reveal-on-scroll/init.js) is the DOM-oriented initializer.

Its job is to turn a list of selector rules into live `RevealOnScroll` instances.

The flow is:

1. resolve a root node or selector into a `Document` or `HTMLElement`
2. merge top-level reveal options with per-rule overrides
3. find matching containers for each `containerSelector`
4. resolve the targets for each container
5. skip targets already claimed by a previous rule
6. skip targets already marked revealed when `once: true`
7. create one grouped instance or one instance per target
8. register the created instances so repeat calls do not duplicate the same rule/container pair
9. schedule a global refresh after page load

The initializer returns a small controller object with:

- `instances`
- `controllers`
- `refresh()`
- `destroy()`

So the reveal system can be refreshed or torn down manually if a page feature needs that control.

## The `RevealOnScroll` Class

[`RevealOnScroll`](../../resources/js/lib/reveal-on-scroll/index.js) is the animation primitive.

It is built on AnimeJS helpers:

- `onScroll`
- `waapi.animate`
- `set`
- `stagger`
- `cleanInlineStyles`

### Presets and options

The built-in presets are:

- `fade-up`
- `fade-down`
- `fade-left`
- `fade-right`
- `scale-in`
- `scale-up`

Key options include:

- `preset`
- `from` and `to`
- `duration`
- `ease`
- `delay`
- `stagger`
- `once`
- `group`
- `prepare`
- `target`
- `respectReducedMotion`
- `watchReducedMotion`
- `reducedMotionBehavior`
- `staggerFrom`

### How one reveal works

For a normal trigger-mode reveal, the class does this:

1. resolve the target elements
2. skip already revealed targets when `once` is enabled
3. optionally apply the preset’s `from` state inline before the reveal starts
4. create an AnimeJS `onScroll(...)` observer for the target
5. create a WAAPI animation using the preset or custom `from` and `to` values
6. when the observer enters, play or restart the linked animation
7. on completion, mark the target as revealed and clear temporary inline animation styles

The class marks completed targets with:

- `.is-revealed`
- `data-gc-reveal-complete="true"`

That marker is used by future initializations and refreshes to avoid replaying one-time reveals.

For grouped targets, one observer can drive a staggered animation across multiple elements.

For non-grouped targets, each element gets its own observer and animation instance.

## Reduced Motion

The class checks `matchMedia('(prefers-reduced-motion: reduce)')` when `respectReducedMotion` is enabled.

When reduced motion applies and `reducedMotionBehavior` is `show`, it:

- tears down active animations
- applies the final `to` state immediately
- marks targets as revealed
- clears `will-change`

It can also watch the media query and rebuild itself when the user’s reduced-motion preference changes while the page is open.

## Listing Row Mode

The most specialized logic lives in [`init.js`](../../resources/js/lib/reveal-on-scroll/init.js) under the `listing-rows` mode.

That mode uses `ListingRevealController` instead of creating a fixed set of instances up front.

Its responsibilities are:

- find the listing element and its `.listing-items-wrapper`
- watch that wrapper with `MutationObserver`
- detect new `.listing-post` items added by JS-driven filtering or pagination
- group new items into visual rows by `offsetTop`
- create one `RevealOnScroll` instance per discovered row
- stagger within a row when there is more than one new item

This is why listing reveals can continue to work after the initial page load even when new cards are inserted later.

## Why There Are Both JS And SCSS Pieces

The reveal system only works correctly when the JS and SCSS halves stay aligned:

- SCSS defines which helper classes should start visually hidden
- JS defines which elements those helper classes should resolve to
- JS adds `.is-revealed` when an animation has finished
- SCSS stops hiding elements once that class exists

If one side changes without the other, the system becomes inconsistent. For example:

- changing a JS rule without changing the matching utility selector can leave elements visible before reveal
- changing the SCSS helper selectors without updating the JS rules can hide elements the runtime never animates

## Related Docs

- [JavaScript Architecture](./javascript-architecture.md)
- [Popover System](./popover-system.md)
