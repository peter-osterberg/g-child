import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import stylelint from 'stylelint';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error('Usage: node console/import-component-scss.mjs <Figma SCSS export>');
}

const source = readFileSync(sourcePath, 'utf8');
const groups = {
  button: ['button-sizes'],
  search: ['search'],
  card: ['card', 'card-sizes', 'card-states'],
  forms: ['input', 'input-states', 'input-icon', 'label', 'field-message', 'field-message-states', 'choice', 'choice-states', 'checkbox', 'radio'],
};

/**
 * Read a top-level map from the plugin's SCSS export.
 *
 * @param {string} name Exported map name.
 * @returns {string} Complete Sass map declaration.
 */
function exportedMap(name) {
  const start = source.indexOf(`$${name}: (`);
  const end = source.indexOf('\n);', start);

  if (start < 0 || end < 0) {
    throw new Error(`Missing exported map: $${name}`);
  }

  return source.slice(start, end + 3);
}

/**
 * Keep styling values; WordPress owns content and the module owns component roles.
 *
 * @param {string} name Exported map name.
 * @returns {string} Sass map without example content or component metadata.
 */
function stylingMap(name) {
  return exportedMap(name)
    .replace(/^([ \t]+)["']content["']:\s*\(\n[\s\S]*?^\1\),?\n/gm, '')
    .replace(/^[ \t]+["']component["']:[^\n]*\n/gm, '');
}

const values = [...exportedMap('variable-values').matchAll(/^ {2}["']([\w-]+)["']:\s*(.+),$/gm)]
  .map(([, name, value]) => [name, value]);

/**
 * Keep only the values owned by this map; CSS generation belongs to the theme.
 *
 * @param {string} name Output map name.
 * @param {RegExp} pattern Exported names owned by the map.
 * @returns {string} Sass value map.
 */
function valueMap(name, pattern) {
  const entries = values.filter(([key]) => pattern.test(key));
  entries.sort(([a], [b]) => a.localeCompare(b));

  return `$${name}: (\n${entries.map(([key, value]) => `  '${key}': ${value},`).join('\n')}\n);`;
}

const componentValues = new Map(values);

/**
 * Resolve shadow geometry into complete values while keeping the theme color live.
 *
 * @returns {string} Sass shadow scale with one value per size.
 */
function shadowMap() {
  const entries = values.filter(([name]) => name.startsWith('shadow-') && componentValues.has(`${name}-x`));
  entries.sort(([a], [b]) => a.localeCompare(b));

  return `$shadows: (\n${entries.map(([name, value]) => {
    const shadow = value.replace(/var\(--(shadow-[\w-]+-(?:x|y|blur|spread))\)/g, (reference, part) => {
      if (!componentValues.has(part)) {
        throw new Error(`Missing exported shadow value: ${part}`);
      }

      return componentValues.get(part);
    });

    return `  '${name.slice(7)}': ${shadow},`;
  }).join('\n')}\n);`;
}

/**
 * Components reference a shared shadow instead of repeating its individual parts.
 *
 * @param {string} content Exported Sass map.
 * @returns {string} Sass map with complete shadow references.
 */
function compactShadowReferences(content) {
  return content.replace(/var\(--(shadow-[\w-]+)-x\)\s+var\(--\1-y\)\s+var\(--\1-blur\)\s+var\(--\1-spread\)\s+var\(--shadow-color\)/g, 'var(--$1)');
}

/**
 * Update an imported scale without replacing the other global design values.
 *
 * @param {string} content Global tokens file.
 * @param {string} name Sass map name.
 * @param {string} replacement Imported Sass map.
 * @returns {string} Updated global tokens file.
 */
function replaceTokenMap(content, name, replacement) {
  const start = content.indexOf(`$${name}: (`);

  if (start < 0) {
    return `${content.trimEnd()}\n\n${replacement}\n`;
  }

  const end = content.indexOf('\n);', start);

  if (end < 0) {
    throw new Error(`Unterminated global map: $${name}`);
  }

  return content.slice(0, start) + replacement + content.slice(end + 3);
}

/**
 * Resolve component aliases while importing, leaving final values in each map.
 *
 * @param {string} content Exported Sass map or value.
 * @param {string} family Component owning the aliases.
 * @returns {string} Sass with direct component values and shared token references.
 */
function inlineComponentValues(content, family) {
  const pattern = new RegExp(`var\\(--(${family}-[\\w-]+)\\)`, 'g');

  return content.replace(pattern, (reference, name) => {
    if (!componentValues.has(name)) {
      throw new Error(`Missing exported ${family} value: ${name}`);
    }

    return inlineComponentValues(componentValues.get(name), family);
  });
}

// Validate everything before writing. The plugin's top-level map terminator is unindented.
const outputs = Object.entries(groups).map(([family, names]) => {
  const maps = names.map((name) => {
    let content = compactShadowReferences(exportedMap(name));

    if (family === 'forms') {
      // Body typography is owned by the global role; sizes and control visuals stay local.
      content = content.replace(/^[ \t]+["'](?:font-family|font-weight|line-height|letter-spacing)["']:[^\n]*\n/gm, '');
    }

    return family === 'forms' ? content : inlineComponentValues(content, family);
  });

  if (family === 'button') {
    maps.unshift("$colors: (primary, secondary);\n$variants: (filled, outline, ghost, text);\n$icon-button-start: 'angle-left';\n$icon-button-end: 'angle-right';");
  }

  if (family === 'forms') {
    maps.unshift('$check-icon-weight: 900;');
  }


  return [`resources/scss/_4-components/${family}/_tokens.scss`, `// Imported from Figma with console/import-component-scss.mjs.\n\n${maps.join('\n')}\n`];
});

outputs.push([
  'resources/scss/_5-modules/listing/_tokens.scss',
  `// Imported from Figma with console/import-component-scss.mjs.\n/* stylelint-disable number-max-precision -- Preserve exported image aspect ratios. */\n\n${stylingMap('listing-post-parts')}\n`,
]);

const globalTokensPath = 'resources/scss/_2-themes/_tokens.scss';
let globalTokens = readFileSync(path.join(root, globalTokensPath), 'utf8');
globalTokens = replaceTokenMap(globalTokens, 'shared-values', valueMap('shared-values', /^(?:control-|border-width-|opacity-|motion-|focus-ring-width$|icon-font-family$|icon-font-weight$)/));
globalTokens = replaceTokenMap(globalTokens, 'shadows', shadowMap());
outputs.push([globalTokensPath, globalTokens]);

for (const [file, content] of outputs) {
  const functionPath = file.includes('/_2-themes/') ? '../_1-lib/functions' : '../../_1-lib/functions';
  const imports = [];

  if (file !== globalTokensPath && /\b(?:size|rem)\(/.test(content)) {
    imports.push(`@use '${functionPath}/function-size' as *;`);
  }

  if (file !== globalTokensPath && /\balpha\(/.test(content)) {
    imports.push(`@use '${functionPath}/function-color-mix' as *;`);
  }

  const formatted = await format([...imports, content].join('\n\n'), { parser: 'scss', singleQuote: true, tabWidth: 2 });
  const result = await stylelint.lint({ code: formatted, codeFilename: path.join(root, file), fix: true });

  if (result.errored) {
    throw new Error(`Invalid imported SCSS: ${file}\n${result.report}`);
  }

  writeFileSync(path.join(root, file), result.code);
}

console.log('Imported component maps with local defaults and shared theme scales.');
