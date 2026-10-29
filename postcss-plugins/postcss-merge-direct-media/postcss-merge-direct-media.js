/**
 * Hoist direct-child `@media` rules inside every container and optionally sort them.
 *
 * @param {object} [options]
 * @param {boolean} [options.sortMedia] Whether to sort media queries.
 * @param {number} [options.baseFontSize] Base font size used for em/rem -> px conversion.
 * @param {(a: string, b: string) => number} [options.compareMedia] Optional custom comparator for normalized media queries.
 * @returns {import('postcss').Plugin}
 */
function mergeDirectMedia(options = {}) {
	const { sortMedia = false, baseFontSize = 16, compareMedia } = options;

	return {
		postcssPlugin: 'postcss-merge-direct-media',

		/**
		 * @param {import('postcss').Root} root
		 */
		Once(root) {
			walkContainers(root, (container) => {
				hoistDirectMediaRules(container, {
					sortMedia,
					baseFontSize,
					compareMedia,
				});
			});
		},
	};
}

/**
 * Walk all containers depth-first.
 *
 * @param {import('postcss').Container} container
 * @param {(container: import('postcss').Container) => void} visit
 * @returns {void}
 */
function walkContainers(container, visit) {
	visit(container);

	for (const node of [...(container.nodes || [])]) {
		if (node.nodes) {
			walkContainers(node, visit);
		}
	}
}

/**
 * Hoist direct-child `@media` rules inside a container,
 * optionally sort them, then append them to the end of the container.
 *
 * Only direct-child `@media` nodes are considered.
 *
 * @param {import('postcss').Container} container
 * @param {{
 *   sortMedia: boolean,
 *   baseFontSize: number,
 *   compareMedia?: (a: string, b: string) => number
 * }} options
 * @returns {void}
 */
function hoistDirectMediaRules(container, options) {
	/** @type {import('postcss').AtRule[]} */
	const directMediaRules = [];

	for (const node of container.nodes || []) {
		if (node.type === 'atrule' && node.name === 'media') {
			directMediaRules.push(node);
		}
	}

	if (directMediaRules.length === 0) {
		return;
	}

	for (const mediaRule of directMediaRules) {
		mediaRule.remove();
	}

	const orderedMediaRules = options.sortMedia
		? sortMediaRules(directMediaRules, {
				baseFontSize: options.baseFontSize,
				compareMedia: options.compareMedia,
			})
		: directMediaRules;

	for (const mediaRule of orderedMediaRules) {
		container.append(mediaRule);
	}
}

/**
 * Normalize media query text for semantic sorting and comparison.
 *
 * This normalization is intentionally semantic enough to compare common
 * equivalent forms:
 *
 * - whitespace / casing differences
 * - (hover) <-> (hover:hover)
 * - (any-hover) <-> (any-hover:hover)
 * - reordered top-level `and` conditions
 * - reordered comma-separated branches
 *
 * Examples:
 * - (pointer: fine) and (hover)
 * - (hover: hover) and (pointer: fine)
 * - (hover) and (pointer: fine)
 *
 * All normalize to:
 * - (hover:hover) and (pointer:fine)
 *
 * @param {string} query
 * @returns {string}
 */
function normalizeMediaQuery(query) {
	return splitTopLevelByComma(query)
		.map(normalizeMediaBranch)
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b))
		.join(', ');
}

/**
 * Normalize one comma-separated media query branch.
 *
 * Examples:
 * - screen and (pointer: fine) and (hover)
 * - screen and (hover:hover) and (pointer:fine)
 *
 * become:
 * - screen and (hover:hover) and (pointer:fine)
 *
 * @param {string} branch
 * @returns {string}
 */
function normalizeMediaBranch(branch) {
	let text = normalizeMediaText(branch);
	if (!text) return '';

	let modifier = '';
	let mediaType = '';
	let remainder = text;

	const modifierMatch = remainder.match(/^(not|only)\b\s*/);
	if (modifierMatch) {
		modifier = modifierMatch[1];
		remainder = remainder.slice(modifierMatch[0].length).trim();
	}

	const parts = splitTopLevelAnd(remainder);

	if (parts.length > 0 && !parts[0].startsWith('(')) {
		mediaType = parts.shift() || '';
	}

	const conditions = parts
		.map(normalizeMediaCondition)
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b));

	if (modifier && mediaType) {
		return conditions.length > 0
			? `${modifier} ${mediaType} and ${conditions.join(' and ')}`
			: `${modifier} ${mediaType}`;
	}

	if (mediaType) {
		return conditions.length > 0
			? `${mediaType} and ${conditions.join(' and ')}`
			: mediaType;
	}

	if (modifier) {
		return conditions.length > 0
			? `${modifier} ${conditions.join(' and ')}`
			: modifier;
	}

	return conditions.join(' and ');
}

/**
 * Normalize a single top-level media condition.
 *
 * @param {string} condition
 * @returns {string}
 */
function normalizeMediaCondition(condition) {
	return normalizeMediaText(condition)
		.replace(/\((any-)?hover\)/g, (_match, prefix = '') => `(${prefix}hover:hover)`);
}

/**
 * Normalize simple media query text fragments.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeMediaText(text) {
	return text
		.replace(/\s+/g, ' ')
		.replace(/\(\s*/g, '(')
		.replace(/\s*\)/g, ')')
		.replace(/\s*:\s*/g, ':')
		.replace(/\s*([<>]=?|=)\s*/g, '$1')
		.trim()
		.toLowerCase();
}

/**
 * Split a media query list by top-level commas.
 *
 * @param {string} input
 * @returns {string[]}
 */
function splitTopLevelByComma(input) {
	const parts = [];
	let depth = 0;
	let start = 0;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		if (char === '(') depth++;
		else if (char === ')') depth--;
		else if (char === ',' && depth === 0) {
			parts.push(input.slice(start, i).trim());
			start = i + 1;
		}
	}

	parts.push(input.slice(start).trim());

	return parts.filter(Boolean);
}

/**
 * Split a media query branch by top-level `and`.
 *
 * @param {string} input
 * @returns {string[]}
 */
function splitTopLevelAnd(input) {
	const parts = [];
	let depth = 0;
	let start = 0;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		if (char === '(') {
			depth++;
			continue;
		}

		if (char === ')') {
			depth--;
			continue;
		}

		if (depth === 0 && isStandaloneAndAt(input, i)) {
			parts.push(input.slice(start, i).trim());
			i += 2;
			start = i + 1;
		}
	}

	parts.push(input.slice(start).trim());

	return parts.filter(Boolean);
}

/**
 * Return true when `and` appears at `index` as a standalone top-level token.
 *
 * @param {string} input
 * @param {number} index
 * @returns {boolean}
 */
function isStandaloneAndAt(input, index) {
	if (input.slice(index, index + 3).toLowerCase() !== 'and') {
		return false;
	}

	const before = index === 0 ? ' ' : input[index - 1];
	const after = index + 3 >= input.length ? ' ' : input[index + 3];

	return /\s/.test(before) && /\s/.test(after);
}

/**
 * Sort media rules by breakpoint semantics.
 *
 * Order:
 * - unknown
 * - min-width ascending
 * - min/max ranges ascending
 * - max-width descending
 *
 * Stable for ties.
 *
 * @param {import('postcss').AtRule[]} mediaRules
 * @param {{
 *   baseFontSize: number,
 *   compareMedia?: (a: string, b: string) => number
 * }} options
 * @returns {import('postcss').AtRule[]}
 */
function sortMediaRules(mediaRules, options) {
	if (options.compareMedia) {
		return [...mediaRules].sort((a, b) =>
			options.compareMedia(normalizeMediaQuery(a.params), normalizeMediaQuery(b.params)),
		);
	}

	const typeRank = {
		unknown: 0,
		min: 1,
		range: 2,
		max: 3,
	};

	return mediaRules
		.map((rule, index) => ({
			rule,
			index,
			breakpoint: extractBreakpointInfo(normalizeMediaQuery(rule.params), options.baseFontSize),
		}))
		.sort((a, b) => {
			if (a.breakpoint.type !== b.breakpoint.type) {
				return typeRank[a.breakpoint.type] - typeRank[b.breakpoint.type];
			}

			switch (a.breakpoint.type) {
				case 'min':
					return a.breakpoint.value - b.breakpoint.value || a.index - b.index;
				case 'range':
					return a.breakpoint.min - b.breakpoint.min || a.breakpoint.max - b.breakpoint.max || a.index - b.index;
				case 'max':
					return b.breakpoint.value - a.breakpoint.value || a.index - b.index;
				default:
					return a.index - b.index;
			}
		})
		.map(({ rule }) => rule);
}

/**
 * Extract breakpoint metadata from a normalized media query.
 *
 * Supports:
 * - (min-width: Xpx|em|rem)
 * - (max-width: Xpx|em|rem)
 * - (width >= Xpx|em|rem)
 * - (width < Xpx|em|rem)
 * - (Xpx|em|rem <= width < Ypx|em|rem)
 * - both min-width and max-width
 *
 * @param {string} query
 * @param {number} baseFontSize
 * @returns {{
 *   type: 'unknown'
 * } | {
 *   type: 'min',
 *   value: number
 * } | {
 *   type: 'max',
 *   value: number
 * } | {
 *   type: 'range',
 *   min: number,
 *   max: number
 * }}
 */
function extractBreakpointInfo(query, baseFontSize) {
	const minValues = [
		...extractBreakpointValues(query, /min-width\s*:\s*([0-9.]+)(px|em|rem)/gi, baseFontSize),
		...extractBreakpointValues(query, /width\s*(?:>=|>)\s*([0-9.]+)(px|em|rem)/gi, baseFontSize),
		...extractBreakpointValues(query, /([0-9.]+)(px|em|rem)\s*(?:<=|<)\s*width/gi, baseFontSize),
	];
	const maxValues = [
		...extractBreakpointValues(query, /max-width\s*:\s*([0-9.]+)(px|em|rem)/gi, baseFontSize),
		...extractBreakpointValues(query, /width\s*(?:<=|<)\s*([0-9.]+)(px|em|rem)/gi, baseFontSize),
		...extractBreakpointValues(query, /([0-9.]+)(px|em|rem)\s*(?:>=|>)\s*width/gi, baseFontSize),
	];
	const minValue = minValues.length > 0 ? Math.max(...minValues) : null;
	const maxValue = maxValues.length > 0 ? Math.min(...maxValues) : null;

	if (minValue !== null && maxValue !== null) {
		return {
			type: 'range',
			min: minValue,
			max: maxValue,
		};
	}

	if (minValue !== null) {
		return {
			type: 'min',
			value: minValue,
		};
	}

	if (maxValue !== null) {
		return {
			type: 'max',
			value: maxValue,
		};
	}

	return { type: 'unknown' };
}

/**
 * Extract normalized breakpoint values from one or more regex matches.
 *
 * @param {string} query
 * @param {RegExp} pattern
 * @param {number} baseFontSize
 * @returns {number[]}
 */
function extractBreakpointValues(query, pattern, baseFontSize) {
	return [...query.matchAll(pattern)].map((match) =>
		convertToPx(Number.parseFloat(match[1]), /** @type {'px'|'em'|'rem'} */ (match[2]), baseFontSize),
	);
}

/**
 * Convert a px/em/rem breakpoint value to pixels.
 *
 * @param {number} value
 * @param {'px'|'em'|'rem'} unit
 * @param {number} baseFontSize
 * @returns {number}
 */
function convertToPx(value, unit, baseFontSize) {
	if (unit === 'px') {
		return value;
	}

	return value * baseFontSize;
}

mergeDirectMedia.postcss = true;

module.exports = mergeDirectMedia;
