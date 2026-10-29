const {
	isFiniteNumber,
	renderSize,
	renderSizePair,
	renderFs,
	renderFsPair,
	toKebabPath,
	escapeScssString,
} = require('./figma-helpers');

const fontWeightValueByName = new Map([
	['thin', 100],
	['hairline', 100],
	['extralight', 200],
	['ultralight', 200],
	['light', 300],
	['book', 350],
	['regular', 400],
	['normal', 400],
	['medium', 500],
	['semibold', 600],
	['semi-bold', 600],
	['bold', 700],
	['extrabold', 800],
	['ultrabold', 800],
	['black', 900],
	['heavy', 900],
]);

/**
 * Applies responsive desktop/mobile values to a token category.
 *
 * @param {Record<string, Record<string, string|number>>} output
 * @param {string} categoryName
 * @param {Record<string, Record<string, number>>} valuesByVariable
 * @param {{
 *   desktopModeName: string,
 *   mobileModeName: string,
 *   useDesktopMobileDualSize: boolean
 * }} options
 * @returns {void}
 */
function applyResponsiveModeValues(output, categoryName, valuesByVariable, options) {
	const variableNames = Object.keys(valuesByVariable);
	if (!variableNames.length) return;

	output[categoryName] ||= Object.create(null);
	const renderValue = categoryName === 'font-size' ? renderFs : renderSize;
	const renderPair = categoryName === 'font-size' ? renderFsPair : renderSizePair;

	for (const variableName of variableNames) {
		const valuesByMode = valuesByVariable[variableName] || {};
		const desktopValue = valuesByMode[options.desktopModeName];
		const mobileValue = valuesByMode[options.mobileModeName];

		if (isFiniteNumber(desktopValue) && isFiniteNumber(mobileValue)) {
			if (options.useDesktopMobileDualSize) {
				output[categoryName][variableName] =
					desktopValue === mobileValue
						? renderValue(desktopValue)
						: renderPair(Math.min(desktopValue, mobileValue), Math.max(desktopValue, mobileValue));
			} else {
				output[categoryName][variableName] = renderValue(desktopValue);
			}
		} else if (isFiniteNumber(desktopValue)) {
			output[categoryName][variableName] = renderValue(desktopValue);
		} else if (isFiniteNumber(mobileValue)) {
			output[categoryName][variableName] = renderValue(mobileValue);
		}
	}
}

/**
 * @param {import('./figma-helpers').FigmaCollection} coreCollection
 * @param {import('./figma-helpers').FigmaAliasResolver} resolveAliasValue
 * @param {{
 *   desktopModeName: string,
 *   mobileModeName: string,
 *   useDesktopMobileDualSize: boolean
 * }} options
 * @returns {Record<string, Record<string, string|number>>}
 */
function processCoreVariables(coreCollection, resolveAliasValue, options) {
	const output = Object.create(null);

	/** @type {Record<string, Record<string, number>>} */
	const spacingValuesByVariable = Object.create(null);

	/** @type {Record<string, Record<string, number>>} */
	const fontSizeValuesByVariable = Object.create(null);

	for (const mode of coreCollection?.modes || []) {
		const modeName = mode?.name || '';
		const isDesktopOrMobileMode = modeName === options.desktopModeName || modeName === options.mobileModeName;

		for (const entry of mode.variables || []) {
			const resolvedValue = entry.isAlias ? resolveAliasValue(entry, coreCollection.name, modeName) : entry.value;
			const value =
				entry.type === 'string' && typeof resolvedValue !== 'string' ? entry.value : (resolvedValue ?? entry.value);

			const [rawCategoryName = '', rawVariableName = ''] = String(entry.name).split('/');
			const categoryName = toKebabPath(rawCategoryName);
			const variableName = toKebabPath(rawVariableName);

			if (!categoryName || !variableName) continue;

			if (categoryName === 'font-space') continue;

			if (categoryName === 'spacing' && isDesktopOrMobileMode && isFiniteNumber(value)) {
				(spacingValuesByVariable[variableName] ||= Object.create(null))[modeName] = value;
				continue;
			}

			if (categoryName === 'font-size' && isDesktopOrMobileMode && isFiniteNumber(value)) {
				(fontSizeValuesByVariable[variableName] ||= Object.create(null))[modeName] = value;
				continue;
			}

			output[categoryName] ||= Object.create(null);

			const isFontWeightCategory = categoryName === 'font-weight';
			const isAliasLabel = variableName.includes('*');
			const isEdgeMarginToken = variableName.startsWith('edge-margin');

			if (entry.type === 'string' && isFontWeightCategory && !isAliasLabel) {
				const mappedValue = fontWeightValueByName.get(String(value).toLowerCase());
				output[categoryName][variableName] = isFiniteNumber(mappedValue) ? mappedValue : `'${escapeScssString(value)}'`;
			} else if (isFiniteNumber(value)) {
				if (isFontWeightCategory) {
					output[categoryName][variableName] = value;
				} else if (isEdgeMarginToken) {
					output[categoryName][variableName] = renderSizePair(16, value);
				} else if (categoryName === 'font-size') {
					output[categoryName][variableName] = renderFs(value);
				} else {
					output[categoryName][variableName] = renderSize(value);
				}
			} else if (typeof value === 'string') {
				output[categoryName][variableName] = isFontWeightCategory
					? `'${escapeScssString(value)}'`
					: `'${escapeScssString(value.toLowerCase())}'`;
			} else {
				output[categoryName][variableName] = `'${escapeScssString(JSON.stringify(value))}'`;
			}
		}
	}

	applyResponsiveModeValues(output, 'spacing', spacingValuesByVariable, options);
	applyResponsiveModeValues(output, 'font-size', fontSizeValuesByVariable, options);

	return output;
}

/**
 * Builds the font-space map from FontSpace and FontSize variables.
 *
 * @param {import('./figma-helpers').FigmaCollection} coreCollection
 * @param {string} desktopModeName
 * @param {string} mobileModeName
 * @returns {Record<string, string>}
 */
function buildFontSpaceMap(coreCollection, desktopModeName, mobileModeName) {
	/**
	 * @type {Record<string, {
	 *   spacingByMode: Record<string, number>,
	 *   spacingFallback?: number,
	 *   desktopFontSize?: number,
	 *   fontSizeFallback?: number
	  }>} */
	const valuesByKey = Object.create(null);

	for (const mode of coreCollection?.modes || []) {
		const modeName = mode?.name || '';
		const isDesktopOrMobileMode = modeName === desktopModeName || modeName === mobileModeName;

		for (const entry of mode.variables || []) {
			const [rawCategoryName = '', rawVariableName = ''] = String(entry.name).split('/');
			const categoryName = toKebabPath(rawCategoryName);
			const key = toKebabPath(rawVariableName);

			if (!key || !isFiniteNumber(entry.value)) continue;

			const bucket = (valuesByKey[key] ||= {
				spacingByMode: Object.create(null),
				spacingFallback: undefined,
				desktopFontSize: undefined,
				fontSizeFallback: undefined,
			});

			if (categoryName === 'font-space') {
				if (isDesktopOrMobileMode) {
					bucket.spacingByMode[modeName] = entry.value;
				} else if (!isFiniteNumber(bucket.spacingFallback)) {
					bucket.spacingFallback = entry.value;
				}
			}

			if (categoryName === 'font-size') {
				if (modeName === desktopModeName) {
					bucket.desktopFontSize = entry.value;
				} else if (!isFiniteNumber(bucket.fontSizeFallback)) {
					bucket.fontSizeFallback = entry.value;
				}
			}
		}
	}

	/** @type {Record<string, string>} */
	const fontSpaceMap = Object.create(null);

	for (const key of Object.keys(valuesByKey)) {
		const { spacingByMode, spacingFallback, desktopFontSize, fontSizeFallback } = valuesByKey[key];

		const desktopSpacing = spacingByMode[desktopModeName];
		const mobileSpacing = spacingByMode[mobileModeName];

		let spacingValue;
		let fontSizeValue;

		if (isFiniteNumber(desktopSpacing)) spacingValue = desktopSpacing;
		else if (isFiniteNumber(mobileSpacing)) spacingValue = mobileSpacing;
		else if (isFiniteNumber(spacingFallback)) spacingValue = spacingFallback;

		if (isFiniteNumber(desktopFontSize)) fontSizeValue = desktopFontSize;
		else if (isFiniteNumber(fontSizeFallback)) fontSizeValue = fontSizeFallback;

		if (!isFiniteNumber(spacingValue) || !isFiniteNumber(fontSizeValue)) continue;

		fontSpaceMap[key] = `em(${spacingValue}, ${fontSizeValue})`;
	}

	return fontSpaceMap;
}

module.exports = {
	processCoreVariables,
	buildFontSpaceMap,
};
