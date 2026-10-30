import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import laravel from 'laravel-vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import { resolveViteServer } from './console/vite-server.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Discover the existing module asset contract without prescribing output filenames.
 *
 * @returns {string[]}
 */
function moduleEntries() {
	const entries = [];
	const modulesDir = path.join(root, 'inc/Modules');

	for (const folder of readdirSync(modulesDir, { withFileTypes: true })) {
		if (!folder.isDirectory()) {
			continue;
		}

		const name = folder.name.replaceAll('_', '-').toLowerCase();

		for (const suffix of ['', '-backend']) {
			for (const [directory, extension] of [
				['js', 'js'],
				['scss', 'scss'],
			]) {
				const entry = `inc/Modules/${folder.name}/resources/${directory}/${name}${suffix}.${extension}`;

				if (existsSync(path.join(root, entry))) {
					entries.push(entry);
				}
			}
		}
	}

	return entries;
}

export default defineConfig(async ({ command, mode }) => {
	const env = loadEnv(mode, root, '');
	const server = command === 'serve' ? await resolveViteServer(env, root) : undefined;

	if (server?.cors?.origin) {
		process.env.APP_URL = server.cors.origin;
	}

	return {
		root,
		base: command === 'build' ? './' : '/',
		publicDir: 'public',
		plugins: [
			laravel({
				input: [
					'resources/js/app.js',
					'resources/scss/app.scss',
					'resources/scss/editor.scss',
					'resources/scss/editor-admin.scss',
					'resources/fonts/fonts.css',
					...moduleEntries(),
				],
				hotFile: path.join(root, 'vite.hot'),
				// HTTPS is terminated by the configured proxy; Vite listens over HTTP.
				detectTls: false,
				refresh: ['*.php', 'inc/**/*.php', 'page-builder/**/*.php'],
			}),
		],
		resolve: {
			alias: {
				'@': path.join(root, 'resources'),
				'@lib': path.join(root, 'resources/scss/_1-lib'),
				'@themes': path.join(root, 'resources/scss/_2-themes'),
				'@base': path.join(root, 'resources/scss/_3-base'),
				'@components': path.join(root, 'resources/scss/_4-components'),
				'@modules': path.join(root, 'resources/scss/_5-modules'),
				'@layouts': path.join(root, 'resources/scss/_6-layouts'),
				'@utilities': path.join(root, 'resources/scss/_7-utilities'),
				'@jsLib': path.join(root, 'resources/js/lib'),
			},
		},
		css: {
			lightningcss: {
				// Features.IsSelector (16): keep minification from creating :is()
				// selector lists that WP Rocket's unused-CSS parser can miss.
				// Features.LightDark (1048576): inherited semantic tokens must
				// resolve against the consuming element's native color-scheme.
				exclude: 16 | 1048576,
			},
		},
		build: {
			outDir: 'dist',
			manifest: 'manifest.json',
			sourcemap: mode === 'development',
			minify: mode !== 'development',
			assetsInlineLimit: 0,
		},
		server,
	};
});
