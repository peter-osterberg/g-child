const selectorParser = require('postcss-selector-parser');

/**
 * Return true only when matching a selector requires :hover.
 *
 * Examples treated as hover:
 *   .btn:hover
 *   .btn:is(:hover, .item:hover)
 *   .btn:where(:hover)
 *
 * Examples ignored:
 *   .btn:not(:hover)
 *   .btn:is(:hover, :focus-visible)
 *
 * @param {import('postcss-selector-parser').Selector} selector
 * @returns {boolean}
 */
function selectorHasRealHover(selector) {
	return selector.nodes.some((node) => {
		if (node.type !== 'pseudo') {
			return false;
		}

		if (node.value === ':hover') {
			return true;
		}

		// Keep mixed hover/focus alternatives intact, including specificity.
		return (
			[':is', ':where', ':has'].includes(node.value) && node.nodes?.length > 0 && node.nodes.every(selectorHasRealHover)
		);
	});
}

/**
 * Split a selector list into:
 * - selectors containing actionable :hover
 * - selectors without actionable :hover
 *
 * @param {string} rawSelector
 * @returns {{ hover: string[], nonHover: string[] }}
 */
function splitHoverSelectors(rawSelector) {
	const hover = [];
	const nonHover = [];

	selectorParser((root) => {
		root.each((selector) => {
			(selectorHasRealHover(selector) ? hover : nonHover).push(selector.toString());
		});
	}).processSync(rawSelector);

	return { hover, nonHover };
}

/**
 * Return true when every media query branch guarantees hover capability.
 *
 * Matches:
 *   (hover)
 *   (hover: hover)
 *   (any-hover)
 *   (any-hover: hover)
 *
 * Conservatively rejects queries containing `not` or `or`.
 *
 * @param {string} params
 * @returns {boolean}
 */
function mediaQueryHasHoverCapability(params) {
	const HOVER_MEDIA_RE = /\(\s*(?:any-)?hover(?:\s*:\s*hover)?\s*\)/i;

	// Split comma-separated media query lists at top level.
	const branches = [];
	let depth = 0;
	let start = 0;

	for (let i = 0; i < params.length; i++) {
		const char = params[i];

		if (char === '(') depth++;
		else if (char === ')') depth--;
		else if (char === ',' && depth === 0) {
			branches.push(params.slice(start, i));
			start = i + 1;
		}
	}

	branches.push(params.slice(start));

	return branches.every((branch) => {
		const normalized = branch.trim();

		if (!normalized) return false;
		if (/\b(?:not|or)\b/i.test(normalized)) return false;

		return HOVER_MEDIA_RE.test(normalized);
	});
}

/**
 * Detect whether a rule already lives inside a hover-capable media query.
 *
 * @param {import('postcss').Rule} rule
 * @returns {boolean}
 */
function isInsideHoverMedia(rule) {
	let parent = rule.parent;
	while (parent) {
		if (parent.type === 'atrule' && parent.name.toLowerCase() === 'media') {
			if (mediaQueryHasHoverCapability(parent.params)) {
				return true;
			}
		}
		parent = parent.parent;
	}

	return false;
}

/**
 * PostCSS plugin:
 * Moves selectors requiring :hover into a hover-capable media query.
 *
 * Example:
 *   .btn:hover, .btn:focus-visible { ... }
 *
 * becomes:
 *   .btn:focus-visible { ... }
 *
 *   `@media (hover) and (pointer: fine) {`
 *     .btn:hover { ... }
 *   }
 *
 * @param {object} options
 * @param {string} [options.mediaQuery]
 * @returns {import('postcss').Plugin}
 */
function postcssHoverWrap({ mediaQuery = '(hover) and (pointer: fine)' } = {}) {
	return {
		postcssPlugin: 'postcss-hover-wrap',

		/**
		 * @param {import('postcss').Rule} rule
		 * @param {{ AtRule: new (...args: unknown[]) => import('postcss').AtRule }} helpers
		 */
		Rule(rule, { AtRule }) {
			if (rule.__hoverWrapProcessed) return;

			// Ignore keyframes.
			if (rule.parent?.type === 'atrule') {
				const name = rule.parent.name?.toLowerCase();
				if (name === 'keyframes' || name === '-webkit-keyframes') {
					return;
				}
			}

			// Fast bail-outs.
			if (!rule.selector || !rule.selector.includes(':hover')) return;
			if (isInsideHoverMedia(rule)) return;

			const { hover, nonHover } = splitHoverSelectors(rule.selector);
			if (hover.length === 0) return;

			const media = new AtRule({
				name: 'media',
				params: mediaQuery,
			});

			const hoverRule = rule.clone({ selectors: hover });
			hoverRule.__hoverWrapProcessed = true;

			media.append(hoverRule);
			media.__hoverWrapProcessed = true;
			rule.after(media);

			if (nonHover.length > 0) {
				rule.selectors = nonHover;
			} else {
				rule.remove();
			}
		},
	};
}

postcssHoverWrap.postcss = true;

module.exports = postcssHoverWrap;
