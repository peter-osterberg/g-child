# Button Pattern

The custom Button module is the current reference implementation of the module pattern used in this child theme.

It lives in [`inc/Modules/Button/`](../../inc/Modules/Button/) and is useful as a reference because it shows how this project expects a builder module to behave:

- the controller exposes builder metadata and field options
- the field config builds the editor UI
- the model normalizes raw builder data into render-ready state
- the template stays thin and only renders already-computed values
- module-scoped SCSS handles layout concerns, while the visual button system stays shared

This is a builder module that adapts the shared theme button design system into page-builder content.

## The Core Idea

The main pattern is separation of responsibilities.

The Button module does not hardcode a completely separate style system for builder content. Instead, it reuses the same `.btn`, color, size, and modifier class system that the theme exposes through style formats and shared SCSS.

That gives the project one button vocabulary across:

- WYSIWYG/editor formats
- builder module options
- shared frontend CSS classes

In practice, the module is a bridge between builder data and the shared button class contract.

## End-To-End Flow

The Button module flow is:

1. [`inc/Customization/Modules.php`](../../inc/Customization/Modules.php) registers [`Button_Controller::class`](../../inc/Modules/Button/Button_Controller.php) through the `gt_modules` filter.
2. [`inc/Modules/Button/Button_Controller.php`](../../inc/Modules/Button/Button_Controller.php) defines the module title, icon, field option sources, and asset-loader integration.
3. [`inc/Modules/Button/fields.php`](../../inc/Modules/Button/fields.php) builds the builder UI, including repeatable button entries and conditional fields.
4. Builder data is loaded into [`inc/Modules/Button/Button.php`](../../inc/Modules/Button/Button.php), which acts as the module model.
5. The model converts raw field values into:
   - normalized URLs
   - resolved tag choice (`a` or `button`)
   - final class strings
   - final attribute strings
   - icon payloads
6. [`inc/Modules/Button/template.php`](../../inc/Modules/Button/template.php) renders those computed values.
7. [`inc/Modules/Button/resources/scss/button.scss`](../../inc/Modules/Button/resources/scss/button.scss) styles the module wrapper layout, not the full visual button appearance.

That separation is the intended module pattern.

## Controller Pattern

[`Button_Controller.php`](../../inc/Modules/Button/Button_Controller.php) is responsible for builder-facing metadata and option sourcing.

Key roles:

- declares the builder icon and title
- reads style formats from `GTheme()->support::style_formats()`
- converts those style-format definitions into select options for:
  - variants
  - colors
  - sizes
  - modifiers
- filters modifier availability based on the active variant
- removes the inherited `overlay_link` field that does not fit this module
- returns the parent theme asset loader so module assets resolve through the normal pipeline

The controller pattern here is that it does not invent button classes in isolation. It reads them from the same shared format registry used elsewhere in the theme.

## Field Pattern

[`fields.php`](../../inc/Modules/Button/fields.php) shows how complex builder UIs are assembled in this codebase.

The module has wrapper-level fields:

- `layout`
- `align`
- `buttons` as a repeatable field group

Each button entry then contains:

- visible label text
- a link container
- style selection
- color and size controls
- modifier controls
- icon-only mode
- custom icon toggles and icon pickers
- advanced settings like CSS id, CSS classes, `data-*` attributes, and disabled state

Two patterns matter here:

### 1. Conditional UI instead of post-validation-only logic

The field config uses many conditional rules so the editor only sees relevant controls.

Examples:

- icon-only mode hides text-button-only settings
- text-style buttons use `text_size` instead of the normal `size`
- prefix and suffix custom icon fields only appear when the relevant modifier is active

That keeps the editor UI aligned with the render logic.

### 2. Parent-theme helper reuse

The icon field groups come from `GTheme()->icon_renderer->get_component_icon_fields(...)` instead of reimplementing icon picker configuration locally.

This is another recurring pattern in the project: child-theme modules reuse parent-theme helpers when a shared subsystem already exists.

## Model Pattern

[`Button.php`](../../inc/Modules/Button/Button.php) is where the raw builder data becomes safe, normalized render state.

This is where the pattern normalizes raw builder data into render-ready state.

### Wrapper-level state

The module itself stores:

- `buttons` as the repeatable entry array
- `layout`
- `align`

Its `get_classes()` method appends wrapper classes such as:

- `btn-layout-inline` or `btn-layout-block`
- `btn-align-left`, `btn-align-center`, or `btn-align-right`

Those wrapper classes are for the module container, not the individual button visuals.

### Per-button normalization

`build_buttons()` loops through each raw button entry and computes:

- `btn_url`
- `btn_tag`
- `btn_attributes`
- `btn_classes`

That means the template does not need to guess or branch heavily.

### URL normalization

`format_button_url()` converts values into the right kind of link:

- email-like input becomes `mailto:`
- phone-like input becomes `tel:`
- regular URLs stay regular URLs
- linked posts resolve through `get_permalink()`

This illustrates why normalization belongs in the model, not in the template.

### Class construction

`build_button_classes()` composes the final class string from:

- the chosen variant
- color
- size or text size
- active modifiers
- icon-state flags
- disabled-link state
- user-supplied extra classes

It also switches behavior depending on button mode:

- icon-only buttons use `modifiers_icon_only`
- text-style buttons use `modifiers_text`
- default buttons use `modifiers`

That mode-aware class assembly is a major part of the Button pattern. The builder may expose multiple editing modes, but the render layer still produces one clean class string.

### Attribute construction

`build_button_attributes()` handles:

- `href`
- `id`
- `aria-label` for icon-only buttons
- `tabindex` and `aria-disabled`
- `disabled` when the tag is a real `<button>`
- `target` and `rel` for new-tab links
- custom `data-*` attributes

This pattern keeps accessibility and attribute normalization in the model so templates can stay simple.

### Icon payload resolution

The model also resolves icon payloads through:

- `get_icon_only_data()`
- `get_icon_start_data()`
- `get_icon_end_data()`

Those helpers hide the complexity of icon library prefixes and per-library weight/name fields from the template.

## Template Pattern

[`template.php`](../../inc/Modules/Button/template.php) is intentionally thin.

It does four things:

1. exits early if the model is missing or unusable
2. asks the model for `build_buttons()`
3. loops over the normalized button entries
4. renders the final markup and icons

Important details:

- the tag is restricted to `a` or `button`
- the template trusts the model for the final attribute string and class string
- icon SVG rendering is delegated to `gt_icon_svg(...)`
- visible text is omitted for icon-only buttons, but the label can still be preserved as `aria-label`

This template pattern keeps branching and data shaping in the model layer so the template remains mostly output-focused.

## Styling Pattern

[`inc/Modules/Button/resources/scss/button.scss`](../../inc/Modules/Button/resources/scss/button.scss) is intentionally small.

It styles the module wrapper:

- flex layout
- wrap behavior
- gap variables
- left/center/right alignment
- inline versus stacked layout

It does not redefine the complete visual button appearance.

That appearance comes from the shared button system in [`resources/scss/_1-lib/mixins/_mixin-button.scss`](../../resources/scss/_1-lib/mixins/_mixin-button.scss) and the style-format class contract defined in [`inc/Customization/Style_Options.php`](../../inc/Customization/Style_Options.php).

For a deeper explanation of the SCSS side of that system, see [Button Mixins Deep Dive](../design-system/button-mixins.md).

This architectural split is:

- module SCSS handles module-specific structure
- shared `.btn` styles handle button visuals, variants, colors, and sizes

That prevents the builder module from drifting away from the rest of the design system.

## Why The Style-Format Integration Matters

The Button module pulls its selectable classes from the same style-format registry that also defines button styles for other editor contexts.

From [`Style_Options.php`](../../inc/Customization/Style_Options.php), the shared registry defines classes such as:

- variants: `btn btn-filled`, `btn btn-outline`, `btn btn-ghost`, `btn btn-tonal`, `btn btn-text`
- colors: `btn-primary`, `btn-secondary`
- sizes: `btn-sm`, `btn-lg`
- modifiers: `btn-icon-start`, `btn-icon-end`, `btn-block`, `btn-round`, `btn-square`

That means:

- builder users choose from centrally-defined options
- CSS only needs to support one class vocabulary
- editor formats and builder modules stay aligned

This is the deeper pattern behind the module: configuration should flow from shared design-system registries rather than being duplicated in each feature.

## What To Copy For New Modules

If you build a new module using this as the reference, copy these patterns:

- register the module through [`inc/Customization/Modules.php`](../../inc/Customization/Modules.php)
- keep the controller focused on metadata and option sourcing
- keep the field file declarative and use conditional logic aggressively
- let the model normalize raw builder data into explicit render-ready values
- keep the template mostly output-only
- keep module SCSS focused on wrapper structure when shared component styles already exist elsewhere
- reuse parent-theme helpers instead of recreating shared subsystems

## What Not To Copy Blindly

Some details are Button-specific and should not be generalized without thought:

- variant-specific modifier filtering
- icon library field naming conventions
- the `mailto:` and `tel:` URL normalization rules
- rendering either `<a>` or `<button>` from one data model

Those are good solutions for buttons, but they are not automatically the right abstraction for every module.

## Short Summary

The Button pattern in this project is:

- shared design-system classes defined centrally
- builder fields derived from those shared definitions
- a model that converts editor data into normalized render state
- a thin template that only renders computed output
- module-local SCSS limited to wrapper layout concerns

The Button module is the current reference implementation for new child-theme modules.
