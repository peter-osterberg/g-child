# Runtime And Customizations

## Boot Sequence

The runtime entrypoint is [`functions.php`](../../functions.php).

1. `style.css` declares this as a child theme of `generation-theme`.
2. `functions.php` defines constants such as `GTHEME_CHILD_DIR` and reads the `prefix` file into the `GTheme_Child\PREFIX` constant when present.
3. Composer autoloading is loaded from `vendor/autoload.php`.
4. The `Theme` singleton is instantiated and `run()` is called immediately.
5. On `init` priority `1`, the child theme creates its own `GTheme_Child\Utils\Asset_Loader` pointed at `dist/`.
6. Each child-theme singleton service runs its own `init()` method and attaches WordPress hooks and filters.

The singletons are declared in `Theme::CLASSES` and are the main runtime surface of the child theme.

## Runtime Services

### `inc/I18n.php`

- loads translation files from `languages/` on `after_setup_theme`
- current locale files in the repo are `sv_SE.po` and `sv_SE.mo`

### `inc/Scripts.php`

- resolves source entries through the child Vite manifest loader
- frontend: `resources/js/app.js`, `resources/scss/app.scss`, and `resources/fonts/fonts.css`
- admin: `resources/scss/editor-admin.scss` and `resources/fonts/fonts.css`
- WYSIWYG editor: `resources/scss/editor.scss` and `resources/fonts/fonts.css`

Scripts are ES modules. CSS uses hashed stylesheet URLs in disk builds. In hot mode, page styles use native Vite HMR and WYSIWYG styles use direct CSS responses.

`editor.scss` reuses the shared theme, base, components, and utilities layers. `editor-admin.scss` loads the theme layer for admin token and variable support.

### `inc/Shortcodes.php`

- registers `[search_count_results]`
- prints the current search result count and the active search query

## Customization Classes

### `inc/Customization/Admin.php`

- forces regular posts to use the WYSIWYG editor instead of the parent page builder via `gt_post_page_builder_mode`
- adds `dialog` to the set of valid HTML tags for the editor

### `inc/Customization/Gravityforms.php`

- disables Gravity Forms default CSS
- switches the Gravity Forms theme slug to `g-theme-child`
- rewrites submit markup from `<input>` to `<button>`
- removes the confirmation anchor jump behavior
- removes the default required-field legend text
- forces AJAX submission mode for Gravity Forms 2.9+

This PHP layer is paired with frontend behavior in [`resources/js/integrations/gravity-forms-ui.js`](../../resources/js/integrations/gravity-forms-ui.js).

### `inc/Customization/Style_Options.php`

- extends editor style formats with button variants, button colors, button sizes, button modifiers, extra heading styles, list styles, and text color styles
- adds extra color-picker tokens such as `background-1` through `background-4`

The custom Button builder module reads style-format definitions from the parent/child theme support layer so that its builder field choices stay aligned with the same CSS class system.

### `inc/Customization/Child_Functions.php`

This is the main hook collection for child-theme behavior:

- adds the extra date format option `j F, Y`
- changes listing clear-filter label to `Clear`
- injects submenu toggle buttons into menu items that have children
- sets theme container width to `1680`
- replaces builder-generated color/background output with child-theme CSS variable relationships
- adds background-color-derived CSS classes to sections, rows, columns, and modules
- contains optional, currently commented-out Polylang admin/display tweaks

### `inc/Customization/Templates.php`

- rewraps blurb module item elements into custom wrapper structures
- rewraps listing item elements into a `.listing-item-text-wrapper`

These are structural page-builder template customizations rather than conventional WordPress template overrides.

### `inc/Customization/Modules.php`

- registers child-theme modules through the `gt_modules` filter
- the only active live module currently registered from this repo is `Button_Controller::class`

## Generator-Backed Registry Files

The following classes are placeholder registries that the included generators write into:

- [`inc/Customization/Utils/Child_Post_Types.php`](../../inc/Customization/Utils/Child_Post_Types.php)
- [`inc/Customization/Utils/Child_Taxonomies.php`](../../inc/Customization/Utils/Child_Taxonomies.php)
- [`inc/Customization/Utils/Child_Metaboxes.php`](../../inc/Customization/Utils/Child_Metaboxes.php)

They intentionally rely on marker comments such as:

- `/* POST_TYPE */`
- `/* TAXONOMY */`
- `/* METABOX */`

If you remove those markers, the included CLI generators will stop being able to inject new definitions automatically.

`Child_Post_Types.php` also contains rewrite-rule handling for post-type pagination and canonical redirect exceptions.
