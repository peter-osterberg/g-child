const fs = require('fs');
const jsonData = require('../resources/lib/figma/variables.json');

const inputFile = jsonData;
const outputFile = './resources/lib/figma/figma-output.scss';

// Mapping for font-weight strings to numeric values
const fontWeightMapping = {
	Thin: 100,
	ExtraLight: 200,
	Light: 300,
	Regular: 400,
	Medium: 500,
	SemiBold: 600,
	Bold: 700,
	ExtraBold: 800,
	Black: 900,
};

/**
 * Processes core variables from the JSON data.
 *
 * @param {object} core - The core collection from the JSON data.
 * @returns {object} - Processed core variables.
 */
function processCoreVariables(core) {
	const coreVariables = {};
	core.modes.forEach((item) => {
		item.variables.forEach((entry) => {
			// Resolve aliases if necessary
			if (entry.isAlias) {
				const alias = item.variables.find((variable) => variable.name === entry.value.name);
				entry.value = alias.value;
			}

			const key = entry.name
				.replace(/([a-z])([A-Z])/g, '$1-$2')
				.toLowerCase()
				.replace(/\s+/g, '-');
			const [categoryName, variableName] = key.split('/');
			coreVariables[categoryName] = coreVariables[categoryName] || {};
			coreVariables[categoryName][variableName] =
				entry.type === 'string' && entry.name.startsWith('FontWeight/') ? fontWeightMapping[entry.value] : entry.value;
		});
	});
	return coreVariables;
}

/**
 * Processes color variables from the JSON data.
 *
 * @param {object} color - The color collection from the JSON data.
 * @returns {object} - Processed color variables.
 */
function processColorVariables(color) {
	const themeVariables = {};
	color.modes.forEach((item) => {
		const themeName = item.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
		themeVariables[themeName] = {};
		item.variables.forEach((entry) => {
			if (entry.isAlias) {
				const alias = item.variables.find((variable) => variable.name === entry.value.name);
				entry.value = alias.value;
			}
			const key = entry.name
				.replace(/\//g, '-')
				.toLowerCase()
				.replace(/-default/g, '')
				.replace(/\s+/g, '-');
			themeVariables[themeName][key] = entry.value;
		});
	});
	return themeVariables;
}

/**
 * Processes typography variables from the JSON data.
 *
 * @param {object} typography - The typography collection from the JSON data.
 * @returns {object} - Processed typography variables.
 */
function processTypographyVariables(typography) {
	const typographyVariables = {};
	typography.modes.forEach((item) => {
		item.variables.forEach((entry) => {
			const key = entry.name
				.replace(/([a-z])([A-Z])/g, '$1-$2')
				.toLowerCase()
				.replace(/\s+/g, '-');
			if (!key.includes('highlight')) {
				typographyVariables[key] = entry.value;
			}
		});
	});
	return typographyVariables;
}

/**
 * Processes effect variables from the JSON data.
 *
 * @param {object} effects - The effects collection from the JSON data.
 * @returns {object} - Processed effect variables.
 */
function processEffectVariables(effects) {
	const effectVariables = {};
	effects.modes.forEach((item) => {
		item.variables.forEach((entry) => {
			const key = entry.name
				.replace(/([a-z])([A-Z])/g, '$1-$2')
				.toLowerCase()
				.replace(/\s+/g, '-');
			effectVariables[key] = entry.value.effects.map((effect) => ({
				color: `rgba(${Math.round(effect.color.r * 255)} ${Math.round(effect.color.g * 255)} ${Math.round(effect.color.b * 255)} / ${Math.round(effect.color.a * 100)}%)`,
				offset: `size(${effect.offset.x}) size(${effect.offset.y})`,
				radius: `size(${effect.radius})`,
				spread: `size(${effect.spread})`,
			}));
		});
	});
	return effectVariables;
}

/**
 * Sorting function for variables.
 *
 * @param {string} a - First variable name.
 * @param {string} b - Second variable name.
 * @returns {number} - Sorting order.
 */
function sortVariables(a, b) {
	const aName = a.split(':')[0].trim();
	const bName = b.split(':')[0].trim();
	if (aName.length === 1 && bName.length > 1) {
		return -1;
	}
	if (aName < bName && bName.length !== 1) {
		return -1;
	}
	if (aName > bName) {
		return 1;
	}
	return 0;
}

// Process core, theme, typography, and effect variables from the input file
const coreCategory = inputFile.collections.find((category) => category.name === 'Core');
const colorCategory = inputFile.collections.find((category) => category.name === 'Color');
const typographyCategory = inputFile.collections.find((category) => category.name === 'Typography');
const effectsCategory = inputFile.collections.find((category) => category.name === 'Effects');

const scssCoreVariables = coreCategory ? processCoreVariables(coreCategory) : {};
const scssThemesVariables = colorCategory ? processColorVariables(colorCategory) : {};
const scssTypographyVariables = typographyCategory ? processTypographyVariables(typographyCategory) : {};
const scssEffectVariables = effectsCategory ? processEffectVariables(effectsCategory) : {};

// Convert core variables to SCSS string
const scssCoreString = Object.keys(scssCoreVariables)
	.map((category) => {
		const variables = scssCoreVariables[category];
		const sortedVariables = Object.keys(variables).sort(sortVariables);
		const variablesString = sortedVariables
			.map((variable) => {
				const isFontWeight = category.startsWith('font-weight');
				const isEdgeMargin = variable.startsWith('edge-margin');

				if (typeof variables[variable] === 'string') {
					return `\t${variable}: '${variables[variable].toLowerCase()}',`;
				} else if (typeof variables[variable] === 'number' && isFontWeight) {
					return `\t${variable}: ${variables[variable]},`;
				} else if (typeof variables[variable] === 'number' && isEdgeMargin) {
					return `\t${variable}: size(16, ${variables[variable]}),`;
				} else if (typeof variables[variable] === 'number') {
					return `\t${variable}: size(${variables[variable]}),`;
				}
			})
			.join('\n');
		return `$${category}: (\n${variablesString}\n);`;
	})
	.join('\n');

// Convert theme variables to SCSS string
const scssThemeStrings = Object.keys(scssThemesVariables)
	.map((theme) => {
		const variables = scssThemesVariables[theme];
		const sortedVariables = Object.keys(variables).sort(sortVariables);
		const variablesString = sortedVariables.map((variable) => `\t${variable}: ${variables[variable]},`).join('\n');
		return `$theme-${theme}: (\n${variablesString}\n);`;
	})
	.join('\n');

// Convert typography variables to SCSS maps for line-height and letter-spacing
const scssLineHeightString = Object.keys(scssTypographyVariables)
	.map((style) => {
		const variables = scssTypographyVariables[style];
		const lineHeight =
			variables.lineHeightUnit === 'PERCENT'
				? (variables.lineHeight / 100).toFixed(4)
				: variables.lineHeight.toFixed(4);
		return `\t${style}: ${lineHeight},`;
	})
	.join('\n');

const scssLetterSpacingString = Object.keys(scssTypographyVariables)
	.map((style) => {
		const variables = scssTypographyVariables[style];
		const letterSpacing = (variables.letterSpacing / 100).toFixed(4) + 'em';
		return `\t${style}: ${letterSpacing},`;
	})
	.join('\n');

const scssLineHeightMap = `$line-height: (\n${scssLineHeightString}\n);`;
const scssLetterSpacingMap = `$letter-spacing: (\n${scssLetterSpacingString}\n);`;

// Convert effect variables to SCSS string
const scssEffectStrings = Object.keys(scssEffectVariables)
	.map((effect) => {
		const variables = scssEffectVariables[effect];
		const variablesString = variables
			.map((variable) => {
				return `${variable.offset} ${variable.radius} ${variable.spread} ${variable.color}`;
			})
			.join(',\n');
		return `\t${effect}: ${variablesString},`;
	})
	.join('\n');

const scssEffectMap = `$shadow: (\n${scssEffectStrings}\n);`;

// Create SCSS themes map
const scssThemesMapString = Object.keys(scssThemesVariables)
	.map((theme) => `\t${theme}: $theme-${theme},`)
	.join('\n');

const scssThemes = `$themes: (\n${scssThemesMapString}\n);`;

// Extract button variation prefixes
const prefixes = new Set();
Object.values(scssThemesVariables).forEach((themeVariables) => {
	const prefixPattern = /^(.*?)-foreground$/;
	Object.keys(themeVariables).forEach((variable) => {
		const match = variable.match(prefixPattern);
		if (match) {
			const prefix = match[1];
			if (
				themeVariables[`${prefix}-foreground`] &&
				themeVariables[`${prefix}-hover`] &&
				themeVariables[`${prefix}-pressed`]
			) {
				prefixes.add(prefix);
			}
		}
	});
});
const scssPrefixes = `$button-colors: (${Array.from(prefixes).join(', ')});`;

// Write the SCSS content to the output file
fs.writeFile(
	outputFile,
	`${scssCoreString}\n${scssThemeStrings}\n${scssLineHeightMap}\n${scssLetterSpacingMap}\n${scssEffectMap}\n${scssThemes}\n${scssPrefixes}`,
	(err) => {
		if (err) throw err;
		console.log(`SCSS file has been saved to ${outputFile}`);
	},
);
