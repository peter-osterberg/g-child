import assert from 'node:assert/strict';
import { compile, compileString } from 'sass-embedded';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const aliases = {
  '@lib': '../resources/scss/_1-lib/',
  '@themes': '../resources/scss/_2-themes/',
  '@components': '../resources/scss/_4-components/',
};
const options = {
  importers: [{
    /**
     * @param {string} url Sass import URL.
     * @returns {URL | null} Resolved library, theme or component path.
     */
    findFileUrl(url) {
      const alias = Object.keys(aliases).find((name) => url === name || url.startsWith(`${name}/`));

      return alias ? new URL(`${aliases[alias]}${url.slice(alias.length + 1)}`, import.meta.url) : null;
    },
  }],
};

const library = postcss.parse(compileString(`
@use 'sass:meta';
@use '@lib' as lib;
@each $name in colors, themes, spacing, breakpoints, shared-values, btn-padding-y, input-icon-font {
  @if meta.global-variable-exists($name, $module: lib) {
    @error 'Design value exposed by lib: #{$name}';
  }
}
`, options).css);
library.walkDecls(() => assert.fail('Importing lib must not emit CSS declarations.'));
library.walkRules(() => assert.fail('Importing lib must not emit style rules.'));
library.walkAtRules('custom-media', () => assert.fail('Media definitions belong to the theme.'));

const components = compileString(`
@use '@components/button';
@use '@components/forms';
@use '@components/forms/indicators';
@use '@themes/tokens';
@use '@themes/shared-tokens';
@use '@themes/design-tokens';
.button { @include button.button; @include button.icon-end; }
.input { @include forms.input-leading-icon('envelope', $weight: 900); }
.indicator { background-image: indicators.image(check, #fff); }
`, options).css;
assert.match(components, /--icon: angle-right/);
assert.match(components, /--icon: envelope/);
assert.match(components, /--icon-fw: 900/);
const typographyRoot = {};
const componentCss = postcss.parse(components);
componentCss.walkRules(':root', (rule) => rule.walkDecls((decl) => { typographyRoot[decl.prop] = decl.value; }));
assert.equal(typographyRoot['--button-font-family'], 'Inter');
assert.equal(typographyRoot['--button-font-weight'], 'var(--font-weight-regular)');
assert.equal(typographyRoot['--button-line-height'], '1');
assert.equal(typographyRoot['--button-letter-spacing'], '0em');
const buttonTypography = {};
componentCss.walkRules('.button', (rule) => rule.walkDecls((decl) => { buttonTypography[decl.prop] = decl.value; }));
assert.equal(buttonTypography['font-family'], 'var(--button-font-family), sans-serif');
assert.equal(buttonTypography['font-weight'], 'var(--button-font-weight)');
assert.equal(buttonTypography['line-height'], 'var(--button-line-height)');
assert.equal(buttonTypography['letter-spacing'], 'var(--button-letter-spacing)');


for (const file of [
  '../resources/scss/_2-themes/_index.scss',
  '../inc/Modules/Button/resources/scss/button.scss',
  '../console/Commands/Modules/Counter/resources/scss/counter.scss',
  '../console/Commands/Modules/Expand/resources/scss/expand.scss',
  '../console/Commands/Dummy/resources/scss/dummy.scss',
]) {
  compile(fileURLToPath(new URL(file, import.meta.url)), options);
}

console.log('SCSS ownership passed: lib contains tools, themes own values/media, and component/scaffold imports compile.');
