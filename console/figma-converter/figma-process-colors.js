const {
	toKebabPath,
	toScssKey,
	toThemeKey,
	splitHexAlpha,
	compressHex,
	normalizeColorValue,
	sortObjectKeys,
	escapeScssKey,
	compareNatural,
} = require('./figma-helpers');

const BASE_COLOR_COLLECTION_NAMES = ['Base colors', 'Core Colors'];

const PALETTE_FAMILY_OVERRIDES = Object.freeze({
	neutral: 'gray',
	grey: 'gray',
	success: 'green',
	error: 'red',
	warning: 'orange',
});

const CANONICAL_COLOR_FAMILIES = new Set([
	'gray',
	'blue',
	'green',
	'orange',
	'red',
	'indigo',
	'pink',
	'purple',
	'violet',
	'fuchsia',
	'rose',
	'yellow',
	'lime',
	'teal',
	'cyan',
	'black',
	'white',
]);

const NEAREST_BASE_COLOR_MAX_DISTANCE = 20 / 255;

/**
 * @param {string} rawName
 * @returns {string}
 */
function normalizeThemeVariableName(rawName) {
	const path = toScssKey(rawName);
	const segments = path.split('/').filter(Boolean);

	if (!segments.length) {
		return toThemeKey(rawName);
	}

	const joined = segments.join('/');

	if (/^text\/\d+$/.test(joined)) {
		return segments[1] === '4' ? 'text-inverse' : `text-${segments[1]}`;
	}

	if (segments[0] === 'background' && segments[1]) {
		return `background-${segments[1]}`;
	}

	if (joined === 'focus/ring') {
		return 'focus-ring';
	}

	if (joined === 'visited/default-fg') {
		return 'link-visited';
	}

	if (joined === 'visited/hover-fg') {
		return 'link-visited-hover';
	}

	if (joined === 'visited/pressed-fg') {
		return 'link-visited-active';
	}

	if (segments[0] === 'form' && segments[1]) {
		switch (segments[1]) {
			case 'bg-default':
				return 'form-bg';

			case 'bg-hover':
				return 'form-bg-hover';

			case 'bg-active':
				return 'form-bg-active';

			case 'bg-error':
				return 'form-bg-error';

			case 'border-default':
				return 'form-border';

			case 'border-hover':
				return 'form-border-hover';

			case 'border-active':
				return 'form-border-active';

			case 'border-error':
				return 'form-border-error';

			case 'fg-input':
				return 'form-text';

			case 'fg-label':
				return 'form-label';

			case 'fg-icon':
				return 'form-icon';

			case 'fg-placeholder':
				return 'form-placeholder';

			case 'bg-message-default':
				return 'form-message-bg';

			case 'fg-message-default':
				return 'form-message-text';

			case 'bg-message-error':
				return 'form-message-error-bg';

			case 'fg-message-error':
				return 'form-message-error-text';
		}
	}

	if (segments.length >= 2) {
		const suffix = segments[segments.length - 1];
		const base = segments.slice(0, -1).join('-');

		switch (suffix) {
			case 'default':
				return base;

			case 'hover':
				return `${base}-hover`;

			case 'pressed':
				return `${base}-active`;

			case 'foreground':
				return `${base}-text`;

			case 'active-default':
				return `${base}-active`;

			case 'active-hover':
				return `${base}-active-hover`;

			case 'active-foreground':
				return `${base}-active-text`;
		}
	}

	if (segments.length === 2) {
		const [base, detail] = segments;

		switch (detail) {
			case 'bg-default':
				return base;

			case 'bg-hover':
				return `${base}-hover`;

			case 'bg-pressed':
				return `${base}-active`;

			case 'border-default':
				return `${base}-border`;

			case 'border-hover':
				return `${base}-border-hover`;

			case 'border-pressed':
				return `${base}-border-active`;

			case 'fg-default':
				return base;

			case 'fg-hover':
				return `${base}-hover`;

			case 'fg-pressed':
				return `${base}-active`;

			case 'foreground':
				return `${base}-text`;
		}
	}

	return toThemeKey(rawName)
		.replace(/-pressed$/i, '-active')
		.replace(/-foreground$/i, '-text');
}

/**
 * @param {string} rawName
 * @returns {{ key: string, sourceFamily: string, shade: string|null }|null}
 */
function parseBasePaletteToken(rawName) {
	const normalized = toThemeKey(rawName);

	if (!normalized) {
		return null;
	}

	if (normalized === 'white' || normalized === 'black') {
		return {
			key: normalized,
			sourceFamily: normalized,
			shade: null,
		};
	}

	const match = normalized.match(/^(.*)-(\d{1,3})$/);

	if (!match) {
		return {
			key: normalized,
			sourceFamily: normalized,
			shade: null,
		};
	}

	return {
		key: normalized,
		sourceFamily: match[1],
		shade: match[2],
	};
}

/**
 * @param {string} sourceFamily
 * @param {string|null} representativeHex
 * @returns {string}
 */
function resolveCanonicalPaletteFamily(sourceFamily, representativeHex) {
	const normalizedFamily = toThemeKey(sourceFamily);

	if (PALETTE_FAMILY_OVERRIDES[normalizedFamily]) {
		return PALETTE_FAMILY_OVERRIDES[normalizedFamily];
	}

	if (CANONICAL_COLOR_FAMILIES.has(normalizedFamily)) {
		return normalizedFamily;
	}

	if (representativeHex) {
		const rgb = hexToRgb01(representativeHex);

		if (rgb) {
			const { h, s } = rgbToHsl(rgb);
			return classifyHue(h, s);
		}
	}

	return normalizedFamily;
}

/**
 * @param {Array<{ shade: string, hex: string }>} items
 * @returns {string|null}
 */
function pickRepresentativeFamilyHex(items) {
	if (!items.length) {
		return null;
	}

	const exact500 = items.find((item) => item.shade === '500');
	if (exact500) {
		return exact500.hex;
	}

	const nearestTo500 = [...items].sort(
		(a, b) => Math.abs(Number(a.shade) - 500) - Math.abs(Number(b.shade) - 500),
	)[0];

	return nearestTo500?.hex || items[0].hex || null;
}

/**
 * @param {import('./figma-helpers').FigmaVariable[]} baseVariables
 * @returns {Map<string, string>}
 */
function buildPaletteFamilyLookup(baseVariables) {
	/** @type {Map<string, Array<{ shade: string, hex: string }>>} */
	const variablesByFamily = new Map();

	for (const variable of baseVariables || []) {
		const parsed = parseBasePaletteToken(variable?.name || '');

		if (!parsed?.shade || parsed.sourceFamily === 'shadow') {
			continue;
		}

		const { hex, alpha } = splitHexAlpha(variable.value);
		const compressedHex = compressHex(hex);
		const normalizedHex = normalizeHex(compressedHex);

		if (alpha < 1 || typeof normalizedHex !== 'string') {
			continue;
		}

		const items = variablesByFamily.get(parsed.sourceFamily) || [];
		items.push({ shade: parsed.shade, hex: compressedHex });
		variablesByFamily.set(parsed.sourceFamily, items);
	}

	const familyLookup = new Map();
	const usedCanonicalFamilies = new Set();

	for (const sourceFamily of Array.from(variablesByFamily.keys()).sort(compareNatural)) {
		const representativeHex = pickRepresentativeFamilyHex(variablesByFamily.get(sourceFamily) || []);
		let canonicalFamily = resolveCanonicalPaletteFamily(sourceFamily, representativeHex);

		if (usedCanonicalFamilies.has(canonicalFamily) && canonicalFamily !== sourceFamily) {
			canonicalFamily = sourceFamily;
		}

		familyLookup.set(sourceFamily, canonicalFamily);
		usedCanonicalFamilies.add(canonicalFamily);
	}

	return familyLookup;
}

/**
 * @param {string} rawName
 * @param {Map<string, string>} familyLookup
 * @returns {string|null}
 */
function normalizeBasePaletteKey(rawName, familyLookup) {
	const parsed = parseBasePaletteToken(rawName);

	if (!parsed) {
		return null;
	}

	if (!parsed.shade) {
		return parsed.key;
	}

	const canonicalFamily = familyLookup.get(parsed.sourceFamily) || parsed.sourceFamily;

	return `${canonicalFamily}-${parsed.shade}`;
}

/**
 * @param {import('./figma-helpers').FigmaCollection} colorCollection
 * @param {import('./figma-helpers').FigmaAliasResolver} resolveAliasValue
 * @returns {Record<string, Record<string, string|unknown>>}
 */
function processColorVariables(colorCollection, resolveAliasValue) {
	const themesByName = Object.create(null);

	for (const mode of colorCollection?.modes || []) {
		const themeName = toKebabPath(mode.name);
		const themeVariables = (themesByName[themeName] ||= Object.create(null));

		for (const entry of mode.variables || []) {
			const resolvedValue = entry.isAlias ? resolveAliasValue(entry, colorCollection.name, mode.name) : entry.value;
			const value = resolvedValue ?? entry.value;
			const key = normalizeThemeVariableName(entry.name);

			themeVariables[key] = value;
		}
	}

	return themesByName;
}

/**
 * @param {unknown} value
 * @returns {string|unknown}
 */
function normalizeHex(value) {
	const { hex } = splitHexAlpha(value);
	return normalizeColorValue(compressHex(hex));
}

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
function hexToRgb01(hex) {
	if (typeof hex !== 'string') return null;

	let normalized = hex.trim().toLowerCase();
	if (!normalized.startsWith('#')) return null;

	normalized = normalized.slice(1);

	if (normalized.length === 3) {
		normalized = normalized
			.split('')
			.map((char) => char + char)
			.join('');
	}

	if (normalized.length !== 6) return null;

	const r = parseInt(normalized.slice(0, 2), 16) / 255;
	const g = parseInt(normalized.slice(2, 4), 16) / 255;
	const b = parseInt(normalized.slice(4, 6), 16) / 255;

	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;

	return { r, g, b };
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {{ h: number, s: number, l: number }}
 */
function rgbToHsl({ r, g, b }) {
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;

	if (delta !== 0) {
		if (max === r) h = ((g - b) / delta) % 6;
		else if (max === g) h = (b - r) / delta + 2;
		else h = (r - g) / delta + 4;
	}

	h = Math.round(h * 60);

	if (h < 0) h += 360;

	const l = (max + min) / 2;
	const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

	return { h, s, l };
}

/**
 * @param {{ r: number, g: number, b: number }} left
 * @param {{ r: number, g: number, b: number }} right
 * @returns {number}
 */
function getRgbDistance(left, right) {
	const deltaR = left.r - right.r;
	const deltaG = left.g - right.g;
	const deltaB = left.b - right.b;

	return Math.sqrt(deltaR ** 2 + deltaG ** 2 + deltaB ** 2);
}

/**
 * @param {string} baseKey
 * @returns {string}
 */
function getPaletteFamilyFromKey(baseKey) {
	const match = String(baseKey).match(/^(.*?)-\d{1,3}$/);

	return match ? match[1] : String(baseKey);
}

/**
 * Better-separated hue bands around red / rose / pink / fuchsia.
 *
 * @param {number} hue
 * @param {number} saturation
 * @returns {string}
 */
function classifyHue(hue, saturation) {
	if (saturation < 0.12) return 'gray';

	if (hue >= 350 || hue <= 12) return 'red';
	if (hue <= 28) return 'orange';
	if (hue <= 65) return 'yellow';
	if (hue <= 95) return 'lime';
	if (hue <= 155) return 'green';
	if (hue <= 178) return 'teal';
	if (hue <= 200) return 'cyan';
	if (hue <= 248) return 'blue';
	if (hue <= 270) return 'indigo';
	if (hue <= 290) return 'violet';
	if (hue <= 315) return 'purple';
	if (hue <= 334) return 'fuchsia';
	if (hue <= 348) return 'pink';

	return 'rose';
}

/**
 * @param {import('./figma-helpers').FigmaFile} figmaFile
 * @param {Record<string, Record<string, unknown>>} themeVariablesByTheme
 * @param {Record<string, import('./figma-helpers').ProcessedEffect[]>} effectVariablesByTheme
 * @returns {{
 *   baseColorsObject: Record<string, string>,
 *   colorToBaseKey: Map<string, string>,
 *   scssBaseMap: string
 * }}
 */
function buildBaseColorArtifacts(figmaFile, themeVariablesByTheme, effectVariablesByTheme) {
	const baseCollection = (figmaFile.collections || []).find((collection) =>
		BASE_COLOR_COLLECTION_NAMES.includes(collection?.name || ''),
	);
	const baseMode = baseCollection?.modes?.[0];
	const paletteFamilyLookup = buildPaletteFamilyLookup(baseMode?.variables || []);

	/** @type {Record<string, string>} */
	const baseColorsObject = {};
	const usedBaseKeys = new Set();
	const colorToBaseKey = new Map();
	const baseColorHexByKey = new Map();

	/** @type {Map<string, string>} */
	const unresolvedColorsByNormalizedHex = new Map();

	/**
	 * @param {string} key
	 * @param {string} hex
	 * @returns {void}
	 */
	function registerBaseColor(key, hex) {
		const normalizedKey = toThemeKey(key);
		const normalizedHex = normalizeHex(hex);

		if (typeof normalizedHex !== 'string') return;
		if (usedBaseKeys.has(normalizedKey)) return;

		baseColorsObject[normalizedKey] = hex;
		usedBaseKeys.add(normalizedKey);
		baseColorHexByKey.set(normalizedKey, hex);
		colorToBaseKey.set(normalizedHex, normalizedKey);
		unresolvedColorsByNormalizedHex.delete(normalizedHex);
	}

	/**
	 * @param {string} hex
	 * @returns {string|null}
	 */
	function findNearestBaseColorKey(hex) {
		const targetRgb = hexToRgb01(hex);

		if (!targetRgb) {
			return null;
		}

		const targetHsl = rgbToHsl(targetRgb);
		const targetFamily = classifyHue(targetHsl.h, targetHsl.s);

		let nearestKey = null;
		let nearestDistance = Infinity;

		for (const [baseKey, baseHex] of baseColorHexByKey.entries()) {
			if (getPaletteFamilyFromKey(baseKey) !== targetFamily) {
				continue;
			}

			const baseRgb = hexToRgb01(baseHex);

			if (!baseRgb) {
				continue;
			}

			const distance = getRgbDistance(targetRgb, baseRgb);

			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestKey = baseKey;
			}
		}

		return nearestDistance <= NEAREST_BASE_COLOR_MAX_DISTANCE ? nearestKey : null;
	}

	/**
	 * @param {unknown} rawValue
	 * @returns {void}
	 */
	function collectUnknownColor(rawValue) {
		const { hex } = splitHexAlpha(rawValue);
		const compressedHex = compressHex(hex);
		const normalizedHex = normalizeHex(compressedHex);

		if (typeof normalizedHex !== 'string') return;
		if (colorToBaseKey.has(normalizedHex)) return;

		unresolvedColorsByNormalizedHex.set(normalizedHex, compressedHex);
	}

	if (baseMode?.variables) {
		for (const variable of baseMode.variables) {
			if (!variable?.name) continue;

			const { hex, alpha } = splitHexAlpha(variable.value);
			const compressedHex = compressHex(hex);
			const normalizedHex = normalizeHex(compressedHex);
			const normalizedKey = normalizeBasePaletteKey(variable.name, paletteFamilyLookup);

			if (alpha < 1 || typeof normalizedHex !== 'string' || !normalizedKey) continue;

			registerBaseColor(normalizedKey, compressedHex);
		}
	}

	if (!baseColorsObject.black) registerBaseColor('black', '#000');
	if (!baseColorsObject.white) registerBaseColor('white', '#fff');

	for (const themeVariables of Object.values(themeVariablesByTheme)) {
		for (const rawValue of Object.values(themeVariables)) {
			collectUnknownColor(rawValue);
		}
	}

	for (const effectVariables of Object.values(effectVariablesByTheme)) {
		for (const effectItem of effectVariables || []) {
			collectUnknownColor(effectItem.hex);
		}
	}

	(function resolveUnmatchedColors() {
		if (!unresolvedColorsByNormalizedHex.size) return;

		if (baseMode?.variables?.length) {
			for (const [normalizedColor, hex] of unresolvedColorsByNormalizedHex.entries()) {
				const nearestBaseKey = findNearestBaseColorKey(hex);

				if (nearestBaseKey) {
					colorToBaseKey.set(normalizedColor, nearestBaseKey);
				}
			}

			return;
		}

		/** @type {Map<string, { normalizedColor: string, hex: string, lightnessPercent: number }[]>} */
		const colorsByHueName = new Map();

		for (const [normalizedColor, hex] of unresolvedColorsByNormalizedHex.entries()) {
			const lowerHex = String(hex).toLowerCase();
			if (lowerHex === '#000' || lowerHex === '#000000' || lowerHex === '#fff' || lowerHex === '#ffffff') {
				continue;
			}

			const rgb = hexToRgb01(hex);
			if (!rgb) continue;

			const { h, s, l } = rgbToHsl(rgb);
			const hueName = classifyHue(h, s);
			const lightnessPercent = l * 100;

			const items = colorsByHueName.get(hueName) || [];
			items.push({ normalizedColor, hex, lightnessPercent });
			colorsByHueName.set(hueName, items);
		}

		const shadeSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

		for (const [hueName, items] of colorsByHueName.entries()) {
			items.sort((a, b) => b.lightnessPercent - a.lightnessPercent);

			for (let index = 0; index < items.length; index++) {
				const item = items[index];
				const shade =
					items.length === 1 ? 500 : shadeSteps[Math.round((index / (items.length - 1)) * (shadeSteps.length - 1))];

				let baseKey = `${hueName}-${shade}`;

				if (usedBaseKeys.has(baseKey)) {
					for (const shadeStep of shadeSteps) {
						const candidateKey = `${hueName}-${shadeStep}`;
						if (!usedBaseKeys.has(candidateKey)) {
							baseKey = candidateKey;
							break;
						}
					}
				}

				let uniqueKey = baseKey;
				let suffix = 2;

				while (usedBaseKeys.has(uniqueKey)) {
					uniqueKey = `${baseKey}-${suffix++}`;
				}

				registerBaseColor(uniqueKey, item.hex);
			}
		}
	})();

	const sortedBaseColors = sortObjectKeys(baseColorsObject);
	const body = Object.keys(sortedBaseColors)
		.map((key) => `\t'${escapeScssKey(key)}': ${sortedBaseColors[key]},`)
		.join('\n');

	return {
		baseColorsObject,
		colorToBaseKey,
		scssBaseMap: `$colors: (\n${body}\n);`,
	};
}

/**
 * @param {Record<string, Record<string, unknown>>} themeVariablesByTheme
 * @param {Map<string, string>} colorToBaseKey
 * @returns {{
 *   scssThemeStrings: string,
 *   scssThemes: string
 * }}
 */
function buildThemeArtifacts(themeVariablesByTheme, colorToBaseKey) {
	const mainThemeName = 'main';

	/**
	 * @param {string} themeName
	 * @returns {{ key: string, value: string }[]}
	 */
	function computeThemeEntries(themeName) {
		const themeVariables = sortObjectKeys(themeVariablesByTheme[themeName] || {});
		/** @type {{ key: string, value: string }[]} */
		const entries = [];

		for (const key of Object.keys(themeVariables)) {
			const rawValue = themeVariables[key];

			const { hex: baseHex, alpha } = splitHexAlpha(rawValue);
			const compressedHex = compressHex(baseHex);
			const normalizedHex = normalizeHex(baseHex);
			const baseKey = colorToBaseKey.get(normalizedHex);

			let value;

			if (alpha <= 0) {
				value = 'transparent';
			} else if (alpha < 1) {
				const alphaPercent = Math.round(alpha * 1000) / 10;
				value = baseKey
					? `alpha(var(--${escapeScssKey(baseKey)}), ${alphaPercent}%)`
					: `alpha(${compressedHex}, ${alphaPercent}%)`;
			} else if (baseKey) {
				value = `var(--${escapeScssKey(baseKey)})`;
			} else {
				value = String(compressedHex);
			}

			entries.push({ key, value });
		}

		entries.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
		return entries;
	}

	const themeNames = Object.keys(themeVariablesByTheme).sort(compareNatural);
	const mainThemeEntries = new Map();

	if (themeNames.includes(mainThemeName)) {
		for (const entry of computeThemeEntries(mainThemeName)) {
			mainThemeEntries.set(entry.key, entry.value);
		}
	}

	const scssThemeStrings = themeNames
		.map((themeName) => {
			const entries = computeThemeEntries(themeName);
			const filteredEntries =
				themeName === mainThemeName
					? entries
					: entries.filter(({ key, value }) => {
							const mainValue = mainThemeEntries.get(key);
							return mainValue === undefined || mainValue !== value;
						});

			const lines = filteredEntries.map(({ key, value }) => `\t'${escapeScssKey(key)}': ${value},`).join('\n');

			const scssThemeName = themeName === mainThemeName ? 'light' : themeName;

			return `$theme-${scssThemeName}: (\n${lines}\n);`;
		})
		.join('\n');

	const scssThemes = (() => {
		const sortedThemeNames = Object.keys(themeVariablesByTheme).sort((a, b) =>
			a.localeCompare(b, 'en', { numeric: true }),
		);

		const body = sortedThemeNames
			.map((themeName) => {
				const scssThemeName = themeName === mainThemeName ? 'light' : themeName;
				return `\t'${escapeScssKey(scssThemeName)}': $theme-${scssThemeName},`;
			})
			.join('\n');

		return `$themes: (\n${body}\n);`;
	})();

	return { scssThemeStrings, scssThemes };
}

module.exports = {
	processColorVariables,
	normalizeHex,
	buildBaseColorArtifacts,
	buildThemeArtifacts,
};
