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
  button: ['button', 'button-sizes'],
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
    const content = exportedMap(name);

    return family === 'forms' ? content : inlineComponentValues(content, family);
  });

  if (family === 'button') {
    maps.unshift('$colors: (primary, secondary);\n$variants: (filled, outline, ghost, text);');
  }


  return [`resources/scss/_4-components/${family}/_tokens.scss`, `// Imported from Figma with console/import-component-scss.mjs.\n\n${maps.join('\n')}\n`];
});

outputs.push([
  'resources/scss/_1-lib/_shared-values.scss',
  `// Imported shared scales from Figma.\n${valueMap('shared-values', /^(?:control-|shadow-|border-width-|opacity-|motion-|focus-ring-width$|icon-font-family$|icon-font-weight$)/)}\n`,
]);

for (const [file, content] of outputs) {
  const functionPath = file.includes('/_4-components/') ? '../../_1-lib/functions' : './functions';
  const imports = [];

  if (/\b(?:size|rem)\(/.test(content)) {
    imports.push(`@use '${functionPath}/function-size' as *;`);
  }

  if (/\balpha\(/.test(content)) {
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
