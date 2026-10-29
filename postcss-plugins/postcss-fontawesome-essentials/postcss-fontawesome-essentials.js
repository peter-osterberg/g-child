// postcss-fa-essentials.js
const postcss = require('postcss');
const path = require('path');

const { createIconResolver } = require('./resolve-icons');
const { generateSubsets } = require('./subsets');

/** @typedef {import('postcss').Declaration} Decl */
/** @typedef {import('postcss').Root} Root */
/** @typedef {import('postcss').Result} Result */

/**
 * @typedef PluginOptions
 * @property {string} [scssVariablesPath] Path to the Font Awesome SCSS variable source.
 * @property {boolean} [generateSubsets] Whether font subsets should be emitted for used glyphs.
 * @property {string} [fontsRoot] Base directory where source Font Awesome files live.
 * @property {string} [outDir] Output directory for generated subset assets.
 * @property {boolean} [scopeFilenamesByEntry] Whether subset filenames should be namespaced by entry file.
 * @property {Array<'woff'|'woff2'>} [formats] Font formats to generate for each subset.
 * @property {(msg: string) => void} [logger] Optional logger for build-time diagnostics.
 */

/* ------------------------ Generic helpers ------------------------ */

/**
 * @param {unknown} value
 * @returns {string}
 */
function toTrimmedString(value) {
	return String(value ?? '').trim();
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isQuoted(value) {
	return /^['"].*['"]$/.test(toTrimmedString(value));
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function looksLikeVar(value) {
	return /^var\(/i.test(toTrimmedString(value));
}

/**
 * @param {Root} root
 * @param {Result} result
 * @returns {string}
 */
function getInputFile(root, result) {
	return root?.source?.input?.file || result?.opts?.from || '';
}

/**
 * @param {string} file
 * @returns {string}
 */
function entryNameFrom(file) {
	if (!file) return 'styles';
	const { name } = path.parse(file);
	return name || 'styles';
}

/* ---------------- Font-family var normalization ---------------- */

/**
 * Returns true when the first family in the value should be quoted.
 *
 * Examples:
 * - Font Awesome 7 Pro => true
 * - "Font Awesome 7 Pro" => false
 * - var(--icon-fa-pro) => false
 * - Arial, sans-serif => false
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function needsFontFamilyQuotes(value) {
	const input = toTrimmedString(value);
	if (!input) return false;
	if (isQuoted(input)) return false;
	if (looksLikeVar(input)) return false;

	const first = input.split(',')[0].trim();
	return /\s/.test(first);
}

/**
 * Quotes only the first family in a comma-separated font-family value.
 *
 * Example:
 * - Font Awesome 7 Pro, sans-serif
 *   -> "Font Awesome 7 Pro", sans-serif
 *
 * @param {unknown} value
 * @returns {string}
 */
function quoteFirstFontFamily(value) {
	const input = toTrimmedString(value);
	const parts = input.split(',');
	const first = (parts.shift() || '').trim();
	const quotedFirst = `"${first.replace(/"/g, '\\"')}"`;

	if (parts.length === 0) return quotedFirst;

	const rest = parts.join(',').trim();
	return rest ? `${quotedFirst}, ${rest}` : quotedFirst;
}

/* ------------------------ Declaration routing ------------------------ */

const ICON_SOURCE_PROPS = new Set(['--icon']);
const FONT_FAMILY_CONTEXT_PROPS = new Set(['--icon-ff']);
const IGNORED_CONTEXT_PROPS = new Set(['--icon-fw']);

const RE_LOOKS_ICON_NAME = /^"[a-z0-9-]+(?:-duo)?"$/i;
const RE_HAS_UNICODE_ESCAPE = /^["']?.*\\[0-9a-fA-F]{1,6}.*["']?$/;
const RE_HAS_ICON_VAR = /var\(\s*--icon\b/i;

/**
 * @param {Decl} decl
 * @returns {boolean}
 */
/**
 * @param {Decl} decl
 * @returns {boolean}
 */
function shouldProcessContentDecl(decl) {
	if (decl.prop !== 'content') return false;

	const parent = decl.parent;
	if (!parent || parent.type !== 'rule') return false;

	const selector = toTrimmedString(parent.selector);
	if (!selector) return false;

	// Only process pseudo-element content rules.
	if (!/::?(before|after)\b/i.test(selector)) return false;

	const value = toTrimmedString(decl.value);
	if (!value) return false;

	return RE_LOOKS_ICON_NAME.test(value) || RE_HAS_UNICODE_ESCAPE.test(value) || RE_HAS_ICON_VAR.test(value);
}

/**
 * @param {Decl} decl
 * @param {ReturnType<typeof createIconResolver> | null} resolver
 * @returns {void}
 */
function handleDeclaration(decl, resolver) {
	const { prop } = decl;

	if (ICON_SOURCE_PROPS.has(prop)) {
		resolver?.processIconDecl(decl);
		return;
	}

	if (FONT_FAMILY_CONTEXT_PROPS.has(prop)) {
		if (needsFontFamilyQuotes(decl.value)) {
			decl.value = quoteFirstFontFamily(decl.value);
		}
		return;
	}

	if (IGNORED_CONTEXT_PROPS.has(prop)) {
		return;
	}

	if (shouldProcessContentDecl(decl)) {
		resolver?.processIconDecl(decl);
	}
}

/* ------------------------ Options ------------------------ */

/**
 * @param {PluginOptions} options
 * @returns {{
 *   scssVariablesPath: string,
 *   doSubset: boolean,
 *   fontsRoot: string | undefined,
 *   outDir: string,
 *   scopeFilenamesByEntry: boolean,
 *   formats: Array<'woff'|'woff2'>,
 *   log: ((msg: string) => void) | undefined,
 * }}
 */
function normalizeOptions(options) {
	const {
		scssVariablesPath = './resources/lib/fonts/fontawesome/_variables.scss',
		generateSubsets: doSubset = true,
		fontsRoot,
		outDir = './.vite-fonts',
		scopeFilenamesByEntry = true,
		formats = ['woff2', 'woff'],
		logger,
	} = options;

	return {
		scssVariablesPath,
		doSubset,
		fontsRoot,
		outDir,
		scopeFilenamesByEntry,
		formats,
		log: typeof logger === 'function' ? logger : undefined,
	};
}

/* ------------------------ Plugin ------------------------ */

/**
 * @param {PluginOptions} [options]
 * @returns {import('postcss').Plugin}
 */
module.exports = function faPostcss(options = {}) {
	const normalized = normalizeOptions(options);

	/** @type {ReturnType<typeof createIconResolver> | null} */
	let resolver = null;

	return {
		postcssPlugin: 'postcss-fa-essentials',

		/**
		 * @param {Root} root
		 */
		Once(root) {
			resolver = createIconResolver({
				scssVariablesPath: normalized.scssVariablesPath,
				logger: normalized.log,
				root,
			});
		},

		/**
		 * @param {Decl} decl
		 */
		Declaration(decl) {
			handleDeclaration(decl, resolver);
		},

		/**
		 * @param {Root} root
		 * @param {{ result: Result }} param1
		 * @returns {Promise<void>}
		 */
		async OnceExit(root, { result }) {
			if (!normalized.doSubset || !resolver) return;

			const fonts = resolver.fonts;
			if (!fonts || fonts.size === 0) return;

			const inputFile = getInputFile(root, result);
			const entryName = entryNameFrom(inputFile);

			const cssToPrepend = await generateSubsets(
				fonts,
				{
					fontsRoot: normalized.fontsRoot,
					outDir: normalized.outDir,
					scopeFilenamesByEntry: normalized.scopeFilenamesByEntry,
					formats: normalized.formats,
					log: normalized.log,
				},
				result,
				entryName,
				inputFile,
			);

			if (cssToPrepend && cssToPrepend.trim()) {
				root.prepend(postcss.parse(cssToPrepend, { from: inputFile }));
			}
		},
	};
};

module.exports.postcss = true;
