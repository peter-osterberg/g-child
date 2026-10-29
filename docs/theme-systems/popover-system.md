# Popover System

The popover system lives in [`resources/js/lib/popover/`](../../resources/js/lib/popover) and is the shared floating-panel primitive used by multiple frontend features.

It is not only a tooltip-like helper. In this project it is the reusable interaction layer behind:

- desktop navigation submenus
- mega menus
- nested menus
- mobile menu extra panels
- listing filter dropdowns

## Public Entry Points

The package barrel is [`resources/js/lib/popover/index.js`](../../resources/js/lib/popover/index.js).

It exports:

- `GcPopover`
- `GcPopoverRegistry`
- `GcPopoverHoverController`
- `initDeclarativePopovers`

The default option objects live in:

- [`resources/js/lib/popover/options.js`](../../resources/js/lib/popover/options.js)
- [`resources/js/lib/popover/hover-options.js`](../../resources/js/lib/popover/hover-options.js)

They are imported directly by consumers that need them rather than re-exported from the barrel.

## File Layout

```text
resources/js/lib/popover/
├── dom.js
├── floating.js
├── focus.js
├── hover-controller.js
├── hover-options.js
├── index.js
├── init.js
├── instance.js
├── listeners.js
├── motion.js
├── options.js
├── panel.js
├── registry.js
└── transition.js
```

## Responsibilities By File

### `instance.js`

Main orchestration class.

Responsibilities:

- resolves trigger and panel elements
- merges options with defaults
- manages open and close state
- creates and destroys the Floating UI instance
- coordinates DOM state, focus, motion, registry behavior, and lifecycle hooks
- installs global listeners while open

### `init.js`

Declarative bootstrap for simple markup-driven popovers.

Responsibilities:

- scans the DOM for `[data-gc-toggle]`
- skips triggers or panels already owned by an existing popover instance
- creates `GcPopover` instances using attribute-resolved panel references
- allows simple auto-wired dropdowns without custom page-specific JS

### `panel.js`

Shared panel-resolution helper.

Responsibilities:

- resolve panels from ids, selectors, and `HTMLElement` references
- resolve the panel target from trigger attributes in a consistent order
- keep manual and declarative popover wiring on the same lookup rules

### `dom.js`

DOM-state adapter.

Responsibilities:

- ensures the panel has an id
- manages `aria-controls`, `aria-expanded`, and `aria-haspopup`
- toggles open and active classes
- handles `hidden` state when `useHidden` is enabled
- temporarily disables pointer events during transitions
- clears inline animation styles on cleanup

### `focus.js`

Focus helper for popover panels.

Responsibilities:

- finds the first focusable or first visible candidate
- ignores candidates inside hidden, inert, or `aria-hidden="true"` ancestors
- detects whether the first focus target is a text-entry control
- supports deferred focus requests during open
- uses `focus({ preventScroll: true })` when the browser supports it
- falls back to focusing the panel itself when needed

### `motion.js`

Animation wrapper around Anime.js WAAPI.

Responsibilities:

- runs open and close animations
- stops or cancels existing motion
- waits for the current animation to finish
- clears animation references after transitions
- keeps the rest of `GcPopover` insulated from direct `waapi.animate()` calls

### `registry.js`

Global static registry of live popover instances.

Responsibilities:

- track instances
- prune disconnected instances before stack lookups or sibling-closing decisions
- close unrelated open siblings when configured
- preserve connected popovers so nested or related structures do not collapse incorrectly

### `hover-controller.js`

Hover-mode controller layered on top of a `GcPopover`.

Responsibilities:

- enable hover interactions only when the media query matches
- schedule delayed open and close behavior
- keep the panel open while pointer movement stays within connected popovers
- bind to both the hover target and the panel

### `options.js`

Default config for the main popover class.

### `hover-options.js`

Default config for hover behavior.

## The `GcPopover` Lifecycle

The main class is [`resources/js/lib/popover/instance.js`](../../resources/js/lib/popover/instance.js).

### Construction

`GcPopover` now supports two construction styles:

- `new GcPopover(trigger, panel, options)`
- `new GcPopover(trigger, options)`

In the second form, the panel is resolved from the trigger markup via `data-gc-toggle`.

`data-gc-toggle` is the preferred attribute. It can point to:

- a bare id like `filters-panel`
- an id selector like `#filters-panel`
- a selector like `.filters-panel`

Construction does the following:

1. merges provided options with the defaults from `options.js`
2. resolves the trigger and panel elements, including panel lookup from trigger attributes when no explicit panel argument is provided
3. resolves optional `hoverTarget`, `referenceElement`, `ariaControllerElement`, and `outsideClickBoundary`
4. creates helper objects:
   - `GcPopoverDom`
   - `GcPopoverFocus`
   - `GcPopoverMotion`
5. binds the click and global event handlers
6. initializes DOM state
7. registers the instance in `GcPopoverRegistry`
8. attaches a hover controller if one is provided in options

When the main front-end bundle runs, [`resources/js/app.js`](../../resources/js/app.js) also calls `initDeclarativePopovers()`, so any simple `[data-gc-toggle]` trigger can be auto-initialized without extra feature code.

## Open Flow

When `open()` runs:

1. it exits early if the popover is already open and idle
2. it optionally closes unrelated open popovers through the registry
3. it clears hover timers and stops any in-flight animation
4. it marks the instance as open and animating
5. it emits `onOpenStart`
6. it updates DOM state through `popover-dom`
7. it creates the Floating UI instance and runs an initial position update
8. it runs the open animation
9. after the animation finishes, it re-enables pointer events
10. it binds global document and viewport listeners
11. it either focuses the first item or consumes any deferred focus request
12. it emits `onOpenEnd`

## Close Flow

When `close()` runs:

1. it exits early if the popover is already closed and idle
2. it clears focus requests, hover timers, and in-flight motion
3. it marks the instance as closed and animating
4. it emits `onCloseStart`
5. it begins the close DOM state transition
6. it runs the close animation
7. after the animation finishes, it:
   - finalizes the DOM closed state
   - resets inline styles
   - destroys the Floating UI instance
   - removes global listeners
   - optionally restores focus to the trigger
8. it emits `onCloseEnd`

## Core Options

The defaults live in [`resources/js/lib/popover/options.js`](../../resources/js/lib/popover/options.js).

Important options:

- `placement`: Floating UI placement, default `bottom-start`
- `strategy`: positioning strategy, default `absolute`
- `offset`
- `padding`
- `enablePositioning`: allows bypassing Floating UI entirely
- `closeOnReferenceHidden`: closes the panel when Floating UI reports that the reference element has scrolled or clipped out of view
- `closeOnOutsideClick`
- `closeOnEscape`
- `closeOnTriggerClick`
- `closeSiblings`
- `preventLinkNavigation`
- `focusTextEntryOnTriggerClick`
- `syncTextEntryFocusOnOpen`
- `openClass`
- `activeClass`
- `useHidden`
- `openAnimationParams`
- `closeAnimationParams`
- `hoverTarget`
- `referenceElement`
- `ariaControllerElement`
- `outsideClickBoundary`
- `hoverController`
- `onOpenStart`
- `onOpenEnd`
- `onCloseStart`
- `onCloseEnd`

## Important Resolved Elements

`GcPopover` distinguishes several element roles:

- `trigger`: the element that receives the click listener
- `panel`: the floating content element
- `hoverTarget`: the element that drives hover open and close behavior
- `referenceElement`: the element Floating UI positions against
- `ariaControllerElement`: the element that receives ARIA attributes
- `outsideClickBoundary`: an optional boundary inside which outside clicks should not dismiss the popover

These can all be different. This supports menu systems with split toggles and custom reference containers.

## DOM State Contract

`GcPopoverDom` sets a few consistent behaviors:

- the panel gets an id if it does not already have one
- the controlling element always gets:
  - `aria-controls`
  - `aria-expanded`
  - `aria-haspopup`
- the panel receives the configured open class while visible
- the trigger receives the configured active class while open
- the panel uses `hidden` by default when closed

This means any CSS or accessibility work around popovers should assume those states are the stable contract.

If you use the attribute-driven panel lookup, `GcPopoverDom` still normalizes the controller relationship by writing the final `aria-controls` value back to the controlling element.

## Focus Model

`GcPopoverFocus` is intentionally conservative.

Key behaviors:

- `focusFirst()` focuses the first visible focusable element
- if no visible focusable exists, the panel itself becomes the fallback focus target
- `request({ textEntryOnly })` stores a deferred focus request during interaction
- `consume()` applies that request after the popover is actually open
- `isTextEntry()` treats inputs, textareas, selects, and contenteditable fields as text-entry contexts
- visibility checks walk ancestor state, so focus is not moved into descendants of hidden, inert, or `aria-hidden="true"` containers
- managed focus attempts use `preventScroll`, which reduces page jump when a popover contains a search field or other form control

This is used to make keyboard and text-entry interactions smoother, especially when the trigger opens a panel containing a search field or form control.

## Motion Model

`GcPopoverMotion` is intentionally thin.

It takes the configured open and close animation parameter objects and delegates the actual animation to `animejs` WAAPI.

### What “WAAPI” means here

This code does not call the browser's `element.animate(...)` API directly. Instead it imports `waapi` from `animejs` and calls `waapi.animate(element, params)`.

That gives the project a small wrapper around the Web Animations API with a cleaner animation-parameter format and a thenable animation object that can be `await`ed.

In practice, the popover system uses WAAPI for three reasons:

- it keeps the animation work imperative and local to open/close state transitions
- it animates only transient presentation properties like `opacity` and `transform`
- it returns a cancellable animation handle, which matters when users click quickly or move between connected popovers before a previous transition has finished

### What the parameter objects are

[`resources/js/lib/popover/options.js`](../../resources/js/lib/popover/options.js) defines `openAnimationParams` and `closeAnimationParams`.

Those objects are passed straight into `waapi.animate()`. For example:

```js
openAnimationParams: {
	opacity: [0, 1],
	y: [-10, 0],
	duration: 220,
}
```

That means:

- start with `opacity: 0` and end at `opacity: 1`
- start translated `-10px` on the Y axis and end at `0`
- run the animation for `220ms`

Anime.js maps the shorthand `y` property onto a transform animation, so the panel moves using `transform` rather than layout-affecting properties like `top` or `margin`.

Defaults:

- open: fade in and move from `y: -10` to `0` over `220ms`
- close: fade out and move from `y: 0` to `-6` over `180ms`

### How `GcPopover` uses the animation handle

`GcPopoverMotion.run(type, element)` stores the result of `waapi.animate(...)` and returns it.

The calling flow in [`resources/js/lib/popover/instance.js`](../../resources/js/lib/popover/instance.js) is:

1. update the DOM into the opening or closing state
2. start the WAAPI animation
3. `await` the running animation through `GcPopoverMotion.wait()`
4. finalize the DOM state only if the transition token still matches the latest open/close action

That last point matters because popovers are interruptible. If an open is immediately followed by a close, or vice versa, the older animation may still resolve later. The `transitionToken` guard prevents that stale completion from applying the wrong final DOM state.

### Why cancellation matters

Before a new transition starts, the main class calls `GcPopoverMotion.stop()`.

`stop()` does this:

- `cancel()` if the returned animation exposes cancellation
- otherwise `pause()` as a fallback
- clear the cached animation reference

That prevents multiple overlapping WAAPI animations from fighting over the same panel styles.

### Relationship to DOM cleanup

WAAPI drives the in-between frames, but it is not responsible for the permanent closed/open state.

After transitions finish, the popover system still explicitly:

- toggles `hidden`
- toggles `is-open` and `is-active`
- restores pointer events
- clears temporary inline animation styles like `opacity`, `transform`, and `will-change`

That split is intentional: animation handles the visual transition, while `GcPopoverDom` remains the source of truth for durable DOM state and accessibility state.

The main class uses a `transitionToken` guard so stale async animation completions do not overwrite a newer open or close action.

## Registry Behavior

The registry in [`registry.js`](../../resources/js/lib/popover/registry.js) is what makes complex menu trees workable.

### Connected popovers

Two popovers are considered connected when:

- one panel contains the other trigger
- one panel contains the other panel
- or the relationship is reversed

### Why the registry matters

When `closeSiblings` is enabled, opening one popover closes unrelated open popovers, but connected popovers stay open.

Before those sibling and stack checks run, the registry also prunes disconnected instances. That prevents stale popovers from surviving partial rerenders and then stealing Escape handling or sibling-close behavior later.

That prevents:

- nested submenus from collapsing when entering a child panel
- one branch of a menu tree from leaving unrelated branches open

## Hover Controller

The hover controller in [`hover-controller.js`](../../resources/js/lib/popover/hover-controller.js) adds delayed hover interactions on top of `GcPopover`.

Default values from [`hover-options.js`](../../resources/js/lib/popover/hover-options.js):

- `hoverMediaQuery: '(hover: hover) and (pointer: fine)'`
- `openDelay: 60`
- `closeDelay: 120`

### Behavior

- hover mode is active only when the media query matches
- `pointerenter` on the hover target schedules open
- leaving the hover target schedules close, unless the pointer moves into the panel
- entering the panel clears close timers
- leaving the panel schedules close, unless the pointer moves into:
  - the hover target
  - the trigger
  - a connected open popover

That last rule is what keeps related popovers usable in multi-level navigation.

## Typical Usage Patterns In This Repo

### 1. Standalone dropdowns

[`resources/js/listing/listing-filter-popover.js`](../../resources/js/listing/listing-filter-popover.js) uses `GcPopover` directly:

```js
new GcPopover(trigger, panel, popover);
```

This is the simplest usage pattern:

- one trigger
- one panel
- no custom hover controller
- no special registry orchestration beyond the defaults

The listing dropdown wrapper also enables `closeOnReferenceHidden` by default, so a filter panel closes when its trigger scrolls out of view instead of staying open and reappearing later.

### 2. Menu entries

[`resources/js/navigation/menu/menu-item-popover.js`](../../resources/js/navigation/menu/menu-item-popover.js) is the most complete example.

It customizes:

- `hoverTarget: entry.item`
- `referenceElement: entry.reference`
- `ariaControllerElement: entry.trigger`
- lifecycle hooks that dispatch menu events and sync split-toggle ARIA state

It also attaches `GcPopoverHoverController` when the entry mode supports hover.

This is the most complete in-repo example of integrating popovers into a structured navigation model.

### 3. Menu defaults

[`resources/js/navigation/menu/menu-options.js`](../../resources/js/navigation/menu/menu-options.js) shows how the project configures popovers for menus:

- menu popovers inherit the shared defaults
- they disable sibling closing at the base menu layer
- they disable link-navigation prevention at the base menu layer
- nested menus and mega menus can override placement and hover delays separately

### 4. Mobile menu panels

The mobile navigation system creates additional `GcPopover` instances for off-canvas or extra panels, but keeps them bounded inside the mobile dialog by supplying an `outsideClickBoundary`.

That pattern is useful anywhere you want “outside click” dismissal to mean “outside this subsystem” instead of “outside the entire document”.

### 5. Declarative toggles

[`resources/js/lib/popover/init.js`](../../resources/js/lib/popover/init.js) is the lightweight path for simple popovers.

It is bootstrapped from [`resources/js/app.js`](../../resources/js/app.js), and it only scans `[data-gc-toggle]`.

That means:

- simple standalone markup can work without writing a page-specific initializer
- menu and listing popovers can keep their richer explicit wiring
- plain `aria-controls` attributes are not treated as an auto-init signal, which avoids sweeping up unrelated controls

## Lifecycle Hooks

The four lifecycle hooks are:

- `onOpenStart`
- `onOpenEnd`
- `onCloseStart`
- `onCloseEnd`

Each receives:

- `popover`
- any method-specific detail such as `focusFirst` or `focusTrigger`

The project commonly uses these hooks to:

- dispatch higher-level menu events
- synchronize ARIA state for split toggles
- manage focus behavior in wrapper systems like the mobile menu

## When To Use `GcPopover`

Use `GcPopover` when you need:

- a floating panel anchored to a trigger
- consistent ARIA and hidden-state behavior
- optional hover support
- escape and outside-click dismissal
- shared behavior with the rest of the theme’s menus and dropdowns

Do not reach for a separate one-off dropdown implementation unless the interaction model is genuinely different.

## Minimal Example

If the main front-end app bundle is loaded, this markup initializes automatically:

```html
<button
	type="button"
	class="dropdown-label"
	data-gc-toggle="filter-dropdown"
>
	Filters
</button>

<div id="filter-dropdown" class="filter-dropdown" hidden>
	...
</div>
```

No extra page-specific JS is required in that case because [`resources/js/app.js`](../../resources/js/app.js) calls `initDeclarativePopovers()`.

If you need to wire a popover outside the normal app bootstrap, you can still instantiate it manually:

```js
import { GcPopover } from '../lib/popover/index.js';

const trigger = document.querySelector('[data-gc-toggle="filter-dropdown"]');

if (trigger instanceof HTMLElement) {
	new GcPopover(trigger, {
		placement: 'bottom-start',
		closeOnOutsideClick: true,
	});
}
```

## Practical Notes

- If the trigger is an anchor, `preventLinkNavigation` defaults to `true`, so clicks open the panel instead of navigating.
- Prefer `data-gc-toggle` for declarative wiring.
- If you need a different ARIA controller than the click target, provide `ariaControllerElement`.
- If the panel should position relative to something other than the trigger, provide `referenceElement`.
- If “outside click” should ignore interactions inside a local shell such as a dialog, provide `outsideClickBoundary`.
- If you need hover behavior, prefer `GcPopoverHoverController` rather than custom pointer timing code.
