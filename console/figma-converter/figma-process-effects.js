const { toKebabPath, renderSize, compressHex, escapeScssKey } = require('./figma-helpers');

const { normalizeHex } = require('./figma-process-colors');

/**
 * @param {import('./figma-helpers').FigmaCollection} effectsCollection
 * @param {import('./figma-helpers').FigmaAliasResolver} resolveAliasValue
 * @returns {Record<string, import('./figma-helpers').ProcessedEffect[]>}
 */
function processEffectVariables(effectsCollection, resolveAliasValue) {
	const effectsByKey = Object.create(null);

	for (const mode of effectsCollection?.modes || []) {
		for (const entry of mode.variables || []) {
			const resolvedValue = entry.isAlias ? resolveAliasValue(entry, effectsCollection.name, mode.name) : entry.value;

			const value = resolvedValue ?? entry.value;
			const effectKey = toKebabPath(entry.name);
			const effectList = (value && value.effects) || [];

			const to255 = (channel) => (channel <= 1 ? Math.round(channel * 255) : Math.round(channel));
			const toHex2 = (value) => value.toString(16).padStart(2, '0');

			effectsByKey[effectKey] = effectList.map((effect) => {
				const r = to255(effect?.color?.r ?? 0);
				const g = to255(effect?.color?.g ?? 0);
				const b = to255(effect?.color?.b ?? 0);
				const alpha = typeof effect?.color?.a === 'number' ? effect.color.a : 1;

				return {
					hex: compressHex(`#${toHex2(r)}${toHex2(g)}${toHex2(b)}`),
					alpha,
					offset: `${renderSize(effect?.offset?.x ?? 0)} ${renderSize(effect?.offset?.y ?? 0)}`,
					radius: renderSize(effect?.radius ?? 0),
					spread: renderSize(effect?.spread ?? 0),
				};
			});
		}
	}

	return effectsByKey;
}

/**
 * @param {Record<string, import('./figma-helpers').ProcessedEffect[]>} effectVariables
 * @param {Map<string, string>} colorToBaseKey
 * @returns {string}
 */
function buildEffectMap(effectVariables, colorToBaseKey) {
	const effectKeys = Object.keys(effectVariables).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

	const body = effectKeys
		.map((effectKey) => {
			const effectItems = effectVariables[effectKey] || [];

			if (!effectItems.length) {
				return `\t'${escapeScssKey(effectKey)}': (),`;
			}

			const lines = effectItems
				.map((effectItem) => {
					const normalizedHex = normalizeHex(effectItem.hex);
					const baseKey = colorToBaseKey.get(normalizedHex);
					const alpha = typeof effectItem.alpha === 'number' ? effectItem.alpha : 1;

					let colorValue;

					if (alpha <= 0) {
						colorValue = 'transparent';
					} else if (alpha < 1) {
						const alphaPercent = Math.round(alpha * 1000) / 10;
						colorValue = baseKey
							? `alpha(var(--${escapeScssKey(baseKey)}), ${alphaPercent}%)`
							: `alpha(${effectItem.hex}, ${alphaPercent}%)`;
					} else if (baseKey) {
						colorValue = `var(--${escapeScssKey(baseKey)})`;
					} else {
						colorValue = effectItem.hex;
					}

					return `\t\t${effectItem.offset} ${effectItem.radius} ${effectItem.spread} ${colorValue},`;
				})
				.join('\n');

			return `\t'${escapeScssKey(effectKey)}': (\n${lines}\n\t),`;
		})
		.join('\n');

	return `$shadow: (\n${body}\n);`;
}

module.exports = {
	processEffectVariables,
	buildEffectMap,
};
