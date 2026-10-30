import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileString } from 'sass-embedded';
import postcss from 'postcss';

const source = `
@use 'sass:map';
@use '../_3-base/focus';
@use '../_2-themes/icon-font-tokens';
@use 'button/classes' as buttonClasses;
@use 'card/classes' as cardClasses;
@use 'chip/classes' as chipClasses;
@use 'chip';
@use 'forms/classes' as formClasses;
@use 'forms/gravity-forms';
@use 'dropdown/classes' as dropdownClasses;
@use 'dropdown';
@use '../_5-modules/listing/filters' as listingFilters;
@use '../_5-modules/listing/pagination' as listingPagination;
@use 'button';
@use 'card';
@use 'forms';
@use 'forms/tokens' as formTokens;
.probe-button { @include button.button($color: secondary, $variant: outline, $size: sm); }
.probe-icon-only { @include button.icon-only($name: 'plus', $weight: 900); }
.probe-icon-round { @include button.icon-only($round: true); }
.probe-icon-start { @include button.icon-start('plus'); }
.probe-slide-start { @include button.icon-start('plus', $animation: slide); }
.probe-slide-end { @include button.icon-end('arrow-right', $animation: slide); }
.probe-slide-only { @include button.icon-only($animation: slide); }
.probe-icon-end { @include button.icon-end('arrow-right'); }
.probe-button-switch {
  @include button.button($variant: ghost);
  @include button.reset-appearance;
  @include button.variant(filled);
}
.probe-button-ghost { @include button.button($variant: ghost, $color: secondary); }
.probe-chip { @include chip.chip; }
.probe-chip-selected { @include chip.chip; @include chip.selected; }
.probe-option { @include dropdown.option; }
.probe-option-selected { @include dropdown.option; @include dropdown.selected; }
.probe-card { @include card.card(md); }
.probe-card-sm { @include card.card(sm); }
.probe-input { @include forms.input; }
.probe-select { @include forms.select; }
.probe-dropdown-control { @include dropdown.control; }
.probe-input-sm { @include forms.input(sm); }
.probe-input-lg { @include forms.input(lg); }
.probe-input-size-only { @include forms.size(sm); }
.probe-message { @include forms.message; }
.probe-message-error { @include forms.validation(error); }
.probe-input-icon { @include forms.input-icon; }
.probe-checkbox { @include forms.checkbox; }
.probe-radio { @include forms.radio; }
.probe-choice { @include forms.choice; }
.probe-dropdown-choice { @include dropdown.option-choice; }
.probe-dropdown-radio { @include dropdown.option-choice(formTokens.$radio); }
.probe-dropdown-custom {
  @include dropdown.option-choice(map.deep-merge(formTokens.$radio, (
    'states': ('checked': ('background': red)),
  )));
}
.probe-radio-custom {
  @include forms.choice-control(map.deep-merge(formTokens.$radio, (
    'width': 20px,
    'states': ('checked': ('background': red)),
  )));
}
`;
const css = postcss.parse(compileString(source, {
  loadPaths: ['resources/scss/_4-components'],
  importers: [{
    findFileUrl: (url) => url.startsWith('@themes/')
      ? new URL(`../resources/scss/_2-themes/${url.slice(8)}`, import.meta.url)
      : url.startsWith('@lib/')
      ? new URL(`../resources/scss/_1-lib/${url.slice(5)}`, import.meta.url)
      : null,
  }],
}).css);

// The native input list and .input share one zero-specificity base selector.
let inputSelector;
css.walkRules((rule) => {
  if (!inputSelector && rule.selector.includes('input:not([type])') && rule.selector.includes('.input')) {
    inputSelector = rule.selector;
  }
});
assert(inputSelector, 'Native inputs and .input must share their base styles.');

// Compare the ordinary declarations emitted by the public class path and composed mixins.
// Explicit selectors keep this a composition check rather than another CSS rendering engine.
/**
 * Collect declarations for the exact selectors used by a component's public API.
 *
 * @param {string[]} selectors Selectors to compose in stylesheet order.
 * @param {boolean} [includeMedia] Include declarations inside media queries.
 * @returns {Record<string, string>} Final property values.
 */
function declarations(selectors, includeMedia = true) {
  const result = new Map();

  css.walkRules((rule) => {
    if (!includeMedia && rule.parent.type === 'atrule' && rule.parent.name === 'media') {
      return;
    }

    if (!rule.selectors.some((selector) => selectors.includes(selector))) {
      return;
    }

    rule.each((node) => {
      if (node.type === 'decl') {
        result.set(node.prop, node.value);
      }
    });
  });

  return Object.fromEntries([...result].sort(([a], [b]) => a.localeCompare(b)));
}

assert.deepEqual(
  declarations([':where(.btn)', '.btn-outline', '.btn-outline.btn-secondary', '.btn-sm']),
  declarations(['.probe-button']),
);
const startIcon = declarations(['.btn-icon-start:not(.btn-custom-icon-start)::before']);
const endIcon = declarations(['.btn-icon-end:not(.btn-custom-icon-end)::after']);
assert.equal(declarations(['.probe-icon-only:not(:has(.svg-icon-only))::before'])['--icon'], 'plus');
assert.equal(declarations(['.probe-icon-only:not(:has(.svg-icon-only))::before'])['--icon-fw'], '900');
assert.equal(startIcon['--icon'], 'angle-left');
assert.equal(endIcon['--icon'], 'angle-right');
assert.equal(startIcon['font-family'], 'var(--icon-ff, var(--icon-ff-base))');
assert.equal(startIcon['font-size'], 'var(--_button-icon-size)');
assert.equal(startIcon.content, 'var(--icon, "")');
assert.equal(declarations(['.probe-icon-start:not(.btn-custom-icon-start)::before'])['--icon'], 'plus');
assert.equal(declarations(['.probe-icon-end:not(.btn-custom-icon-end)::after'])['--icon'], 'arrow-right');
for (const selector of ['.btn-icon-only', '.probe-icon-round']) {
  const icon = declarations([`${selector}:not(:has(.svg-icon-only))::before`]);
  assert.equal(icon['--icon'], 'angle-right');
  assert.equal(icon['font-size'], 'var(--_button-icon-only-font-size)');
}
for (const selector of ['.btn-square', '.btn-round']) {
  assert.equal(declarations([selector])['inline-size'], 'var(--_button-icon-only-width)');
  assert.equal(declarations([selector])['block-size'], 'var(--_button-icon-only-height)');
  assert.deepEqual(declarations([`${selector}:not(:has(.svg-icon-only))::before`]), {}, 'Shape classes must not render a glyph.');
}
assert.equal(declarations(['.btn-round'])['border-radius'], 'var(--radius-pill)');
assert.equal(declarations(['.probe-icon-round'])['border-radius'], 'var(--radius-pill)');
assert.deepEqual(declarations(['.module-listing .listing-load-more-btn:not(:has(.svg-icon-only))::before']), {}, 'Pagination geometry must not add an icon.');
assert.equal(declarations([':where(.btn)'])['--_button-icon-size'], 'var(--font-size-md)');
let selectedIconSizes = 0;
css.walkRules((rule) => {
  if (rule.selector === '.probe-button') {
    selectedIconSizes += rule.nodes.filter((node) => node.prop === '--_button-icon-size').length;
  }
});
assert.equal(selectedIconSizes, 1, 'Button compositions must emit only their selected size.');

let slideRules = 0;
css.walkRules((rule) => {
  if (!rule.selector.includes('.probe-slide-')) {
    return;
  }

  rule.walkDecls((decl) => {
    if (decl.prop !== 'translate' && decl.prop !== 'transition') {
      return;
    }

    let motionAllowed = false;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      motionAllowed ||= parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('(prefers-reduced-motion: no-preference)');
    }
    assert(motionAllowed, 'Icon movement must only run when reduced motion is not requested.');
    if (decl.prop === 'translate') {
      assert.equal(decl.value, rule.selector.includes('.probe-slide-start') ? '-50%' : '50%');
      assert(rule.selector.includes(":not(:disabled, [aria-disabled=true])"));
    }
    slideRules++;
  });
});
assert.equal(slideRules, 9, 'Each animated icon needs a transition and focus, pressed and hover movement.');
assert.throws(() => compileString("@use 'button'; .invalid { @include button.icon-end($animation: spin); }", {
  loadPaths: ['resources/scss/_4-components'],
  importers: [{ findFileUrl: (url) => url.startsWith('@themes/') ? new URL(`../resources/scss/_2-themes/${url.slice(8)}`, import.meta.url) : url.startsWith('@lib/') ? new URL(`../resources/scss/_1-lib/${url.slice(5)}`, import.meta.url) : null }],
}), /Unknown button icon animation/);

const currentPage = declarations(['.module-listing .listing-pagination .page-numbers.current']);
assert.equal(currentPage['--_button-default-background'], 'var(--primary-bg)');
assert.equal(currentPage.cursor, 'default');
css.walkRules((rule) => {
  if (rule.selector.includes('.page-numbers.current')) {
    assert(!/:hover|:active|:focus-visible|:disabled|aria-disabled/.test(rule.selector), 'Static buttons must not emit interaction selectors.');
  }
});
assert.equal(declarations(['.module-listing .listing-pagination a.page-numbers:not(.current, .dots):hover:not(:disabled, [aria-disabled=true], :active)']).background, 'var(--button-bg, var(--_button-hover-background, var(--_button-default-background)))');
css.walkRules((rule) => {
  if (rule.selector.includes('.listing-pagination') && /:hover|:active|:focus-visible/.test(rule.selector)) {
    assert(rule.selector.includes('a.page-numbers:not(.current, .dots)'), 'Pagination interactions must be limited to links that are not current.');
  }
});

const focusRule = {
  outline: 'var(--focus-ring-width) solid var(--focus-ring-color)',
  'outline-offset': 'var(--focus-ring-offset)',
};
assert.deepEqual(declarations([':where(:focus-visible)']), focusRule);
assert.deepEqual(declarations(['.gform_validation_errors:focus']), focusRule, 'Programmatic error-summary focus must remain visible.');
assert.equal(declarations(['.probe-button'])['--focus-ring-offset'], undefined, 'Buttons must inherit the global offset.');
assert.equal(declarations(['.probe-input'])['--focus-ring-offset'], undefined);
assert.equal(declarations(['.probe-input:focus'])['border-color'], 'var(--input-border, var(--focus-ring-color))');
assert.equal(declarations(['.probe-input:focus']).outline, 'none');
assert.equal(declarations(['.probe-checkbox'])['--focus-ring-offset'], 'size(0px)');
assert.equal(declarations(['.probe-option'])['--focus-ring-offset'], '-2px');
assert.equal(declarations(['.probe-chip'])['--focus-ring-offset'], '2px');
assert.equal(declarations(['.gform_button'])['--focus-ring-offset'], undefined);
css.walkDecls('outline', (decl) => {
  if (decl.value === 'none') {
    assert(decl.parent.selectors.every((selector) => selector.endsWith(':focus')), 'Only focused inputs replace the ring with a border.');
    return;
  }

  assert.equal(decl.value, focusRule.outline, 'Focus outlines must use the shared variables.');
});

const textVariant = declarations(['.btn-text']);
assert.deepEqual(
  Object.keys(textVariant).filter((name) => name.startsWith('--_button-')),
  ['--_button-default-color', '--_button-disabled-color'],
  'Text buttons only publish the colors that differ from shared defaults.',
);
assert.equal(declarations(['.probe-button-switch'])['--_button-hover-background'], 'var(--primary-bg-hover)');
assert.equal(declarations(['.probe-button-switch'])['--_button-default-background'], 'var(--primary-bg)');
assert.equal(declarations([':where(.btn)'])['box-shadow'], 'var(--button-shadow, none)');
assert.equal(declarations([':where(.btn)']).opacity, '1');
assert.equal(declarations(['.probe-button-ghost'])['--_button-hover-background'], 'var(--secondary-bg-subtle-hover)');
assert.equal(declarations(['.probe-button-ghost'])['--_button-pressed-background'], 'var(--secondary-bg-subtle-pressed)');
const paletteAliases = new Set(['bg', 'bg-hover', 'bg-pressed', 'on-color', 'on-color-hover', 'on-color-pressed', 'border', 'border-hover', 'border-pressed', 'text', 'bg-subtle-hover', 'bg-subtle-pressed'].map((role) => `--_button-${role}`));
css.walkDecls((decl) => {
  assert(!paletteAliases.has(decl.prop), `Do not emit palette aliases: ${decl.prop}`);
});

assert.deepEqual(declarations([':where(.chip)']), declarations(['.probe-chip']));
assert.deepEqual(declarations([':where(.chip)', '.chip.is-selected']), declarations(['.probe-chip-selected']));
assert.deepEqual(declarations([':where(.dropdown-option)']), declarations(['.probe-option']));
assert.deepEqual(declarations([':where(.dropdown-option)', '.dropdown-option[aria-selected=true]']), declarations(['.probe-option-selected']));
const forwardingVariables = new Set(['--_card-background', '--_card-border', '--_card-shadow', '--_card-opacity', '--_card-gap', '--_chip-background', '--_chip-color', '--_dropdown-option-background', '--_dropdown-option-color']);
css.walkDecls((decl) => {
  assert(!forwardingVariables.has(decl.prop), `Do not emit unused forwarding variables: ${decl.prop}`);
});

assert.deepEqual(declarations([':where(.card)', '.card-md']), declarations(['.probe-card']));
assert.deepEqual(declarations([inputSelector]), declarations(['.probe-input']));
const selectSelector = ':where(select:not([multiple], [size]), select:not([multiple])[size="1"])';
assert.deepEqual(declarations([inputSelector, selectSelector]), declarations(['.probe-select']));
assert.deepEqual(declarations([':where(.dropdown-control)']), declarations(['.probe-dropdown-control']));
const select = declarations(['.probe-select'], false);
assert.equal(select['background-image'], 'var(--_select-image)');
assert.equal(select['background-repeat'], 'no-repeat');
assert.equal(select['background-size'], 'var(--select-icon-size, 1em) var(--select-icon-size, 1em)');
assert(select['padding-inline-end'].includes('var(--select-icon-size, 1em)'));
assert(declarations(['.probe-select:dir(rtl)'])['background-position'].startsWith('left '));
assert.equal(declarations(['.probe-select:disabled'])['--_select-image'], 'var(--select-disabled-image)');
assert.equal(declarations(['.probe-dropdown-control[aria-expanded=true]'])['--_select-image'], 'var(--select-open-image)');
assert.deepEqual(declarations(['.probe-dropdown-control::after']), {});

assert.deepEqual(declarations(['.field-message']), declarations(['.probe-message']));
assert.deepEqual(declarations(['.field-error']), declarations(['.probe-message-error']));
assert.deepEqual(declarations(['.input-icon']), declarations(['.probe-input-icon']));
assert.deepEqual(declarations([':where(.checkbox)']), declarations(['.probe-checkbox']));
assert.deepEqual(declarations([':where(.radio)']), declarations(['.probe-radio']));
assert.deepEqual(declarations(['.choice']), declarations(['.probe-choice']));
assert.deepEqual(declarations(['.gchoice', '.ginput_container_consent']), declarations(['.probe-choice']));
assert.equal(declarations(['.probe-choice > :where(label, .field-label)']).font, 'inherit');
const choiceControlSelector = '.probe-choice > :where(input[type=checkbox], input[type=radio], .checkbox, .radio)';
assert.equal(declarations([choiceControlSelector]).font, 'inherit');
assert.equal(
  declarations([choiceControlSelector]).transform,
  'translateY(calc((1lh - var(--_choice-block-size)) / 2))',
);
assert.equal(declarations(['.probe-radio'])['block-size'], 'var(--_choice-block-size)');

const checkbox = declarations(['.probe-checkbox']);
const radio = declarations(['.probe-radio']);
assert.equal(checkbox['--_choice-border-radius'], 'var(--radius-xs)');
assert.equal(radio['--_choice-border-radius'], 'var(--radius-pill)');
assert.equal(checkbox['--_choice-icon'], undefined);
assert.equal(radio['--_choice-icon'], undefined);
assert.equal(checkbox['--_choice-indicator-visibility'], undefined);
assert.equal(declarations(['.probe-dropdown-choice'])['--_choice-image'], 'none');
assert.equal(declarations(['.probe-dropdown-radio[aria-selected=true]'])['--_choice-image'], 'var(--choice-dot-checked-image)');
for (const control of [checkbox, radio]) {
  delete control['--_choice-border-radius'];
  delete control['--_choice-icon'];
}
assert.deepEqual(checkbox, radio, 'Choice controls share their base appearance.');
for (const control of ['.probe-checkbox', '.probe-radio']) {
  const normal = declarations([control], false);
  assert.equal(normal['background-image'], 'var(--_choice-image)');
  assert.equal(normal['background-position'], 'center');
  assert.equal(normal['background-size'], '100% 100%');
  assert.equal(normal['background-origin'], 'content-box');
  assert.equal(normal['--_choice-image'], 'none');
  assert.deepEqual(declarations([`${control}::before`]), {}, 'Native choices must not generate pseudo-elements.');
}
assert.equal(declarations(['.probe-checkbox:checked'])['--_choice-image'], 'var(--choice-check-checked-image)');
assert.equal(declarations(['.probe-radio:checked'])['--_choice-image'], 'var(--choice-dot-checked-image)');
assert.equal(declarations(['.probe-checkbox:checked:disabled'])['--_choice-image'], 'var(--choice-check-disabled-image)');
assert.equal(declarations(['.probe-checkbox:disabled'])['--_choice-image'], undefined);
assert.deepEqual(declarations(['.probe-dropdown-choice::after']), {}, 'Dropdown markers must use one checkbox surface.');
assert.equal(declarations(['.probe-radio-custom'])['--_choice-inline-size'], 'var(--choice-size, 20px)');
assert.equal(declarations(['.module-listing .filter-dropdown a'])['--_choice-image'], 'none');
assert.equal(
  declarations(['.module-listing .filter-dropdown a'])['grid-template-columns'],
  'var(--_choice-inline-size) minmax(0, 1fr) auto',
);
assert.equal(
  declarations(['.module-listing .filter-dropdown [aria-selected=true] > a'])['--_choice-image'],
  'var(--choice-check-checked-image)',
);
assert.equal(
  declarations(['.module-listing .filter-dropdown [aria-selected=true] > a:hover:not(:disabled, [aria-disabled=true])'])['--_choice-background'],
  'var(--primary-bg-hover)',
);
assert.equal(declarations(['.probe-dropdown-custom[aria-selected=true]'])['--_choice-background'], 'red');
assert.equal(declarations(['.probe-dropdown-choice[aria-selected=true]'])['--_choice-image'], 'var(--choice-check-checked-image)');
assert.equal(declarations(['.probe-dropdown-choice[aria-selected=true]:disabled'])['--_choice-image'], 'var(--choice-check-disabled-image)');
assert.equal(declarations(['.probe-dropdown-choice[aria-selected=true]:focus-visible'])['--_choice-image'], 'var(--choice-check-checked-focus-image)');
assert.equal(declarations(['.probe-dropdown-choice[aria-selected=true]:hover:not(:disabled, [aria-disabled=true])'])['--_choice-image'], 'var(--choice-check-checked-hover-image)');
const dropdownIndicator = declarations(['.probe-dropdown-choice::before'], false);
assert.equal(dropdownIndicator.mask, undefined);
for (const property of ['padding', 'background', 'background-image', 'background-repeat', 'background-position', 'background-origin', 'background-size']) {
  assert.equal(dropdownIndicator[property], declarations(['.probe-checkbox'], false)[property], `Dropdown marker must use the native checkbox ${property}.`);
}
let nativeForcedColors = false;
css.walkAtRules('media', (rule) => {
  if (rule.params !== '(forced-colors: active)') {
    return;
  }

  rule.walkRules((child) => {
    if (child.selector === '.probe-checkbox') {
      nativeForcedColors ||= child.nodes.some((node) => node.prop === 'appearance' && node.value === 'auto');
    }
  });
});
assert(nativeForcedColors, 'Native choice controls must retain native appearance in forced colors.');
for (const property of ['inline-size', 'block-size', 'border', 'border-radius']) {
  assert.equal(declarations(['.probe-dropdown-choice::before'])[property], declarations(['.probe-checkbox'])[property]);
}
assert.equal(declarations(['.probe-radio-custom:checked'])['--_choice-background'], 'red');
assert.deepEqual(
  declarations([':where(.btn):disabled', ':where(.btn)[aria-disabled=true]']),
  declarations(['.probe-button:disabled', '.probe-button[aria-disabled=true]']),
);

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
const built = postcss.parse(readFileSync(`dist/${manifest['resources/scss/app.scss'].file}`, 'utf8'));
// Resolving a light-dark() token through generated variables at :root freezes
// its inherited value before a nested section can select its own color scheme.
assert(/--text-1:\s*light-dark\(/.test(built.toString()), 'Keep semantic colors as native light-dark() values.');
assert(!/--lightningcss-(?:light|dark)/.test(built.toString()), 'Do not lower section-aware colors.');

for (const selector of [':root', '[data-theme=light]', '[data-theme=dark]', '[data-theme=pink]']) {
  let setsTextColor = false;

  built.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      setsTextColor ||= rule.nodes.some((node) => node.prop === 'color' && node.value === 'var(--text-1)');
    }
  });

  assert(setsTextColor, `${selector} must apply its own text color.`);
}

const defined = new Set();
const rootValues = new Map();
built.walkRules((rule) => {
  if (rule.selector === ':root') {
    rule.walkDecls((decl) => rootValues.set(decl.prop, decl.value));
  }
});
assert(rootValues.get('--spacing-5').includes('clamp('), 'Exported spacing must pass through size().');
assert.equal(rootValues.get('--control-md-min-height'), '2.75rem', 'Minimum heights must stay fixed in rem.');
assert.equal(declarations(['.btn-md'])['--_button-border-width'], '1px');
assert.equal(declarations(['.btn-md'])['--_button-padding-block'], 'var(--spacing-3)');
for (const [size, value] of [['sm', '1.75rem'], ['md', 'var(--control-md-min-height)'], ['lg', '3.375rem']]) {
  assert.equal(declarations([`.btn-${size}`])['--_button-icon-only-width'], value);
  assert.equal(declarations([`.btn-${size}`])['--_button-icon-only-height'], value);
}
assert(!Object.keys(declarations([':where(.btn)'])).some((name) => name.startsWith('--button-')), 'The button shell must not publish its exported scale.');
assert.equal(declarations([':where(.card)'])['--_card-padding-block'], 'var(--spacing-4)');
assert.equal(declarations([':where(.card)'])['padding-block'], 'var(--card-padding-block, var(--_card-padding-block))');
assert(!Object.keys(declarations([':where(.card)'])).some((name) => name.startsWith('--card-')), 'The card shell must not publish its exported scale.');
assert.deepEqual(declarations([':where(.card)', '.card-sm']), declarations(['.probe-card-sm']));
assert.deepEqual(declarations(['.card-interactive:has(a:focus-visible)']), { 'border-color': 'var(--card-border, var(--primary-border))' });
assert.equal(declarations(['.card-interactive:has(a:hover)'])['--_card-opacity'], undefined);
css.walkRules((rule) => {
  if (rule.selector === '.probe-card-sm') {
    assert.equal(rule.nodes.filter((node) => node.prop === '--_card-padding-block').length, 1);
  }
});
assert(![...rootValues.keys()].some((name) => /^--card-/.test(name)), 'Card defaults must not leak onto :root.');
assert.deepEqual([...rootValues.keys()].filter((name) => name.startsWith('--button-')).sort(), ['--button-font-family', '--button-font-weight', '--button-letter-spacing', '--button-line-height']);
assert.equal(rootValues.get('--focus-ring-width'), '2px');
assert.equal(rootValues.get('--focus-ring-offset'), '2px');
assert(!/\b(?:size|rem|alpha)\(/.test(built.toString()), 'Sass and PostCSS must consume all theme function calls.');
built.walkDecls((decl) => {
  if (decl.prop.startsWith('--')) {
    defined.add(decl.prop);
  }
});

for (const family of ['button', 'card', 'forms']) {
  const tokens = readFileSync(`resources/scss/_4-components/${family}/_tokens.scss`, 'utf8');

  if (family !== 'forms') {
    assert(!tokens.includes(`$${family}-values`), 'Component values belong directly in the base and size maps.');
    assert(!tokens.includes(`var(--${family}-`), 'Imported component maps must contain resolved values.');
  }

  for (const [, name] of tokens.matchAll(/var\((--[\w-]+)/g)) {
    assert(defined.has(name), `Missing exported ${family} token: ${name}`);
  }
}

const input = declarations(['.probe-input']);
assert.match(input['padding-block'], /--input-padding-block/);
assert.match(input['font-family'], /--body-font-family/);
assert.equal(input['font-size'], 'var(--input-font-size, var(--_input-font-size))');
assert.equal(input['--_input-font-size'], 'var(--font-size-sm)');
assert.equal(input['--_input-min-height'], 'var(--control-md-min-height)');
for (const size of ['sm', 'lg']) {
  assert.deepEqual(
    declarations([inputSelector, `.input-${size}`]),
    declarations([`.probe-input-${size}`]),
  );
}
assert.deepEqual(declarations(['.input-sm']), declarations(['.probe-input-size-only']));
assert.equal(declarations(['.probe-input-sm'])['--_input-min-height'], 'var(--control-sm-min-height)');
assert.equal(declarations(['.probe-input-lg'])['--_input-font-size'], 'var(--font-size-md)');
assert.throws(
  () => compileString("@use 'forms'; .invalid { @include forms.input(unknown); }", {
    loadPaths: ['resources/scss/_4-components'],
  }),
  /Unknown input size: unknown/,
);
assert.equal(declarations(['.field-message'])['font-size'], 'var(--font-size-md)');
assert.equal(declarations(['.probe-input::placeholder']).color, 'var(--text-2)');
assert.equal(declarations(['.probe-input:disabled']).color, 'var(--input-color, var(--text-disabled))');
assert.equal(declarations(['.probe-input:hover:not(:disabled, [readonly], [aria-invalid=true], :focus)'])['border-color'], 'var(--input-border, var(--border-strong))');
assert(!Object.keys(declarations(['.probe-input'])).some((name) => /^--_input-(?:background|border-color|color|box-shadow|opacity)$/.test(name)), 'Input appearance must not use forwarding variables.');
assert.match(declarations(['.probe-button'])['font-size'], /--_button-font-size/);
assert.equal(declarations([':where(.card)', '.card-lg'])['--_card-padding-block'], 'var(--spacing-5)');
console.log('Component class/mixin parity, exported token references and native color-scheme checks passed.');
