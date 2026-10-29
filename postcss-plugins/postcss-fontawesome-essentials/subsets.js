// subsets.js
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');
const subsetFont = require('subset-font');

/** @typedef {import('postcss').Result} Result */

/**
 * @typedef {object} GlyphFont
 * @property {Set<string>} glyphs Glyph characters that need to exist in the subset.
 * @property {string} family Resolved font-family label.
 * @property {number} weight Resolved font-weight for the subset.
 * @property {string} name Font key used when naming generated files.
 */

/**
 * @typedef {object} GenOptions
 * @property {string} [fontsRoot] Base directory where the source fonts live.
 * @property {string} [outDir] Output directory for generated subset assets.
 * @property {boolean} [scopeFilenamesByEntry] Whether filenames should be namespaced by CSS entry.
 * @property {Array<'woff'|'woff2'>} [formats] Subset formats to generate.
 * @property {(msg:string)=>void} [log] Optional logger for subset generation messages.
 */

/**
 * @typedef {object} NormalizedGenOptions
 * @property {string} fontsRoot Resolved source font directory.
 * @property {string} outDir Resolved output directory for subset assets.
 * @property {boolean} scopeFilenamesByEntry Whether filenames should be scoped by CSS entry name.
 * @property {Array<'woff'|'woff2'>} formats Output formats generated for each subset.
 * @property {((msg:string)=>void)|undefined} log Optional logger used during generation.
 */

/**
 * @typedef {object} SourceFont
 * @property {Buffer} buf Raw source font buffer.
 * @property {'ttf'|'otf'|'woff'|'woff2'} ext Source font extension.
 * @property {string} path Absolute source font path.
 */

/**
 * @typedef {object} GeneratedFile
 * @property {'woff'|'woff2'} ext Generated output format.
 * @property {Buffer} buf Generated subset font buffer.
 * @property {string} base Basename written to the output directory.
 * @property {string} abs Absolute output path for the generated file.
 */

/**
 * @typedef {object} OutputFont
 * @property {string} family Font-family value used in the emitted `@font-face`.
 * @property {number} weight Font-weight value used in the emitted `@font-face`.
 * @property {Record<string, string>} urls Format-to-URL map for emitted assets.
 */

/* ------------------------ Generic helpers ------------------------ */

/**
 * @param {Buffer|Uint8Array} buf
 * @returns {string}
 */
function md5(buf) {
	return crypto.createHash('md5').update(buf).digest('hex');
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function toPosix(filePath) {
	return String(filePath ?? '')
		.split(path.sep)
		.join('/');
}

/**
 * @param {GenOptions} options
 * @returns {NormalizedGenOptions}
 */
function normalizeOptions(options) {
	const {
		fontsRoot = './resources/lib/fonts/fontawesome',
		outDir = './.vite-fonts',
		scopeFilenamesByEntry = true,
		formats = ['woff2'],
		log,
	} = options;

	return { fontsRoot, outDir, scopeFilenamesByEntry, formats, log };
}

/**
 * @param {GlyphFont} font
 * @returns {string}
 */
function glyphTextFromFont(font) {
	return Array.from(font.glyphs).join('');
}

/**
 * @param {string} outDir
 * @param {string} fileName
 * @returns {string}
 */
function resolveOutputFile(outDir, fileName) {
	return path.resolve(outDir, fileName);
}

/**
 * @param {string} ext
 * @returns {ext is 'ttf'|'otf'|'woff'|'woff2'}
 */
function isSupportedSourceExt(ext) {
	return ext === 'ttf' || ext === 'otf' || ext === 'woff' || ext === 'woff2';
}

/* ------------------------ Source font resolution ------------------------ */

/**
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function canRead(filePath) {
	try {
		await fsp.access(filePath, fs.constants.R_OK);
		return true;
	} catch {
		return false;
	}
}

/**
 * @param {string} fontsRoot
 * @param {string} baseName
 * @returns {Promise<SourceFont|null>}
 */
async function resolveSourceFont(fontsRoot, baseName) {
	const candidateExts = ['ttf', 'otf', 'woff2', 'woff'];

	for (const ext of candidateExts) {
		const filePath = path.resolve(fontsRoot, `${baseName}.${ext}`);
		if (!(await canRead(filePath))) continue;
		if (!isSupportedSourceExt(ext)) continue;

		const buf = await fsp.readFile(filePath);
		return { buf, ext, path: filePath };
	}

	return null;
}

/* ------------------------ Subset generation ------------------------ */

/**
 * @param {SourceFont} sourceFont
 * @param {string} text
 * @param {Array<'woff'|'woff2'>} formats
 * @returns {Promise<Record<'woff'|'woff2', Buffer>>}
 */
async function buildSubsetBuffers(sourceFont, text, formats) {
	/** @type {Record<'woff'|'woff2', Buffer>} */
	const out = {};

	const tasks = [];

	if (formats.includes('woff2')) {
		tasks.push(
			subsetFont(sourceFont.buf, text, { targetFormat: 'woff2' }).then((buf) => {
				out.woff2 = buf;
			}),
		);
	}

	if (formats.includes('woff')) {
		tasks.push(
			subsetFont(sourceFont.buf, text, { targetFormat: 'woff' }).then((buf) => {
				out.woff = buf;
			}),
		);
	}

	await Promise.all(tasks);
	return out;
}

/**
 * @param {GlyphFont} font
 * @param {string} entryName
 * @param {boolean} scopeFilenamesByEntry
 * @param {Record<'woff'|'woff2', Buffer>} buffers
 * @param {string} outDir
 * @returns {GeneratedFile[]}
 */
function buildGeneratedFiles(font, entryName, scopeFilenamesByEntry, buffers, outDir) {
	const scopePrefix = scopeFilenamesByEntry ? `${entryName}-` : '';

	return Object.entries(buffers).map(([ext, buf]) => {
		const fileName = `${font.name}-${scopePrefix}opt-${md5(buf)}.${ext}`;
		return {
			ext: /** @type {'woff'|'woff2'} */ (ext),
			buf,
			base: fileName,
			abs: resolveOutputFile(outDir, fileName),
		};
	});
}

/**
 * @param {GeneratedFile[]} files
 * @returns {Promise<void>}
 */
async function writeGeneratedFiles(files) {
	await Promise.all(
		files.map(async (file) => {
			try {
				// Leave unchanged dependencies untouched, but repair interrupted writes.
				if ((await fsp.readFile(file.abs)).equals(file.buf)) {
					return;
				}
			} catch (error) {
				if (error.code !== 'ENOENT') {
					throw error;
				}
			}

			await fsp.writeFile(file.abs, file.buf);
		}),
	);
}

/* ------------------------ Result message emission ------------------------ */

/**
 * @param {Result|undefined} result
 * @param {string} sourcePath
 * @returns {void}
 */
function emitDependencyMessage(result, sourcePath) {
	if (!result || !sourcePath) return;

	result.messages.push({
		type: 'dependency',
		file: sourcePath,
	});
}

/* ------------------------ CSS generation ------------------------ */

/**
 * @param {GeneratedFile[]} files
 * @param {string} inputFile
 * @returns {Record<string, string>}
 */
function buildFontUrls(files, inputFile) {
	/** @type {Record<string, string>} */
	const urls = {};

	for (const file of files) {
		urls[file.ext] = toPosix(path.relative(path.dirname(inputFile), file.abs));
	}

	return urls;
}

/**
 * @param {OutputFont[]} outputs
 * @returns {string}
 */
function buildFontFaceCss(outputs) {
	return outputs
		.map((font) => {
			const srcs = [];

			if (font.urls.woff2) {
				srcs.push(`url("${font.urls.woff2}") format("woff2")`);
			}

			if (font.urls.woff) {
				srcs.push(`url("${font.urls.woff}") format("woff")`);
			}

			return `@font-face {
  font-family: "${font.family}";
  font-style: normal;
  font-display: swap;
  font-weight: ${font.weight};
  src: ${srcs.join(',\n       ')};
}`;
		})
		.join('\n');
}

/* ------------------------ Per-font pipeline ------------------------ */

/**
 * @param {GlyphFont} font
 * @param {NormalizedGenOptions} options
 * @param {Result|undefined} result
 * @param {string} entryName
 * @param {string} inputFile
 * @returns {Promise<OutputFont|null>}
 */
async function processFont(font, options, result, entryName, inputFile) {
	const sourceFont = await resolveSourceFont(options.fontsRoot, font.name);
	if (!sourceFont) {
		options.log?.(`[postcss-fa-essentials] Source font not found for ${font.name}`);
		return null;
	}

	const text = glyphTextFromFont(font);
	if (!text) return null;

	const buffers = await buildSubsetBuffers(sourceFont, text, options.formats);
	const files = buildGeneratedFiles(font, entryName, options.scopeFilenamesByEntry, buffers, options.outDir);

	if (files.length === 0) return null;

	await writeGeneratedFiles(files);
	emitDependencyMessage(result, sourceFont.path);

	return {
		family: font.family,
		weight: font.weight,
		urls: buildFontUrls(files, inputFile),
	};
}

/**
 * @param {GlyphFont} font
 * @param {NormalizedGenOptions} options
 * @param {Result|undefined} result
 * @param {string} entryName
 * @param {string} inputFile
 * @returns {Promise<OutputFont|null>}
 */
async function processFontSafe(font, options, result, entryName, inputFile) {
	try {
		return await processFont(font, options, result, entryName, inputFile);
	} catch (error) {
		const message = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
		options.log?.(`[postcss-fa-essentials] Subset failed for ${font.name}: ${message}`);
		return null;
	}
}

/* ------------------------ Main API ------------------------ */

/**
 * @param {Map<string, GlyphFont>} fonts
 * @param {GenOptions} options
 * @param {Result} result
 * @param {string} entryName
 * @param {string} inputFile
 * @returns {Promise<string>}
 */
async function generateSubsets(fonts, options, result, entryName, inputFile) {
	const normalized = normalizeOptions(options);

	if (!fonts || fonts.size === 0) return '';

	await fsp.mkdir(normalized.outDir, { recursive: true });

	const outputs = (
		await Promise.all(
			Array.from(fonts.values()).map((font) => processFontSafe(font, normalized, result, entryName, inputFile)),
		)
	).filter(Boolean);

	if (outputs.length === 0) return '';

	return buildFontFaceCss(/** @type {OutputFont[]} */ (outputs));
}

module.exports = { generateSubsets };
