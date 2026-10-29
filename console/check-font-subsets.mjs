import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import subsets from '../postcss-plugins/postcss-fontawesome-essentials/subsets.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = await mkdtemp(path.join(os.tmpdir(), 'gchild-font-subsets-'));
const fonts = new Map([
	['solid', { name: 'fa-solid-900', family: 'Font Awesome 7 Pro', weight: 900, glyphs: new Set(['\uf007']) }],
]);
const options = { fontsRoot: path.join(root, 'resources/lib/fonts/fontawesome'), outDir: directory };
const result = { messages: [] };
const input = path.join(root, 'resources/scss/app.scss');

try {
	const css = await subsets.generateSubsets(fonts, options, result, 'app', input);
	const files = await readdir(directory);
	assert.equal(files.length, 1, 'The icon subset must be generated.');
	const file = path.join(directory, files[0]);
	const originalBytes = await readFile(file);
	await utimes(file, 1, 1);
	const original = await stat(file);
	const repeated = await Promise.all([
		subsets.generateSubsets(fonts, options, result, 'app', input),
		subsets.generateSubsets(fonts, options, result, 'app', input),
	]);
	assert.ok(
		repeated.every((output) => output === css),
		'Repeated generation must keep the same CSS URL.',
	);
	assert.equal((await stat(file)).mtimeMs, original.mtimeMs, 'Unchanged subsets must not trigger watch rebuilds.');

	await writeFile(file, '');
	assert.equal(await subsets.generateSubsets(fonts, options, result, 'app', input), css);
	assert.deepEqual(await readFile(file), originalBytes, 'Interrupted font writes must be repaired.');

	fonts.get('solid').glyphs.add('\uf0c9');
	assert.notEqual(await subsets.generateSubsets(fonts, options, result, 'app', input), css);
	assert.equal((await readdir(directory)).length, 2, 'Changed glyphs must create a new hashed font.');
	assert.ok(
		result.messages.some((message) => message.type === 'dependency'),
		'Source font changes must remain watched.',
	);
	console.log('Font subset watch-loop regression checks passed.');
} finally {
	await rm(directory, { recursive: true, force: true });
}
