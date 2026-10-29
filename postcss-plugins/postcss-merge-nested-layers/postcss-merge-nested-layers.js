/**
 * Merge adjacent named child layers, preserving sublayer identity and order.
 * A nested same-name layer is still a distinct sublayer and is never unwrapped.
 *
 * @returns {import('postcss').Plugin}
 */
function mergeDirectChildLayers() {
	return {
		postcssPlugin: 'postcss-merge-direct-child-layers',

		/**
		 * @param {import('postcss').Root} root
		 * @returns {void}
		 */
		OnceExit(root) {
			root.walkAtRules('layer', (layer) => {
				let previous = null;

				for (const node of [...(layer.nodes || [])]) {
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
			});
		},
	};
}

mergeDirectChildLayers.postcss = true;

module.exports = mergeDirectChildLayers;
