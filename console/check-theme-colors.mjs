import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileString } from 'sass-embedded';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = `
@use '@lib/functions/function-color-mix' as *;
@use '@lib/functions/function-size' as *;
$colors: ('neutral-50': #fafafa, 'neutral-950': #101010, 'red-100': #ffe0e0, 'red-950': #400);
$theme-colors: (
  'text-1': light-dark(var(--neutral-950), var(--neutral-50)),
  'text-2': light-dark(var(--neutral-950), var(--neutral-50)),
  'border': light-dark(var(--neutral-50), var(--neutral-950)),
  'primary-bg': var(--neutral-950),
  'primary-on-color': light-dark(var(--neutral-50), var(--neutral-950)),
  'primary-on-color-hover': var(--primary-on-color),
  'text-disabled': light-dark(var(--neutral-950), var(--neutral-50)),
  'primary-subtle': alpha(var(--primary-bg), var(--opacity-subtle)),
);
$themes: (
  'light': ('bg-canvas': var(--neutral-50), 'color-scheme': light),
  'dark': ('bg-canvas': var(--neutral-950), 'color-scheme': dark),
  'pink': ('bg-canvas': var(--red-100), 'color-scheme': light, 'text-1': var(--red-950), 'text-2': var(--red-950), 'border': var(--red-100), 'primary-bg': var(--red-950), 'primary-on-color': var(--red-950)),
);
.probe-functions {
  min-height: rem(44px);
  color: alpha(var(--primary-bg), 0.08);
  background: alpha(var(--primary-bg), 8%);
  border-color: alpha(var(--primary-bg), var(--opacity-subtle));
}
`;

/**
 * Compile the real theme implementation against a controlled export contract.
 *
 * @param {string} tokens Sass maps exported by Figma.
 * @returns {import('postcss').Root} Compiled theme rules.
 */
function compile(tokens) {
  return postcss.parse(compileString('@use "_2-themes/colors";', {
    loadPaths: [`${root}resources/scss`],
    importers: [{
      canonicalize: (url) => url === '@themes/tokens' ? new URL('fixture:tokens') : null,
      load: () => ({ contents: tokens, syntax: 'scss' }),
    }, {
      findFileUrl: (url) => url.startsWith('@lib/')
        ? pathToFileURL(`${root}resources/scss/_1-lib/${url.slice(5)}.scss`)
        : null,
    }],
  }).css);
}

const css = compile(fixture);
/**
 * Collect the declarations for a theme boundary, including its canvas rule.
 *
 * @param {string} selector Theme or canvas selector.
 * @returns {Record<string, string>} Declarations at that boundary.
 */
function declarations(selector) {
  const values = {};

  css.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
    }
  });

  return values;
}

// Variants share the base selector group; their own rule contains only differences.
let sharesLight = false;
const overrides = {};
css.walkRules((rule) => {
  if (!rule.selectors.includes('[data-theme=pink]')) {
    return;
  }

  if (rule.selectors.includes('[data-theme=light]')) {
    sharesLight = true;
  } else {
    rule.walkDecls((decl) => { overrides[decl.prop] = decl.value; });
  }
});
assert(sharesLight, 'Pink must be included in the existing Light base rule.');
assert.equal(overrides['--text-1'], 'var(--red-950)');
assert.equal(overrides['--text-disabled'], undefined);
assert.equal(overrides['--primary-subtle'], undefined);
assert.equal(overrides['color-scheme'], 'light');
assert.equal(overrides['--choice-check-disabled-image'], undefined);
assert.equal(overrides['--select-disabled-image'], undefined);
assert(overrides['--select-image'], 'Changed SVG colors must remain local overrides.');

const unchanged = compile(fixture.replace(/'pink': \('bg-canvas': var\(--red-100\), 'color-scheme': light, [^\n]+/, "'pink': ('bg-canvas': var(--red-100), 'color-scheme': light),"));
unchanged.walkRules((rule) => {
  if (rule.selectors.includes('[data-theme=pink]') && !rule.selectors.includes('[data-theme=light]')) {
    assert.deepEqual(rule.nodes.filter((node) => node.type === 'decl').map((node) => node.prop), ['--bg-canvas', 'color-scheme']);
  }
});

const pink = declarations('.bg-canvas-pink');
assert.equal(pink['color-scheme'], 'light');
assert.equal(pink['--text-1'], 'var(--red-950)');
assert.equal(pink['--border'], 'var(--red-100)');
assert.equal(pink['--primary-bg'], 'var(--red-950)');
assert.equal(pink['--primary-subtle'], 'color-mix(in oklch, var(--primary-bg) calc(var(--opacity-subtle) * 100%), transparent)');
assert.equal(pink['--bg-canvas'], 'var(--red-100)');
assert.equal(pink['background-color'], 'var(--bg-color)');

// These declarations replace inherited Pink values on any nested Light/Dark boundary.
for (const selector of ['.bg-canvas', '.bg-canvas-dark']) {
  const values = declarations(selector);
  assert.equal(values['--text-1'], 'light-dark(var(--neutral-950), var(--neutral-50))');
  assert.equal(values['--primary-bg'], 'var(--neutral-950)');
  assert.equal(values['--primary-subtle'], pink['--primary-subtle']);
}
assert.equal(declarations('.bg-canvas-dark')['color-scheme'], 'dark');
assert.equal(declarations('.bg-canvas')['--bg-canvas'], 'var(--neutral-50)');
assert.equal(declarations('[data-theme=pink]')['--bg-canvas'], 'var(--red-100)');
assert.equal(declarations(':root')['--bg-canvas-pink'], 'var(--red-100)');
for (const [selector, color] of [['.bg-canvas', '#fafafa'], ['.bg-canvas-dark', '#101010'], ['.bg-canvas-pink', '#400']]) {
  const values = declarations(selector);

  for (const shape of ['check', 'dot']) {
    const image = decodeURIComponent(values[`--choice-${shape}-checked-image`]);
    assert(image.includes(`fill='${color}'`), `${selector} needs its own resolved SVG fill.`);
    assert(!image.includes('var(') && !image.includes('light-dark('));
    assert.equal(values[`--choice-${shape}-checked-hover-image`], values[`--choice-${shape}-checked-image`]);
  }
}
for (const [selector, color] of [['.bg-canvas', '#101010'], ['.bg-canvas-dark', '#fafafa'], ['.bg-canvas-pink', '#400']]) {
  const values = declarations(selector);
  assert(decodeURIComponent(values['--select-image']).includes(`fill='${color}'`));
  assert(decodeURIComponent(values['--select-open-image']).includes(`fill='${color}'`));
  assert.notEqual(values['--select-image'], values['--select-open-image']);
  assert(decodeURIComponent(values['--select-disabled-image']).includes('fill='));
}
const functions = declarations('.probe-functions');
assert.equal(functions['min-height'], '2.75rem');
assert.equal(functions.color, 'color-mix(in oklch, var(--primary-bg) 8%, transparent)');
assert.equal(functions.background, functions.color);
assert.equal(functions['border-color'], pink['--primary-subtle']);
assert.throws(() => compile(fixture.replace("'bg-canvas': var(--red-100), ", '')), /needs bg-canvas/);
assert.throws(() => compile(fixture.replace("'color-scheme': light, 'text-1'", "'color-scheme': invalid, 'text-1'")), /needs a light or dark color-scheme/);
assert.throws(() => compile(fixture.replace("'border': var(--red-100)", "'unknown': var(--red-100)")), /Unknown theme color/);
console.log('Canvas classes, theme overrides, alias rebinding and nested theme resets passed.');
