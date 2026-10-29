# Polylang custom flags

This folder holds custom flag files for Polylang.

If more flags need to be added, use the SVGs from the Flag Icons repository:

- <https://github.com/lipis/flag-icons/tree/main/flags/4x3>

Polylang picks up custom flags by matching the filename to the language locale configured in `Languages -> Languages` in WordPress.

## Rename rule

Download the country SVG you need from the Flag Icons repo, then rename it from the country code to the exact WordPress locale used by that language in Polylang.

Examples:

- `gb.svg` -> `en_GB.svg`
- `us.svg` -> `en_US.svg`
- `se.svg` -> `sv_SE.svg`
- `fr.svg` -> `fr_FR.svg`
- `no.svg` -> `nb_NO.svg`
- `fi.svg` -> `fi.svg`

Notes:

- Keep the file extension as `.svg`.
- The filename must match the locale exactly, including uppercase and lowercase characters.
- Put the renamed file in this folder: `/polylang/`
- After adding or replacing a flag, go to `Languages -> Settings`, open `URL modifications`, and click `Save Changes` so Polylang refreshes the custom flag mapping.
