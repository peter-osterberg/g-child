/**
 * Merge adjacent named root layers without crossing conditional blocks,
 * layer order statements, anonymous layers or unlayered rules.
 *
 * @returns {import('postcss').Plugin}
 */
function mergeTopLevelLayers() {
	return {
		postcssPlugin: 'postcss-merge-top-level-layers',

		/**
		 * @param {import('postcss').Root} root
		 * @returns {void}
		 */
		OnceExit(root) {
			let previous = null;

			for (const node of [...root.nodes]) {
				if (node.type === 'comment') {
					continue;
				}

				if (node.type !== 'atrule' || node.name !== 'layer' || !node.nodes || !node.params.trim()) {
					previous = null;
					continue;
				}

				if (previous?.params.trim() === node.params.trim()) {
					while (node.first) {
						previous.append(node.first);
					}

					node.remove();
				} else {
					previous = node;
				}
			}
		},
	};
}

mergeTopLevelLayers.postcss = true;

module.exports = mergeTopLevelLayers;
