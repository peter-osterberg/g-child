import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import * as sass from 'sass-embedded';
import config from '../postcss.config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const plugins = config.plugins.filter((plugin) => plugin.postcssPlugin !== 'postcss-fa-essentials');
const layerPlugins = plugins.filter((plugin) => /layer/.test(plugin.postcssPlugin));

/**
 * Record declarations in source order with their selectors, layers and conditions.
 * Global names model the theme's explicit mixin rebasing contract before hoisting.
 *
 * @param {string} css
 * @param {Set<string>} globalNames
 * @returns {object[]}
 */
function declarations(css, globalNames = new Set()) {
	const records = [];

	postcss.parse(css).walkDecls((decl) => {
		const ancestors = [];
		let parent = decl.parent;

		while (parent?.type !== 'root') {
			ancestors.unshift(parent);
			parent = parent.parent;
		}

		let layer = '';
		const context = [];

		for (const ancestor of ancestors) {
			if (ancestor.type === 'atrule' && ancestor.name === 'layer') {
				const name = ancestor.params.trim();
				layer = globalNames.has(name) || !layer ? name : `${layer}.${name}`;
			} else {
				context.push(ancestor.type === 'rule' ? ancestor.selector : `@${ancestor.name} ${ancestor.params}`);
			}
		}

		records.push({ layer, context, prop: decl.prop, value: decl.value, important: !!decl.important });
	});

	return records;
}

// These used to change which declaration wins, or remove selectors/keyframes.
for (const css of [
	'.a{color:red}.b{color:blue}.b{color:red}',
	'.a{color:red}.b{color:blue}.a{color:green}',
	'@media (min-width:1px){.a{color:red}}.a{color:blue}',
	'@media (min-width:900px){.a{color:red}}@media (min-width:600px){.a{color:blue}}',
	'.a:has(.b:hover,.b:focus-visible){color:red}',
	'.a:not(:hover){color:red}',
	'.a:not(.c,.d):where(.e,.f){color:red}',
	'.a::before{color:red}.b::-webkit-file-upload-button{color:red}',
	'.a{margin-inline-start:1rem;padding-inline:2rem;inset-inline-start:0;text-align:start}',
	'.a{animation:var(--motion)}@keyframes runtime{to{opacity:1}}',
	'@keyframes other-entry{to{opacity:1}}',
]) {
	const result = await postcss(plugins).process(css, { from: undefined });
	assert.deepEqual(declarations(result.css), declarations(css), css);

	if (css.includes('@keyframes')) {
		assert.match(result.css, /@keyframes/, 'Keep animations referenced outside this CSS entry.');
	}
}

const mixedHover = await postcss(plugins).process('.a:hover,.a:focus-visible{color:red}', { from: undefined });
assert.deepEqual(
	declarations(mixedHover.css).map((decl) => decl.context),
	[['.a:focus-visible'], ['@media (hover) and (pointer: fine)', '.a:hover']],
);

const expandedHover = await postcss(plugins).process('.a:is(:hover,:focus-visible){color:red}', { from: undefined });
assert.deepEqual(declarations(expandedHover.css), declarations(mixedHover.css));

const expandedNot = await postcss(plugins).process('.a:not(:is(:disabled,.disabled)){color:red}', { from: undefined });
assert.deepEqual(declarations(expandedNot.css), declarations('.a:not(.disabled,:disabled){color:red}'));

const hoverOnly = await postcss(plugins).process('.a:is(:hover,.b:hover){color:red}', { from: undefined });
assert.equal(declarations(hoverOnly.css)[0].context[0], '@media (hover) and (pointer: fine)');

const hoverList = await postcss(plugins).process('@media (hover), (min-width:1px){.a:hover{color:red}}', {
	from: undefined,
});
assert.equal(declarations(hoverList.css)[0].context.length, 3, 'Every media-list branch must guarantee hover.');

for (const css of [
	'@layer components,modules;@layer components{.a{color:red}@layer components{.a{color:blue}}.a{color:green}}',
	'@layer components,modules;@layer components{.a{color:red}}@media(min-width:1px){@layer components{.a{color:blue}}}@layer components{.a{color:green}}',
	'@layer components,modules;@media(min-width:999px){@layer modules{@layer components{.a{color:red}}}}',
	'@layer components,modules;@layer modules{@supports(display:grid){.before{color:red}@media(min-width:1px){@layer components{.a{color:blue}}}.after{color:green}}}',
	'@layer a{@layer x{.a{color:red}}@layer y{.a{color:yellow}}@layer x{.a{color:blue}}}',
	'@layer a{@layer a{.a{color:red}}.a{color:blue}}',
	'@layer a{}@layer b{.a{color:red}}@layer a{.a{color:blue}}',
	'@layer{.a{color:red}}@layer{.a{color:blue}}',
	'@layer a{.a{color:red}}.unlayered{color:blue}@layer a{.a{color:green}}',
]) {
	const globalNames = new Set(['components', 'modules']);
	const result = await postcss(layerPlugins).process(css, { from: undefined });
	assert.deepEqual(declarations(result.css), declarations(css, globalNames), css);
	assert.equal(
		(await postcss(layerPlugins).process(result.css, { from: undefined })).css,
		result.css,
		'Layer normalization must be idempotent.',
	);
}

const emptyLayer = await postcss(layerPlugins).process('@layer a{}@layer b{.a{color:red}}', { from: undefined });
assert.match(emptyLayer.css, /^@layer a\{\}/, 'Empty named layers establish order.');

const emptyGlobalLayers = await postcss(layerPlugins).process(
	'@layer theme,base,utilities;@layer theme{@layer theme{}}@layer base{@layer theme{}}@layer utilities{@layer theme{}}',
	{ from: undefined },
);
emptyGlobalLayers.root.walkAtRules('layer', (layer) => {
	assert.equal(
		layer.parent.type,
		'root',
		'Empty global layers must not create theme.theme, base.theme or utilities.theme.',
	);
});

const sizes = await postcss(plugins).process('.a{font-size:fs(40);width:size(40)}', { from: undefined });
assert.match(sizes.css, /font-size:clamp\([^;]+rem\)/);
assert.match(sizes.css, /width:clamp\([^;]+px\)/);
await assert.rejects(postcss(plugins).process('.a{width:size(var(--size))}', { from: undefined }), /literal px\/rem/);

const aliases = {
	'@lib': 'resources/scss/_1-lib',
	'@themes': 'resources/scss/_2-themes',
	'@base': 'resources/scss/_3-base',
	'@components': 'resources/scss/_4-components',
	'@modules': 'resources/scss/_5-modules',
	'@layouts': 'resources/scss/_6-layouts',
	'@utilities': 'resources/scss/_7-utilities',
};

for (const entry of [
	'resources/scss/app.scss',
	'resources/scss/editor.scss',
	'resources/scss/editor-admin.scss',
	'inc/Modules/Button/resources/scss/button.scss',
]) {
	const { css } = await sass.compileAsync(path.join(root, entry), {
		importers: [
			{
				/**
				 * @param {string} url
				 * @returns {URL | null}
				 */
				findFileUrl(url) {
					const alias = Object.keys(aliases).find((name) => url === name || url.startsWith(`${name}/`));

					return alias ? pathToFileURL(path.join(root, aliases[alias], url.slice(alias.length))) : null;
				},
			},
		],
	});
	const globalNames = new Set();

	for (const node of postcss.parse(css).nodes) {
		if (node.type === 'atrule' && node.name === 'layer' && !node.nodes) {
			for (const name of node.params.split(',')) {
				globalNames.add(name.trim());
				globalNames.add(name.trim().split('.')[0]);
			}
		}
	}

	const result = await postcss(layerPlugins).process(css, { from: path.join(root, entry) });
	assert.deepEqual(
		declarations(result.css),
		declarations(css, globalNames),
		`Layer scope, conditions or source order changed in ${entry}`,
	);

	const processed = await postcss(plugins).process(css, { from: path.join(root, entry) });
	processed.root.walkAtRules('layer', (layer) => {
		if (!globalNames.has(layer.params.trim())) {
			return;
		}

		let parent = layer.parent;

		while (parent.type !== 'root') {
			assert.ok(
				parent.type !== 'atrule' || parent.name !== 'layer',
				`Unexpected nested global layer ${layer.params} in ${entry}`,
			);
			parent = parent.parent;
		}
	});
	assert.ok(
		!processed.css.includes(':is('),
		`Write explicit selectors, including inside :has() and :not(), in ${entry}`,
	);
	assert.ok(!processed.css.includes('does-not-exist'), `Avoid artificial specificity selectors in ${entry}`);
}

console.log('PostCSS selector, hover, animation and real-entry layer regression checks passed.');
