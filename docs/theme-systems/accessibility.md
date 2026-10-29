# Accessibility

Accessibility in this theme is not one isolated subsystem.

It is spread across:

- semantic PHP output
- shared SCSS utilities and tokens
- JS focus and ARIA management
- reduced-motion and preference-aware styling
- a few small integration shims for third-party or WordPress-adjacent behavior

This page documents the accessibility work that already exists in the repo and the built-in tools you can reuse when adding or updating features.

It is not a guarantee of WCAG conformance by itself. The theme gives you primitives and patterns, but new UI still needs keyboard, screen-reader, reduced-motion, and contrast review.

## What The Theme Already Does

### 1. Focus visibility is standardized

The base reset in [`resources/scss/_3-base/_reset.scss`](../../resources/scss/_3-base/_reset.scss) defines a shared `:focus-visible` outline using:

- `--ring-color`
- `--ring-offset`
- `--ring-width`

Those fall back to the shared focus tokens from:

- [`resources/scss/_1-lib/_tokens.scss`](../../resources/scss/_1-lib/_tokens.scss)
- [`resources/scss/_1-lib/_variables.scss`](../../resources/scss/_1-lib/_variables.scss)

That gives the project one default focus-ring contract instead of each component inventing its own outline styling.

### 2. Screen-reader-only content already has shared utilities

The theme includes standardized visually-hidden helpers in:

- [`resources/scss/_1-lib/mixins/_mixin-sr-only.scss`](../../resources/scss/_1-lib/mixins/_mixin-sr-only.scss)
- [`resources/scss/_7-utilities/_screen-reader.scss`](../../resources/scss/_7-utilities/_screen-reader.scss)

That gives you:

- `@include visually-hidden`
- `@include visually-hidden-focusable`
- `@include sr-only`
- `.sr-only`
- `.screen-reader-text`

There is also an in-repo example of focusable hidden content in [`resources/scss/_4-components/_buttons.scss`](../../resources/scss/_4-components/_buttons.scss), where skip links stay hidden until keyboard focus enters the group.

### 3. Motion preferences are part of the shared contract

The custom-media layer in [`resources/scss/_1-lib/_custom-media.scss`](../../resources/scss/_1-lib/_custom-media.scss) defines:

- `--motion-ok`
- `--motion-not-ok`
- `--high-contrast`
- `--forced-colors`

Those aliases are documented in [Custom Media Reference](../design-system/custom-media.md).

The theme already uses motion-aware branching in multiple places:

- base smooth scrolling in [`_reset.scss`](../../resources/scss/_3-base/_reset.scss)
- button and form transitions in shared mixins and components
- header hide/show behavior in [`resources/js/header/header-scroll-visibility.js`](../../resources/js/header/header-scroll-visibility.js)
- reveal-on-scroll behavior in [`resources/js/lib/reveal-on-scroll/index.js`](../../resources/js/lib/reveal-on-scroll/index.js)
- Expand module transitions in [`console/Commands/Modules/Expand/resources/scss/expand.scss`](../../console/Commands/Modules/Expand/resources/scss/expand.scss)

Reduced motion is part of the shared theme contract and is already handled in multiple existing layers.

### 4. Buttons normalize common accessibility attributes

The Button module centralizes accessibility attributes in [`inc/Modules/Button/Button.php`](../../inc/Modules/Button/Button.php).

`build_button_attributes()` handles:

- `aria-label` for icon-only buttons
- `aria-disabled`
- `disabled` for real `<button>` elements
- `tabindex="-1"` for disabled link-like buttons
- `target` and `rel` for new-tab links

This keeps attribute normalization in the model layer so templates can stay focused on rendering.

The shared button SCSS in [`resources/scss/_1-lib/mixins/_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) also respects:

- `:focus-visible`
- `:disabled`
- `[disabled]`
- `[aria-disabled='true']`
- `.disabled`

That means the visual and semantic disabled states already align with each other.

### 5. Navigation and popovers manage ARIA and focus

The child theme injects submenu toggle buttons in [`inc/Customization/Child_Functions.php`](../../inc/Customization/Child_Functions.php) with an explicit `aria-label`.

The navigation JS then wires ARIA state through:

- [`resources/js/navigation/menu/menu-item-wiring.js`](../../resources/js/navigation/menu/menu-item-wiring.js)
- [`resources/js/lib/popover/dom.js`](../../resources/js/lib/popover/dom.js)
- [`resources/js/lib/popover/focus.js`](../../resources/js/lib/popover/focus.js)

Those pieces write or manage:

- `aria-controls`
- `aria-expanded`
- `aria-haspopup`
- `tabindex`
- panel fallback focus
- focus exclusion for hidden, inert, or `aria-hidden="true"` descendants

For mobile navigation, [`resources/js/navigation/mobile/focus-scope.js`](../../resources/js/navigation/mobile/focus-scope.js) narrows the active tab sequence so only the current open branch stays tabbable inside the dialog body.

These popover and menu primitives centralize disclosure ARIA state, focus handling, and hidden-state management for interactive navigation patterns.

### 6. Gravity Forms gets accessibility-aware UI state

The Gravity Forms integration spans PHP, JS, and SCSS:

- PHP customization in [`inc/Customization/Gravityforms.php`](../../inc/Customization/Gravityforms.php)
- JS behavior in [`resources/js/integrations/gravity-forms-ui.js`](../../resources/js/integrations/gravity-forms-ui.js)
- styling in [`resources/scss/_4-components/forms/_gravity-forms.scss`](../../resources/scss/_4-components/forms/_gravity-forms.scss)

The JS integration already handles:

- `aria-busy` on the form during submission
- `aria-hidden` on the loading overlay
- rerender-safe event binding
- textarea autoresize

That means the loading UI is not purely visual; it also exposes state to assistive technology.

### 7. Small integration shims fix common accessibility gaps

The frontend bootstrap loads a few small accessibility-oriented integrations:

- [`resources/js/integrations/polylang-accessibility.js`](../../resources/js/integrations/polylang-accessibility.js) marks decorative Polylang flag images as `aria-hidden="true"`
- [`resources/js/integrations/wordpress-a11y-shim.js`](../../resources/js/integrations/wordpress-a11y-shim.js) ensures `wp.a11y.speak` exists when scripts expect it
- [`resources/js/integrations/noscript-cleanup.js`](../../resources/js/integrations/noscript-cleanup.js) removes stale `noscript` fragments after JS boot

These files address integration-level accessibility gaps in shared code rather than duplicating fixes in templates.

### 8. Generator templates already contain accessible patterns

The generator-backed module templates are also useful as reference implementations.

Examples:

- [`console/Commands/Modules/Expand/template.php`](../../console/Commands/Modules/Expand/template.php) uses `aria-controls`, `aria-expanded`, `aria-labelledby`, `role="region"`, and `inert`
- [`console/Commands/Modules/Expand/resources/js/expand.js`](../../console/Commands/Modules/Expand/resources/js/expand.js) keeps `aria-expanded`, `aria-hidden`, and `inert` in sync
- [`console/Commands/Modules/Counter/template.php`](../../console/Commands/Modules/Counter/template.php) uses `role="region"` and `aria-live="polite"`

Even if those templates are not the only live runtime surface, they are useful reference patterns for new modules.

## Tools You Can Use To Improve Accessibility

### SCSS tools

Use these before inventing one-off helpers:

- `@include visually-hidden`
- `@include visually-hidden-focusable`
- `@include sr-only`
- `@include overlay-focus-ring`
- `@include btn`
- `@include choice-control-base` and `choice-control-state-*`

Relevant files:

- [`resources/scss/_1-lib/mixins/_mixin-sr-only.scss`](../../resources/scss/_1-lib/mixins/_mixin-sr-only.scss)
- [`resources/scss/_1-lib/mixins/_mixin-links.scss`](../../resources/scss/_1-lib/mixins/_mixin-links.scss)
- [`resources/scss/_1-lib/mixins/_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss)
- [`resources/scss/_1-lib/mixins/_mixin-choice-control.scss`](../../resources/scss/_1-lib/mixins/_mixin-choice-control.scss)

These give you standardized hidden text, focus rings, disabled-state handling, and input/control state styling.

### Preference-aware media aliases

Use the shared custom-media aliases instead of raw media queries when the concern is accessibility or interaction semantics:

- `--motion-ok`
- `--motion-not-ok`
- `--high-contrast`
- `--forced-colors`
- `--mouse`
- `--touch`

That keeps reduced-motion and interaction behavior aligned with the rest of the theme.

### JS primitives

When you need interactive UI, prefer the shared primitives instead of ad hoc DOM scripting:

- `GcPopover` for disclosure/panel patterns with ARIA and focus handling
- `MenuController` for menu trees built on the same popover contract
- `MobileMenu` and its focus-scope helper for dialog-based mobile navigation
- `RevealOnScroll` when animation is needed but should still respect reduced-motion settings

These primitives already centralize ARIA state, focus fallback, and motion behavior used elsewhere in the theme.

### PHP/template patterns

For server-rendered UI:

- centralize accessibility attributes in the model layer when possible, like the Button module does
- prefer real buttons for toggle actions and real links for navigation
- use stable ids plus `aria-controls` and `aria-labelledby` when wiring related regions
- use `inert` and `aria-hidden` together for collapsed interactive regions when appropriate

The Button, Expand, and Counter module code paths are the main reference points currently available in this repository.

## Practical Rules For New Work

- Prefer semantic HTML first. Use ARIA to support or clarify semantics, not to replace obvious native elements.
- Keep focus visible. If you restyle interactive controls, preserve or reapply the shared focus-ring contract.
- Label icon-only controls. If the visible label disappears, an accessible name still needs to exist.
- Keep hidden interactive content out of the tab order. The repo already uses `hidden`, `aria-hidden`, `tabindex="-1"`, and `inert` for this purpose.
- Respect reduced motion. If you add motion, branch it through the shared custom-media aliases or the existing reduced-motion options in JS.
- Reuse shared primitives before creating new ones. The popover, menu, button, and screen-reader helpers are already built to carry accessibility state.
- Test keyboard-only navigation, screen-reader naming/state, and reduced-motion behavior for any new interactive component.

## Where To Start

If the work is mostly:

- interactive UI: start with [Popover System](./popover-system.md) and [JavaScript Architecture](./javascript-architecture.md)
- motion or preference-aware styling: start with [Custom Media Reference](../design-system/custom-media.md) and [Reveal On Scroll](./reveal-on-scroll.md)
- shared CSS helpers: start with [SCSS Mixins Deep Dive](../design-system/scss-mixins.md)
- buttons or link-like controls: start with [Button Pattern](./button-pattern.md) and [Button Mixins Deep Dive](../design-system/button-mixins.md)

## Related Docs

- [JavaScript Architecture](./javascript-architecture.md)
- [Popover System](./popover-system.md)
- [Button Pattern](./button-pattern.md)
- [SCSS Mixins Deep Dive](../design-system/scss-mixins.md)
- [Custom Media Reference](../design-system/custom-media.md)
