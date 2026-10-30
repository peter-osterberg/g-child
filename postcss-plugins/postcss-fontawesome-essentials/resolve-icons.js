// resolve-icons.js
const fs = require('fs');
const path = require('path');

/** @typedef {import('postcss').Declaration} Decl */
/** @typedef {import('postcss').Root} Root */
/** @typedef {import('postcss').Rule} Rule */

/* ---------------- Icon mapping (cached per path) ---------------- */

/** @type {Map<string, Record<string, string>>} */
const ICON_MAPPING_CACHE = new Map();

/**
 * @param {unknown} value
 * @returns {string}
 */
function toTrimmedString(value) {
	return String(value ?? '').trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function stripQuotes(value) {
	return toTrimmedString(value).replace(/^['"]|['"]$/g, '');
}

/**
 * Parses:
 * - var(--x)
 * - var(--x, fallback)
 * - literal values
 *
 * @param {unknown} value
 * @returns {{ varName: string | null, fallback: string, hasFallback: boolean }}
 */
function parseVarFunction(value) {
	const input = toTrimmedString(value);

	const withFallback = input.match(/^var\(\s*(--[a-z0-9-_]+)\s*,\s*(.+)\)$/i);
	if (withFallback) {
		return {
			varName: withFallback[1],
			fallback: withFallback[2].trim(),
			hasFallback: true,
		};
	}

	const withoutFallback = input.match(/^var\(\s*(--[a-z0-9-_]+)\s*\)$/i);
	if (withoutFallback) {
		return {
			varName: withoutFallback[1],
			fallback: '',
			hasFallback: false,
		};
	}

	return {
		varName: null,
		fallback: input,
		hasFallback: false,
	};
}

/**
 * Parse FA SCSS variables file into a map.
 * Lines typically look like: $var-arrow-right: "\\f061";
 *
 * @param {string} scssVarsPath
 * @returns {Record<string, string>}
 */
function loadIconMapping(scssVarsPath) {
	const abs = path.resolve(scssVarsPath);
	const cached = ICON_MAPPING_CACHE.get(abs);
	if (cached) return cached;

	const src = fs.readFileSync(abs, 'utf8');
	/** @type {Record<string, string>} */
	const mapping = {};

	const noBlockComments = src.replace(/\/\*[\s\S]*?\*\//g, '');

	for (const line of noBlockComments.split(/\r?\n/)) {
		const clean = line.replace(/\/\/.*$/, '').trim();
		if (!clean) continue;

		const match = clean.match(/^\$var-([a-z0-9-]+)\s*:\s*["']?(\\[0-9a-f]{1,6})["']?\s*;$/i);
		if (!match) continue;

		const [, name, glyph] = match;
		mapping[name] = glyph;
	}

	ICON_MAPPING_CACHE.set(abs, mapping);
	return mapping;
}

/* ------------------------ Root var collection ------------------------ */

/**
 * Collect custom properties from :root in the current CSS AST.
 * If tokens are defined in a separate file, ensure it is included in the same PostCSS build.
 *
 * @param {Root} root
 * @returns {Map<string, string>}
 */
function collectRootCustomProps(root) {
	const out = new Map();

	if (!root) return out;

	root.walkRules((rule) => {
		if (!rule.selector) return;

		const selectors = rule.selector.split(',').map((s) => s.trim());
		if (!selectors.includes(':root')) return;

		rule.walkDecls(/^--/, (decl) => {
			out.set(decl.prop.trim(), toTrimmedString(decl.value));
		});
	});

	return out;
}

/**
 * @param {Map<string, string>} rootVars
 * @returns {{
 *   familyVarToFamilyName: Record<string, string>,
 *   weightVarToNumber: Record<string, number>
 * }}
 */
function buildFontVarMapsFromRoot(rootVars) {
	/** @type {Record<string, string>} */
	const familyVarToFamilyName = {};
	/** @type {Record<string, number>} */
	const weightVarToNumber = {};

	const familyVars = [
		'--icon-fa-pro',
		'--icon-fa-brands',
		'--icon-fa-duotone',
		'--icon-fa-sharp',
		'--icon-fa-sharp-duotone',
		'--icon-ff-base',
	];

	for (const key of familyVars) {
		const value = rootVars.get(key);
		if (!value) continue;
		familyVarToFamilyName[key] = stripQuotes(value);
	}

	const weightVars = ['--icon-thin', '--icon-light', '--icon-regular', '--icon-solid', '--icon-fw-base'];

	for (const key of weightVars) {
		const value = rootVars.get(key);
		if (!value) continue;

		const n = Number.parseInt(stripQuotes(value), 10);
		if (Number.isFinite(n)) weightVarToNumber[key] = n;
	}

	return { familyVarToFamilyName, weightVarToNumber };
}

/* ------------------------ Utils ------------------------ */

/**
 * @param {string} name
 * @returns {string}
 */
function cleanFontFamily(name) {
	const parsed = parseVarFunction(name);
	return stripQuotes(parsed.fallback)
		.replace(/\\/g, '')
		.split(',')[0]
		.trim();
}

/**
 * Resolve font-family value to a concrete FA family label when possible.
 *
 * @param {string} rawFamily
 * @param {Record<string, string>} familyVarToFamilyName
 * @returns {string}
 */
function resolveFamilyValue(rawFamily, familyVarToFamilyName) {
	const parsed = parseVarFunction(rawFamily);

	if (parsed.varName && familyVarToFamilyName[parsed.varName]) {
		return familyVarToFamilyName[parsed.varName];
	}

	const literal = cleanFontFamily(parsed.fallback);

	if (familyVarToFamilyName[literal]) {
		return familyVarToFamilyName[literal];
	}

	return literal || familyVarToFamilyName['--icon-ff-base'] || 'Font Awesome 7 Pro';
}

/**
 * Resolve font-weight value to a number when possible.
 *
 * @param {string} rawWeight
 * @param {Record<string, number>} weightVarToNumber
 * @returns {number}
 */
function resolveWeightValue(rawWeight, weightVarToNumber) {
	const parsed = parseVarFunction(rawWeight);

	if (parsed.varName && weightVarToNumber[parsed.varName] != null) {
		return weightVarToNumber[parsed.varName];
	}

	const literal = stripQuotes(parsed.fallback);

	if (weightVarToNumber[literal] != null) {
		return weightVarToNumber[literal];
	}

	const n = Number.parseInt(literal, 10);
	return Number.isFinite(n) ? n : (weightVarToNumber['--icon-fw-base'] || 400);
}

/**
 * Returns normalized hex string without leading backslash.
 *
 * @param {string} glyph
 * @returns {string}
 */
function parseGlyphHex(glyph) {
	const raw = stripQuotes(glyph).replace(/^\\+/, '\\');
	const match = raw.match(/^\\([0-9a-f]{1,6})$/i);
	if (!match) return '';

	const hex = match[1].toLowerCase();
	const codePoint = Number.parseInt(hex, 16);

	return codePoint >= 0 && codePoint <= 0x10ffff ? hex : '';
}

/**
 * Convert icon name to unicode escape.
 * Handles -duo suffix for secondary layer.
 *
 * @param {string} name
 * @param {Record<string, string>} iconMapping
 * @returns {string | undefined}
 */
function iconNameToUnicode(name, iconMapping) {
	let normalized = String(name ?? '').replace(/"/g, '');
	let duo = false;

	if (normalized.endsWith('-duo')) {
		duo = true;
		normalized = normalized.slice(0, -4);
	}

	const unicode = iconMapping[normalized];
	if (!unicode) return undefined;

	return duo ? `\\10${unicode.replace(/\\/g, '')}` : unicode;
}

/* ---- Family+weight → key (table-driven) ---- */

/**
 * @typedef {object} FamilyRange
 * @property {number} min Inclusive lower font-weight bound.
 * @property {number} max Inclusive upper font-weight bound.
 * @property {string} key Font Awesome font key used for subsetting.
 */

/** @type {Readonly<Record<string, FamilyRange[]>>} */
const FAMILY_TABLE = Object.freeze({
	'Font Awesome 7 Pro': Object.freeze([
		{ min: 100, max: 200, key: 'fa-thin-100' },
		{ min: 300, max: 300, key: 'fa-light-300' },
		{ min: 400, max: 500, key: 'fa-regular-400' },
		{ min: 600, max: 900, key: 'fa-solid-900' },
	]),
	'Font Awesome 7 Brands': Object.freeze([{ min: 0, max: 1000, key: 'fa-brands-400' }]),
	'Font Awesome 7 Duotone': Object.freeze([
		{ min: 100, max: 200, key: 'fa-duotone-thin-100' },
		{ min: 300, max: 300, key: 'fa-duotone-light-300' },
		{ min: 400, max: 500, key: 'fa-duotone-regular-400' },
		{ min: 600, max: 900, key: 'fa-duotone-900' },
	]),
	'Font Awesome 7 Sharp': Object.freeze([
		{ min: 100, max: 200, key: 'fa-sharp-thin-100' },
		{ min: 300, max: 300, key: 'fa-sharp-light-300' },
		{ min: 400, max: 500, key: 'fa-sharp-regular-400' },
		{ min: 600, max: 900, key: 'fa-sharp-solid-900' },
	]),
	'Font Awesome 7 Sharp Duotone': Object.freeze([
		{ min: 100, max: 200, key: 'fa-sharp-duotone-thin-100' },
		{ min: 300, max: 300, key: 'fa-sharp-duotone-light-300' },
		{ min: 400, max: 500, key: 'fa-sharp-duotone-regular-400' },
		{ min: 600, max: 900, key: 'fa-sharp-duotone-solid-900' },
	]),
});

/**
 * @param {string} family
 * @param {number} weight
 * @returns {string | null}
 */
function inferFontKey(family, weight) {
	const rows = FAMILY_TABLE[family];
	if (!rows) return null;

	for (const row of rows) {
		if (weight >= row.min && weight <= row.max) return row.key;
	}

	return null;
}

/* ---------------- Glyph collection ---------------- */

/**
 * @typedef GlyphFont
 * @property {Set<string>} glyphs Glyph characters collected for the font file.
 * @property {string} family Resolved font-family label.
 * @property {number} weight Resolved font-weight for the font file.
 * @property {string} name Internal font key used for subset naming.
 */

/**
 * @param {Map<string, GlyphFont>} fonts
 * @param {string} fontKey
 * @param {string} fontFamily
 * @param {number} fontWeight
 * @param {string} glyph
 */
function addGlyph(fonts, fontKey, fontFamily, fontWeight, glyph) {
	const hex = parseGlyphHex(glyph);
	if (!hex) return;

	let entry = fonts.get(fontKey);
	if (!entry) {
		entry = {
			glyphs: new Set(),
			family: fontFamily,
			weight: fontWeight,
			name: fontKey,
		};
		fonts.set(fontKey, entry);
	}

	const codePoint = Number.parseInt(hex, 16);
	if (!Number.isFinite(codePoint)) return;

	entry.glyphs.add(String.fromCodePoint(codePoint));

	const isDuotoneFamily = fontFamily === 'Font Awesome 7 Duotone' || fontFamily === 'Font Awesome 7 Sharp Duotone';
	if (!isDuotoneFamily) return;

	// Auto-pair duotone primary/secondary for subsetting.
	if (hex.startsWith('10')) {
		const primaryHex = hex.slice(2);
		const primaryCodePoint = Number.parseInt(primaryHex, 16);
		if (Number.isFinite(primaryCodePoint) && primaryCodePoint <= 0x10ffff) {
			entry.glyphs.add(String.fromCodePoint(primaryCodePoint));
		}
		return;
	}

	const secondaryHex = `10${hex}`;
	const secondaryCodePoint = Number.parseInt(secondaryHex, 16);
	if (Number.isFinite(secondaryCodePoint) && secondaryCodePoint <= 0x10ffff) {
		entry.glyphs.add(String.fromCodePoint(secondaryCodePoint));
	}
}

/**
 * @param {unknown} node
 * @returns {node is Rule}
 */
function isRuleNode(node) {
	return !!node && node.type === 'rule' && Array.isArray(node.nodes);
}

/**
 * Create an icon resolver that mutates declarations and fills `fonts`.
 *
 * @param {{
 *   scssVariablesPath: string,
 *   root: Root,
 *   logger?: (msg: string) => void
 * }} cfg
 * @returns {{ fonts: Map<string, GlyphFont>, processIconDecl: (decl: Decl) => void }}
 */
function createIconResolver(cfg) {
	const { scssVariablesPath, root, logger } = cfg;
	const log = typeof logger === 'function' ? logger : undefined;

	const iconMapping = loadIconMapping(scssVariablesPath);

	const rootVars = collectRootCustomProps(root);
	const { familyVarToFamilyName, weightVarToNumber } = buildFontVarMapsFromRoot(rootVars);

	/** @type {Map<string, GlyphFont>} */
	const fonts = new Map();

	/** @type {WeakSet<Decl>} */
	const processedDecls = new WeakSet();

	/**
	 * Resolve FA family+weight for a declaration from its own rule only.
	 *
	 * Supports:
	 * - --icon-ff
	 * - --icon-fw
	 * - font-family / font-weight
	 *
	 * @param {Decl} decl
	 * @returns {{ family: string, weight: number, fontKey: string | null }}
	 */
	function resolveFamilyAndWeight(decl) {
		const rule = decl.parent;

		if (!isRuleNode(rule)) {
			const family = familyVarToFamilyName['--icon-ff-base'] || 'Font Awesome 7 Pro';
			const weight = weightVarToNumber['--icon-fw-base'] || 400;
			return { family, weight, fontKey: inferFontKey(family, weight) };
		}

		/** @type {Decl | null} */
		let familyDecl = null;
		/** @type {Decl | null} */
		let weightDecl = null;

		for (const node of rule.nodes) {
			if (node.type !== 'decl') continue;

			if (node.prop === '--icon-ff') {
				familyDecl = node;
			} else if (node.prop === '--icon-fw') {
				weightDecl = node;
			} else if (node.prop === 'font-family') {
				familyDecl ||= node;
			} else if (node.prop === 'font-weight') {
				weightDecl ||= node;
			}
		}

		const rawFamily = familyDecl?.value?.trim() || 'var(--icon-ff-base)';
		const rawWeight = weightDecl?.value?.trim() || 'var(--icon-fw-base)';

		const family = resolveFamilyValue(rawFamily, familyVarToFamilyName);
		const weight = resolveWeightValue(rawWeight, weightVarToNumber);

		return { family, weight, fontKey: inferFontKey(family, weight) };
	}

	/**
	 * Convert icon declaration value -> unicode, mutate node, record glyphs.
	 *
	 * @param {Decl} decl
	 * @returns {void}
	 */
	function processIconDecl(decl) {
		if (!decl?.value || processedDecls.has(decl)) return;

		const { family, weight, fontKey } = resolveFamilyAndWeight(decl);
		if (!/font awesome/i.test(family)) return;

		const original = toTrimmedString(decl.value);
		const iconValue = decl.prop === 'content' ? original.replace(/\s*\/\s*(?:""|'')$/, '') : original;
		const parsed = parseVarFunction(iconValue);

		if (parsed.varName && !parsed.hasFallback) {
			log?.(`[postcss-fa-essentials] Skipping unresolvable icon var(): ${original} (no static fallback)`);
			return;
		}

		const raw = stripQuotes(parsed.fallback);

		// Shared icon mixins emit `content: var(--icon, '')` so missing icons resolve
		// to empty content in CSS. That empty fallback is not an icon name and should
		// not produce a build warning.
		if (decl.prop === 'content' && parsed.varName && raw === '') {
			return;
		}

		// Already a unicode escape.
		if (raw.startsWith('\\')) {
			if (fontKey) addGlyph(fonts, fontKey, family, weight, raw);
			return;
		}

		const unicode = iconNameToUnicode(raw, iconMapping);
		if (unicode == null) {
			log?.(`[postcss-fa-essentials] Unknown icon name "${raw}" (from value "${original}") for "${family}"`);
			return;
		}

		decl.value = `"${unicode}"${iconValue === original ? '' : ' / ""'}`;
		processedDecls.add(decl);

		if (fontKey) {
			addGlyph(fonts, fontKey, family, weight, unicode);
			return;
		}

		log?.(
			`[postcss-fa-essentials] Icon "${raw}" resolved but no font key for family="${family}", weight=${weight}; not tracked for subsetting.`,
		);
	}

	return { fonts, processIconDecl };
}

module.exports = {
	createIconResolver,
	__clearIconCache: () => ICON_MAPPING_CACHE.clear(),
};
