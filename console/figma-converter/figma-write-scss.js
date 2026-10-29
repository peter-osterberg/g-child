const { renderScssMap, compareNatural } = require('./figma-helpers');

/**
 * @param {Record<string, Record<string, unknown>>} coreVariables
 * @returns {string}
 */
function buildCoreMaps(coreVariables) {
	return Object.keys(coreVariables)
		.sort(compareNatural)
		.map((categoryName) => renderScssMap(categoryName, coreVariables[categoryName]))
		.join('\n');
}

/**
 * @param {Record<string, Record<string, unknown>>} themeVariablesByTheme
 * @returns {string}
 */
function buildButtonVariants(themeVariablesByTheme) {
	const buttonVariantNames = new Set();

	for (const themeVariables of Object.values(themeVariablesByTheme)) {
		const keys = Object.keys(themeVariables);

		for (const key of keys) {
			const match = key.match(/^(.*?)-text$/);
			if (!match) continue;

			const variantName = match[1];

			if (/^(woo|wcag)-/.test(variantName)) {
				continue;
			}

			if (
				themeVariables[`${variantName}-text`] &&
				themeVariables[`${variantName}-hover`] &&
				themeVariables[`${variantName}-active`]
			) {
				buttonVariantNames.add(variantName);
			}
		}
	}

	return `$button-variants: (${Array.from(buttonVariantNames).sort(compareNatural).join(', ')});`;
}

/**
 * @param {{
 *   scssBaseMap?: string,
 *   scssThemeStrings?: string,
 *   scssThemes?: string,
 *   scssButtonVariants?: string,
 *   scssCoreMaps?: string,
 *   scssLineHeightMap?: string,
 *   scssFontSpaceMap?: string,
 *   scssLetterSpacingMap?: string,
 *   scssEffectMap?: string
 * }} parts
 * @returns {string}
 */
function renderScssBundle(parts) {
	return [
		parts.scssBaseMap,
		parts.scssThemeStrings,
		parts.scssThemes,
		parts.scssButtonVariants,
		parts.scssCoreMaps,
		parts.scssLineHeightMap,
		parts.scssFontSpaceMap,
		parts.scssLetterSpacingMap,
		parts.scssEffectMap,
	]
		.filter(Boolean)
		.join('\n');
}

module.exports = {
	buildCoreMaps,
	buildButtonVariants,
	renderScssBundle,
};
