const path = require('path');

const { readJson, writeText, renderScssMap, indexCollectionsByName } = require('./figma-helpers');

const { createAliasResolver } = require('./figma-resolve-aliases');
const { processCoreVariables, buildFontSpaceMap } = require('./figma-process-core');
const { processColorVariables, buildBaseColorArtifacts, buildThemeArtifacts } = require('./figma-process-colors');
const { processTypographyVariables, buildLineHeightMap, buildLetterSpacingMap } = require('./figma-process-typography');
const { processEffectVariables, buildEffectMap } = require('./figma-process-effects');
const { buildCoreMaps, buildButtonVariants, renderScssBundle } = require('./figma-write-scss');

const defaultOptions = Object.freeze({
	inputPath: path.resolve(__dirname, '../../resources/lib/figma/variables.json'),
	outputPath: path.resolve(__dirname, '../../resources/lib/figma/figma-output.scss'),
	useDesktopMobileDualSize: false,
	desktopModeName: 'Desktop',
	mobileModeName: 'Mobile',
});

/**
 * @param {import('./figma-helpers').FigmaFile} figmaFile
 * @param {{
 *   useDesktopMobileDualSize?: boolean,
 *   desktopModeName?: string,
 *   mobileModeName?: string
 * }} [options]
 * @returns {string}
 */
function buildScssFromFigma(figmaFile, options = {}) {
	const opts = {
		...defaultOptions,
		...options,
	};

	const collectionsByName = indexCollectionsByName(figmaFile);
	const { resolveAliasValue } = createAliasResolver(figmaFile);

	const coreCollection = collectionsByName.Core;
	const colorCollection = collectionsByName.Color;
	const typographyCollection = collectionsByName.Typography;
	const effectsCollection = collectionsByName.Effects;

	const coreVariables = coreCollection
		? processCoreVariables(coreCollection, resolveAliasValue, {
				desktopModeName: opts.desktopModeName,
				mobileModeName: opts.mobileModeName,
				useDesktopMobileDualSize: opts.useDesktopMobileDualSize,
			})
		: {};

	const themeVariables = colorCollection ? processColorVariables(colorCollection, resolveAliasValue) : {};
	const typographyVariables = typographyCollection
		? processTypographyVariables(typographyCollection, resolveAliasValue)
		: {};
	const effectVariables = effectsCollection ? processEffectVariables(effectsCollection, resolveAliasValue) : {};

	const { colorToBaseKey, scssBaseMap } = buildBaseColorArtifacts(figmaFile, themeVariables, effectVariables);
	const { scssThemeStrings, scssThemes } = buildThemeArtifacts(themeVariables, colorToBaseKey);

	const scssCoreMaps = buildCoreMaps(coreVariables);
	const scssLineHeightMap = buildLineHeightMap(typographyVariables);
	const scssLetterSpacingMap = buildLetterSpacingMap(typographyVariables);

	const fontSpaceMap = coreCollection
		? buildFontSpaceMap(coreCollection, opts.desktopModeName, opts.mobileModeName)
		: {};

	const scssFontSpaceMap = Object.keys(fontSpaceMap).length ? renderScssMap('font-space', fontSpaceMap) : '';
	const scssEffectMap = buildEffectMap(effectVariables, colorToBaseKey);
	const scssButtonVariants = buildButtonVariants(themeVariables);

	return renderScssBundle({
		scssBaseMap,
		scssThemeStrings,
		scssThemes,
		scssButtonVariants,
		scssCoreMaps,
		scssLineHeightMap,
		scssFontSpaceMap,
		scssLetterSpacingMap,
		scssEffectMap,
	});
}

/**
 * @param {{
 *   inputPath?: string,
 *   outputPath?: string,
 *   useDesktopMobileDualSize?: boolean,
 *   desktopModeName?: string,
 *   mobileModeName?: string
 * }} [options]
 * @returns {void}
 */
function main(options = {}) {
	const opts = {
		...defaultOptions,
		...options,
	};

	/** @type {import('./figma-helpers').FigmaFile} */
	const figmaFile = readJson(opts.inputPath);
	const scss = buildScssFromFigma(figmaFile, opts);

	writeText(opts.outputPath, scss);
	console.log(`SCSS file has been saved to ${opts.outputPath}`);
}

if (require.main === module) {
	main();
}

module.exports = {
	buildScssFromFigma,
	main,
};
