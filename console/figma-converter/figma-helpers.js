const fs = require('fs');
const path = require('path');

/**
 * @typedef {object} FigmaVariableAliasRef
 * @property {string} [collection] Collection name that owns the aliased variable.
 * @property {string} [name] Variable name targeted by the alias reference.
 */

/**
 * @typedef {object} FigmaTypographyValue
 * @property {number|string} [lineHeight] Raw line-height value from Figma.
 * @property {string} [lineHeightUnit] Unit label used by Figma for line height.
 * @property {number|string} [letterSpacing] Raw letter-spacing value from Figma.
 */

/**
 * @typedef {string|number|boolean|null|FigmaVariableAliasRef|FigmaTypographyValue|FigmaEffectVariableValue|Record<string, unknown>|unknown[]} FigmaVariableValue
 */

/**
 * @typedef {object} FigmaVariable
 * @property {string} name Variable name as exported from Figma.
 * @property {string} [type] Optional Figma token type label.
 * @property {boolean} [isAlias] Whether this variable points to another token.
 * @property {FigmaVariableValue} [value] Token value or alias payload.
 */

/**
 * @typedef {object} FigmaMode
 * @property {string} name Mode name such as `Desktop` or `Mobile`.
 * @property {FigmaVariable[]} [variables] Variables defined for this mode.
 */

/**
 * @typedef {object} FigmaCollection
 * @property {string} name Collection name from the Figma export.
 * @property {FigmaMode[]} [modes] Mode groups available in the collection.
 */

/**
 * @typedef {object} FigmaFile
 * @property {FigmaCollection[]} [collections] Collections included in the export file.
 */

/**
 * @typedef {object} EffectColor
 * @property {number} [r] Red channel value.
 * @property {number} [g] Green channel value.
 * @property {number} [b] Blue channel value.
 * @property {number} [a] Alpha channel value.
 */

/**
 * @typedef {object} EffectOffset
 * @property {number} [x] Horizontal offset component.
 * @property {number} [y] Vertical offset component.
 */

/**
 * @typedef {object} FigmaEffect
 * @property {EffectColor} [color] Effect color payload.
 * @property {EffectOffset} [offset] Effect offset payload.
 * @property {number} [radius] Blur radius value.
 * @property {number} [spread] Spread value.
 */

/**
 * @typedef {object} FigmaEffectVariableValue
 * @property {FigmaEffect[]} [effects] List of shadow effects attached to the token.
 */

/**
 * @typedef {object} ProcessedEffect
 * @property {string} hex Hex color for the effect.
 * @property {number} alpha Alpha channel normalized between `0` and `1`.
 * @property {string} offset Rendered SCSS offset pair.
 * @property {string} radius Rendered SCSS blur radius.
 * @property {string} spread Rendered SCSS spread size.
 */

/**
 * @typedef {(entry: FigmaVariable, collectionName: string, modeName: string, visited?: Set<string>) => FigmaVariableValue|undefined} FigmaAliasResolver
 */

/**
 * @param {string} filePath
 * @returns {FigmaFile}
 */
function readJson(filePath) {
	return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {void}
 */
function writeText(filePath, content) {
	fs.writeFileSync(path.resolve(filePath), content, 'utf8');
}

/**
 * @template {Record<string, unknown>} T
 * @param {T} record
 * @returns {T}
 */
function sortObjectKeys(record) {
	return /** @type {T} */ (
		Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })))
	);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareNatural(a, b) {
	return a.length - b.length || a.localeCompare(b, 'en', { numeric: true });
}

/**
 * @param {string|number} value
 * @returns {string}
 */
function escapeScssKey(value) {
	return String(value).replace(/'/g, "\\'");
}

/**
 * @param {string|number} value
 * @returns {string}
 */
function escapeScssString(value) {
	return String(value).replace(/'/g, "\\'");
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isFiniteNumber(value) {
	return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {number} value
 * @returns {string}
 */
function renderSize(value) {
	return `size(${value})`;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {string}
 */
function renderSizePair(min, max) {
	return `size(${min}, ${max})`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function renderFs(value) {
	return `fs(${value})`;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {string}
 */
function renderFsPair(min, max) {
	return `fs(${min}, ${max})`;
}

/**
 * @param {string|unknown} value
 * @returns {string}
 */
function stripDiacritics(value) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '');
}

/**
 * Preserves "/" for category/value splitting.
 *
 * @param {string|unknown} value
 * @returns {string}
 */
function toKebabPath(value) {
	return String(value || '')
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.toLowerCase();
}

/**
 * Safer SCSS key slug.
 *
 * @param {string|unknown} value
 * @returns {string}
 */
function toScssKey(value) {
	return stripDiacritics(String(value || ''))
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9/]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/**
 * Normalizes theme keys:
 * - flattens "/" to "-"
 * - removes trailing "-default"
 *
 * @param {string} value
 * @returns {string}
 */
function toThemeKey(value) {
	return toScssKey(value)
		.replace(/\//g, '-')
		.replace(/-default$/i, '');
}

/**
 * @param {string|unknown} value
 * @returns {string}
 */
function toKebabSlug(value) {
	return stripDiacritics(value)
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/**
 * Splits a hex value into base hex + alpha.
 *
 * Supports:
 * - #rgb
 * - #rgba
 * - #rrggbb
 * - #rrggbbaa
 *
 * @param {string|unknown} value
 * @returns {{ hex: string|unknown, alpha: number }}
 */
function splitHexAlpha(value) {
	if (typeof value !== 'string') {
		return { hex: value, alpha: 1 };
	}

	const normalized = value.trim().toLowerCase();

	if (!normalized.startsWith('#')) {
		return { hex: normalized, alpha: 1 };
	}

	let hex = normalized.slice(1);

	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((char) => char + char)
			.join('');

		return { hex: `#${hex}`, alpha: 1 };
	}

	if (hex.length === 4) {
		const r = hex[0] + hex[0];
		const g = hex[1] + hex[1];
		const b = hex[2] + hex[2];
		const a = hex[3] + hex[3];

		return {
			hex: `#${r}${g}${b}`,
			alpha: parseInt(a, 16) / 255,
		};
	}

	if (hex.length === 6) {
		return { hex: `#${hex}`, alpha: 1 };
	}

	if (hex.length === 8) {
		return {
			hex: `#${hex.slice(0, 6)}`,
			alpha: parseInt(hex.slice(6, 8), 16) / 255,
		};
	}

	return { hex: normalized, alpha: 1 };
}

/**
 * Compresses #rrggbb to #rgb when possible.
 *
 * @param {string|unknown} value
 * @returns {string|unknown}
 */
function compressHex(value) {
	if (typeof value !== 'string') return value;

	const normalized = value.trim().toLowerCase();

	if (!/^#[0-9a-f]{6}$/.test(normalized)) {
		return normalized;
	}

	const [r1, r2, g1, g2, b1, b2] = [
		normalized[1],
		normalized[2],
		normalized[3],
		normalized[4],
		normalized[5],
		normalized[6],
	];

	if (r1 === r2 && g1 === g2 && b1 === b2) {
		return `#${r1}${g1}${b1}`;
	}

	return normalized;
}

/**
 * @param {string|unknown} value
 * @returns {string|unknown}
 */
function normalizeColorValue(value) {
	return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function renderScssValue(value) {
	if (typeof value === 'number') return String(value);
	if (typeof value === 'string') return value;
	return `'${escapeScssString(JSON.stringify(value))}'`;
}

/**
 * @param {string} mapName
 * @param {Record<string, unknown>} mapValue
 * @returns {string}
 */
function renderScssMap(mapName, mapValue) {
	const keys = Object.keys(mapValue).sort(compareNatural);
	const body = keys.map((key) => `\t'${escapeScssKey(key)}': ${renderScssValue(mapValue[key])},`).join('\n');

	return `$${mapName}: (\n${body}\n);`;
}

/**
 * @param {FigmaFile} figmaFile
 * @returns {Record<string, FigmaCollection>}
 */
function indexCollectionsByName(figmaFile) {
	/** @type {Record<string, FigmaCollection>} */
	const collectionsByName = Object.create(null);

	for (const collection of figmaFile.collections || []) {
		if (!collection?.name) continue;
		collectionsByName[collection.name] = collection;
	}

	return collectionsByName;
}

module.exports = {
	readJson,
	writeText,
	sortObjectKeys,
	compareNatural,
	escapeScssKey,
	escapeScssString,
	isFiniteNumber,
	renderSize,
	renderSizePair,
	renderFs,
	renderFsPair,
	stripDiacritics,
	toKebabPath,
	toScssKey,
	toThemeKey,
	toKebabSlug,
	splitHexAlpha,
	compressHex,
	normalizeColorValue,
	renderScssValue,
	renderScssMap,
	indexCollectionsByName,
};
