/**
 * postcss-merge-same-content
 *
 * Merges sibling rules that have the exact same declaration block by combining
 * their selectors.
 *
 * Example:
 *
 *   :where(.scroll-to-top) { color: red; background: blue; }
 *   :where(.skip-links a) { color: red; background: blue; }
 *
 * becomes:
 *
 *   :where(.scroll-to-top), :where(.skip-links a) {
 *     color: red;
 *     background: blue;
 *   }
 *
 * Notes:
 * - Only merges rules in the SAME parent container.
 * - Only merges rules whose children are declarations/comments only.
 * - "adjacent" mode is safer.
 * - "aggressive" mode merges non-adjacent matching sibling rules too.
 *   This is what you likely want for your generated CSS.
 */

/**
 * @typedef {{
 *   mode?: 'adjacent' | 'aggressive',
 *   ignoreComments?: boolean,
 *   minDeclarations?: number
 * }} MergeSameContentOptions
 */

/**
 * @param {import('postcss').Rule} rule
 * @param {boolean} ignoreComments
 * @param {number} minDeclarations
 * @returns {string | null}
 */
function getRuleSignature(rule, ignoreComments, minDeclarations) {
	if (!rule.nodes || rule.nodes.length === 0) return null;

	/** @type {string[]} */
	const parts = [];
	let declCount = 0;

	for (const node of rule.nodes) {
		if (node.type === 'comment') {
			if (!ignoreComments) {
				parts.push(`comment\u0000${node.text}`);
			}
			continue;
		}

		if (node.type !== 'decl') {
			return null;
		}

		declCount += 1;

		parts.push([node.prop, node.value, node.important ? '1' : '0'].join('\u0000'));
	}

	if (declCount < minDeclarations) return null;

	return parts.join('\u0001');
}

/**
 * @param {import('postcss').Rule} target
 * @param {import('postcss').Rule} source
 */
function mergeSelectors(target, source) {
	const seen = new Set();
	/** @type {string[]} */
	const merged = [];

	for (const sel of [...target.selectors, ...source.selectors]) {
		const normalized = sel.trim();
		if (!normalized || seen.has(normalized)) continue;

		seen.add(normalized);
		merged.push(normalized);
	}

	target.selectors = merged;
}

/**
 * @param {import('postcss').Container} container
 * @param {Required<MergeSameContentOptions>} options
 */
function mergeAdjacent(container, options) {
	if (!container.nodes || container.nodes.length < 2) return;

	let i = 0;

	while (i < container.nodes.length - 1) {
		const current = container.nodes[i];

		if (current.type !== 'rule') {
			i += 1;
			continue;
		}

		const currentSig = getRuleSignature(current, options.ignoreComments, options.minDeclarations);
		if (!currentSig) {
			i += 1;
			continue;
		}

		let j = i + 1;

		while (j < container.nodes.length) {
			const next = container.nodes[j];

			if (next.type === 'comment') {
				j += 1;
				continue;
			}

			if (next.type !== 'rule') break;

			const nextSig = getRuleSignature(next, options.ignoreComments, options.minDeclarations);
			if (nextSig !== currentSig) break;

			mergeSelectors(current, next);
			next.remove();
		}

		i += 1;
	}
}

/**
 * @param {import('postcss').Container} container
 * @param {Required<MergeSameContentOptions>} options
 */
function mergeAggressive(container, options) {
	if (!container.nodes || container.nodes.length < 2) return;

	/**
	 * signature -> first rule
	 *
	 * @type {Map<string, import('postcss').Rule>}
	 */
	const firstBySignature = new Map();

	for (const node of [...container.nodes]) {
		if (node.type !== 'rule') continue;

		const signature = getRuleSignature(node, options.ignoreComments, options.minDeclarations);
		if (!signature) continue;

		const first = firstBySignature.get(signature);

		if (!first) {
			firstBySignature.set(signature, node);
			continue;
		}

		mergeSelectors(first, node);
		node.remove();
	}
}

/**
 * @param {import('postcss').Container} container
 * @param {Required<MergeSameContentOptions>} options
 */
function processContainer(container, options) {
	if (!container.nodes || container.nodes.length === 0) return;

	for (const node of [...container.nodes]) {
		if (node.type === 'atrule') {
			if (/keyframes$/i.test(node.name)) continue;
			processContainer(node, options);
			continue;
		}

		if (node.type === 'rule' && node.nodes) {
			// Skip nested CSS rules. We only merge sibling top-level rules
			// inside the current container.
			const hasNestedRuleLikeChild = node.nodes.some((child) => child.type === 'rule' || child.type === 'atrule');

			if (hasNestedRuleLikeChild) {
				processContainer(node, options);
			}
		}
	}

	if (options.mode === 'adjacent') {
		mergeAdjacent(container, options);
	} else {
		mergeAggressive(container, options);
	}
}

/**
 * @param {MergeSameContentOptions} opts
 * @returns {import('postcss').Plugin}
 */
function postcssMergeSameContent(opts = {}) {
	const options = {
		mode: opts.mode ?? 'aggressive',
		ignoreComments: opts.ignoreComments ?? true,
		minDeclarations: opts.minDeclarations ?? 1,
	};

	return {
		postcssPlugin: 'postcss-merge-same-content',

		/**
		 * @param {import('postcss').Root} root
		 * @returns {void}
		 */
		OnceExit(root) {
			processContainer(root, options);
		},
	};
}

postcssMergeSameContent.postcss = true;

module.exports = postcssMergeSameContent;
