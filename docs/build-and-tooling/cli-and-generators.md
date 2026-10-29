# CLI And Generators

The root executable is [`gchild`](../../gchild).

Run it from the theme root with:

```bash
php gchild
```

It loads Symfony Console and forces the interactive `manage` menu as the default command.

Treat that menu as the primary interface. The underlying subcommands are registered internally, but the entrypoint is configured around the menu-first workflow rather than the normal Symfony `list` and `help` flow.

This page covers the Symfony Console generator CLI. The Figma token scripts are separate Node utilities under [`console/figma-converter/`](../../console/figma-converter) and are invoked through the pnpm scripts documented in [Setup And Commands](../getting-started/setup-and-commands.md).

## Menu Actions And Backing Commands

- `Insert Module from library` -> `insert:module`
- `Make Module` -> `make:module`
- `Make Post Type` -> `make:cpt`
- `Make Taxonomy` -> `make:tax`
- `Make Metabox` -> `make:mtbx`

## Template Sources

Insertable library modules live under [`console/Commands/Modules/`](../../console/Commands/Modules/).

Current library modules:

- `Counter`
- `Expand`

The blank module scaffold used by `make:module` lives under [`console/Commands/Dummy/`](../../console/Commands/Dummy/).

## What Each Command Does

### `insert:module`

- lets you pick a module from `console/Commands/Modules/`
- copies it into `inc/Modules/`
- registers its controller in `inc/Customization/Modules.php`

### `make:module`

- clones the `console/Commands/Dummy/` template
- creates PHP files, template file, and resource folders for a new module
- generates kebab-case JS and SCSS filenames so they match the Vite asset contract
- registers the new controller in `inc/Customization/Modules.php`

### `make:cpt`

- injects a new post type definition into `inc/Customization/Utils/Child_Post_Types.php`

### `make:tax`

- injects a taxonomy definition into `inc/Customization/Utils/Child_Taxonomies.php`

### `make:mtbx`

- interactively builds metabox field definitions
- injects the resulting config into `inc/Customization/Utils/Child_Metaboxes.php`

## Important Caveat About Generators

These generators are simple file mutation scripts. They depend on fixed marker comments and string replacements, not on AST parsing.

Do not casually remove or rename marker comments such as:

- `/* CONTROLLERS BELOW */`
- `/* NEW MODULES BELOW */`
- `/* POST_TYPE */`
- `/* TAXONOMY */`
- `/* METABOX */`

If those markers disappear, generator commands will silently stop updating the expected files correctly.

The module asset checker also validates filenames in:

- `inc/Modules/`
- `console/Commands/Modules/`
- `console/Commands/Dummy/`

So if you change the module template structure, keep the module source naming contract intact there as well.
