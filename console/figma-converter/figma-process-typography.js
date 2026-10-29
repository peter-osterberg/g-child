const { toKebabPath, isFiniteNumber, renderScssMap, compareNatural } = require('./figma-helpers');

/**
 * @param {import('./figma-helpers').FigmaCollection} typographyCollection
 * @param {import('./figma-helpers').FigmaAliasResolver} resolveAliasValue
 * @returns {Record<string, import('./figma-helpers').FigmaTypographyValue>}
 */
function processTypographyVariables(typographyCollection, resolveAliasValue) {
	const typographyValuesByStyle = Object.create(null);

	for (const mode of typographyCollection?.modes || []) {
		for (const entry of mode.variables || []) {
			const resolvedValue = entry.isAlias
				? resolveAliasValue(entry, typographyCollection.name, mode.name)
				: entry.value;

			const value = /** @type {import('./figma-helpers').FigmaTypographyValue} */ (resolvedValue ?? entry.value ?? {});
			const styleKey = toKebabPath(entry.name);

			if (!styleKey.includes('highlight')) {
				typographyValuesByStyle[styleKey] = value;
			}
		}
	}

	return typographyValuesByStyle;
}

/**
 * @param {Record<string, import('./figma-helpers').FigmaTypographyValue>} typographyVariables
 * @returns {string}
 */
function buildLineHeightMap(typographyVariables) {
	const lineHeightMap = Object.create(null);

	for (const styleKey of Object.keys(typographyVariables).sort(compareNatural)) {
		const typographyValue = typographyVariables[styleKey] || {};
		const rawLineHeight =
			typographyValue.lineHeightUnit === 'PERCENT'
				? Number(typographyValue.lineHeight) / 100
				: Number(typographyValue.lineHeight);

		lineHeightMap[styleKey] = (isFiniteNumber(rawLineHeight) ? rawLineHeight : 1).toFixed(4);
	}

	return renderScssMap('line-height', lineHeightMap);
}

/**
 * @param {Record<string, import('./figma-helpers').FigmaTypographyValue>} typographyVariables
 * @returns {string}
 */
function buildLetterSpacingMap(typographyVariables) {
	const letterSpacingMap = Object.create(null);

	for (const styleKey of Object.keys(typographyVariables).sort(compareNatural)) {
		const typographyValue = typographyVariables[styleKey] || {};
		const rawLetterSpacing = Number(typographyValue.letterSpacing);

		letterSpacingMap[styleKey] = `${(isFiniteNumber(rawLetterSpacing) ? rawLetterSpacing / 100 : 0).toFixed(4)}em`;
	}

	return renderScssMap('letter-spacing', letterSpacingMap);
}

module.exports = {
	processTypographyVariables,
	buildLineHeightMap,
	buildLetterSpacingMap,
};
