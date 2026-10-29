import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.json'), 'utf8'));

for (const entry of [
	'resources/js/app.js',
	'resources/scss/app.scss',
	'resources/scss/editor.scss',
	'resources/scss/editor-admin.scss',
	'resources/fonts/fonts.css',
	'inc/Modules/Button/resources/scss/button.scss',
]) {
	assert.ok(manifest[entry], `Missing build entry: ${entry}`);
}

for (const chunk of Object.values(manifest)) {
	for (const file of [chunk.file, ...(chunk.css || []), ...(chunk.assets || [])]) {
		assert.ok(existsSync(path.join(dist, file)), `Missing emitted file: ${file}`);

		if (file.endsWith('.woff2')) {
			assert.equal(readFileSync(path.join(dist, file)).subarray(0, 4).toString(), 'wOF2', `Invalid font: ${file}`);
		}

		if (!file.endsWith('.css')) {
			continue;
		}

		const css = readFileSync(path.join(dist, file), 'utf8');
		assert.ok(!css.includes('.vite-fonts') && !css.includes(root), `Source path leaked into ${file}`);
		assert.ok(!css.includes('does-not-exist'), `Artificial specificity selector in ${file}`);
		const parsedCss = postcss.parse(css);
		const globalLayers = new Set();

		for (const node of parsedCss.nodes) {
			if (node.type === 'atrule' && node.name === 'layer' && !node.nodes) {
				for (const name of node.params.split(',')) {
					globalLayers.add(name.trim().split('.')[0]);
				}
			}
		}

		parsedCss.walkAtRules('layer', (layer) => {
			if (!globalLayers.has(layer.params.trim())) {
				return;
			}

			let parent = layer.parent;

			while (parent.type !== 'root') {
				assert.ok(
					parent.type !== 'atrule' || parent.name !== 'layer',
					`Nested global layer ${layer.params} in ${file}`,
				);
				parent = parent.parent;
			}
		});

		parsedCss.walkRules((rule) => {
			if (rule.parent.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) {
				return;
			}

			selectorParser()
				.astSync(rule.selector)
				.walkPseudos((pseudo) => {
					assert.notEqual(
						pseudo.value.toLowerCase(),
						':is',
						`WP Rocket-incompatible :is() in ${file}: ${rule.selector}`,
					);
				});
		});

		for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
			const url = match[1];

			if (/^(data:|https?:|\/\/|#)/.test(url)) {
				continue;
			}

			assert.ok(
				existsSync(path.resolve(dist, path.dirname(file), url.split(/[?#]/)[0])),
				`Broken CSS URL in ${file}: ${url}`,
			);
		}
	}

	for (const imported of [...(chunk.imports || []), ...(chunk.dynamicImports || [])]) {
		assert.ok(manifest[imported], `Missing manifest import: ${imported}`);
	}
}

const appCss = readFileSync(path.join(dist, manifest['resources/scss/app.scss'].file), 'utf8');
assert.match(appCss, /fa-.*\.woff2/, 'App icon subsets must be emitted and referenced.');
assert.ok(
	!existsSync(path.join(dist, 'runtime.js')) && !existsSync(path.join(dist, 'mix-manifest.json')),
	'Webpack output must not remain.',
);

const appJs = readFileSync(path.join(dist, manifest['resources/js/app.js'].file), 'utf8');
const isDevelopment = process.argv.includes('--development');
assert.equal(appJs.includes('debug-'), isDevelopment, 'Debug tools must load only in development builds.');
assert.equal(
	Object.keys(manifest).some((entry) => entry.includes('dev-tools/debug.js')),
	isDevelopment,
	'Development debug entry must be removed from production.',
);

console.log('Vite build, font URLs, and development isolation checks passed.');
