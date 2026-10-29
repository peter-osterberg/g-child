/**
 * Hoist globally-declared layer blocks out of other layer blocks.
 *
 * Example:
 *
 *   `@layer modules {`
 *     `@layer components {`
 *       `@layer root { ... }`
 *     }
 *   }
 *
 * becomes:
 *
 *   `@layer modules { }`
 *   `@layer components {`
 *     `@layer root { ... }`
 *   }
 *
 * Conditional ancestors are copied inside the hoisted layer. Ancestor blocks
 * are split at the original position to preserve declaration source order.
 *
 * Global layer names are inferred from root-level statement-form `@layer` rules,
 * for example:
 *
 *   `@layer theme, base, components.root, components.color, components.variant;`
 *
 * From that, this plugin will treat these as global roots:
 * - theme
 * - base
 * - components
 *
 * and these exact full names as global:
 * - theme
 * - base
 * - components.root
 * - components.color
 * - components.variant
 *
 * @param {object} [options]
 * @param {string[]} [options.layerNames] Optional explicit global layer names.
 *   If omitted, names are inferred from root-level statement-form `@layer` rules.
 * @returns {import('postcss').Plugin}
 */
function hoistGlobalLayers(options = {}) {
	const { layerNames } = options;

	return {
		postcssPlugin: 'postcss-hoist-global-layers',

		/**
		 * @param {import('postcss').Root} root
		 */
		OnceExit(root) {
			const globalLayerInfo = getGlobalLayerInfo(root, layerNames);
			const hoistTargets = collectHoistTargets(root, globalLayerInfo);

			for (const layerRule of hoistTargets) {
				if (!layerRule.parent || layerRule.parent.type === 'root') {
					continue;
				}

				hoistLayerInPlace(layerRule);
			}
		},
	};
}

/**
 * Collect all nested layer blocks that should be hoisted to root.
 *
 * A layer block is hoistable when:
 * - it is a named block-form layer, including an empty block
 * - it has a named layer ancestor and only supported grouping ancestors
 * - its name is recognized as a global layer name
 *
 * @param {import('postcss').Root} root
 * @param {{
 *   fullNames: Set<string>,
 *   rootNames: Set<string>
 * }} globalLayerInfo
 * @returns {import('postcss').AtRule[]}
 */
function collectHoistTargets(root, globalLayerInfo) {
	/** @type {import('postcss').AtRule[]} */
	const targets = [];

	root.walkAtRules('layer', (layerRule) => {
		if (!isMergeableLayerBlock(layerRule)) {
			return;
		}

		const ancestors = [];
		let parent = layerRule.parent;

		while (parent && parent.type !== 'root') {
			// Rule nesting and anonymous layers cannot be split without changing
			// selector scope or creating a different anonymous layer.
			if (
				parent.type !== 'atrule' ||
				!['layer', 'media', 'supports', 'container', 'scope', 'starting-style'].includes(parent.name) ||
				(parent.name === 'layer' && !parent.params.trim())
			) {
				return;
			}

			ancestors.push(parent);
			parent = parent.parent;
		}

		if (!ancestors.some((ancestor) => ancestor.name === 'layer')) {
			return;
		}

		const layerName = layerRule.params.trim();

		if (isGlobalLayerName(layerName, globalLayerInfo)) {
			targets.push(layerRule);
		}
	});

	return targets;
}

/**
 * Move a global layer to root at its original source position, retaining
 * conditional wrappers around its contents and splitting surrounding blocks.
 *
 * @param {import('postcss').AtRule} layerRule
 * @returns {void}
 */
function hoistLayerInPlace(layerRule) {
	const ancestors = [];
	let parent = layerRule.parent;

	while (parent && parent.type !== 'root') {
		ancestors.push(parent);
		parent = parent.parent;
	}

	for (const ancestor of ancestors) {
		if (ancestor.name === 'layer') {
			continue;
		}

		const condition = ancestor.clone({ nodes: [] });

		while (layerRule.first) {
			condition.append(layerRule.first);
		}

		layerRule.append(condition);
	}

	for (const ancestor of ancestors) {
		const following = ancestor.clone({ nodes: [] });

		while (layerRule.next()) {
			following.append(layerRule.next());
		}

		layerRule.remove();
		ancestor.after(layerRule);

		if (following.nodes.length > 0) {
			layerRule.after(following);
		}

		// Empty named layers still establish cascade order.
		if (ancestor.name !== 'layer' && ancestor.nodes.length === 0) {
			ancestor.remove();
		}
	}
}

/**
 * Determine the global layer names.
 *
 * @param {import('postcss').Root} root
 * @param {string[] | undefined} explicitLayerNames
 * @returns {{
 *   fullNames: Set<string>,
 *   rootNames: Set<string>
 * }}
 */
function getGlobalLayerInfo(root, explicitLayerNames) {
	/** @type {string[]} */
	const names = explicitLayerNames?.length ? explicitLayerNames : inferGlobalLayerNamesFromStatements(root);

	/** @type {Set<string>} */
	const fullNames = new Set();

	/** @type {Set<string>} */
	const rootNames = new Set();

	for (const name of names) {
		const trimmed = name.trim();

		if (!trimmed) {
			continue;
		}

		fullNames.add(trimmed);
		rootNames.add(trimmed.split('.')[0]);
	}

	return { fullNames, rootNames };
}

/**
 * Infer global layer names from root-level statement-form `@layer` rules.
 *
 * Example:
 *
 *   `@layer theme, base, components.root, components.color;`
 *
 * @param {import('postcss').Root} root
 * @returns {string[]}
 */
function inferGlobalLayerNamesFromStatements(root) {
	/** @type {string[]} */
	const names = [];

	for (const node of root.nodes || []) {
		if (node.type === 'atrule' && node.name === 'layer' && !node.nodes && node.params?.trim()) {
			for (const part of node.params.split(',')) {
				const trimmed = part.trim();

				if (trimmed) {
					names.push(trimmed);
				}
			}
		}
	}

	return names;
}

/**
 * Returns true when a layer name should be treated as global.
 *
 * A name is global when:
 * - it exactly matches a declared global full name, or
 * - it matches a declared global root name
 *
 * Examples with:
 *   theme, base, components.root, components.color
 *
 * global:
 * - theme
 * - base
 * - components
 * - components.root
 * - components.color
 *
 * not global:
 * - root
 * - color
 *
 * @param {string} layerName
 * @param {{
 *   fullNames: Set<string>,
 *   rootNames: Set<string>
 * }} globalLayerInfo
 * @returns {boolean}
 */
function isGlobalLayerName(layerName, globalLayerInfo) {
	if (globalLayerInfo.fullNames.has(layerName)) {
		return true;
	}

	return globalLayerInfo.rootNames.has(layerName);
}

/**
 * Returns true only for block-form `@layer` rules with a single layer name:
 *
 *   `@layer utilities { ... }`
 *
 * Returns false for:
 * - statement-form layer order rules:
 *     `@layer theme, base, utilities;`
 * - anonymous layer blocks:
 *     `@layer { ... }`
 * - invalid/empty params
 *
 * @param {import('postcss').Node} node
 * @returns {node is import('postcss').AtRule}
 */
function isMergeableLayerBlock(node) {
	if (!node || node.type !== 'atrule' || node.name !== 'layer') {
		return false;
	}

	// Empty blocks still register a layer. They must be rebased too, otherwise
	// minification turns them into unintended names such as base.theme.
	if (!node.nodes) {
		return false;
	}

	const layerName = node.params?.trim();

	if (!layerName) {
		return false;
	}

	return !layerName.includes(',');
}

hoistGlobalLayers.postcss = true;

module.exports = hoistGlobalLayers;
