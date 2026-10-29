/**
 * @param {import('./figma-helpers').FigmaFile} figmaFile
 * @returns {Record<string, Record<string, Record<string, import('./figma-helpers').FigmaVariable>>>}
 */
function buildCollectionLookup(figmaFile) {
	return (figmaFile.collections || []).reduce((collectionsByName, collection) => {
		const collectionName = collection?.name;
		if (!collectionName) return collectionsByName;

		const variablesByName = (collectionsByName[collectionName] ||= Object.create(null));

		for (const mode of collection.modes || []) {
			const modeName = mode?.name;
			if (!modeName) continue;

			for (const variable of mode.variables || []) {
				const variableName = variable?.name;
				if (!variableName) continue;

				(variablesByName[variableName] ||= Object.create(null))[modeName] = variable;
			}
		}

		return collectionsByName;
	}, Object.create(null));
}

/**
 * @param {import('./figma-helpers').FigmaVariable} entry
 * @param {string} fallbackCollectionName
 * @returns {{ collection: string, name: string } | null}
 */
function getAliasTarget(entry, fallbackCollectionName) {
	if (!entry?.isAlias) return null;

	if (typeof entry.value === 'string') {
		return {
			collection: fallbackCollectionName,
			name: entry.value,
		};
	}

	if (entry.value && typeof entry.value === 'object' && entry.value.name) {
		return {
			collection: entry.value.collection || fallbackCollectionName,
			name: entry.value.name,
		};
	}

	return null;
}

/**
 * @param {import('./figma-helpers').FigmaFile} figmaFile
 * @returns {{
 *   collectionLookup: Record<string, Record<string, Record<string, import('./figma-helpers').FigmaVariable>>>,
 *   resolveAliasValue: import('./figma-helpers').FigmaAliasResolver
 * }}
 */
function createAliasResolver(figmaFile) {
	const collectionLookup = buildCollectionLookup(figmaFile);
	const aliasValueCache = new Map();

	/**
	 * @param {import('./figma-helpers').FigmaVariable} entry
	 * @param {string} collectionName
	 * @param {string} modeName
	 * @param {Set<string>} [visited]
	 * @returns {import('./figma-helpers').FigmaVariableValue|undefined}
	 */
	function resolveAliasValue(entry, collectionName, modeName, visited = new Set()) {
		if (!entry) return undefined;
		if (!entry.isAlias) return entry.value;

		const aliasTarget = getAliasTarget(entry, collectionName);
		if (!aliasTarget) return entry.value;

		const cacheKey = `${aliasTarget.collection}::${aliasTarget.name}::${modeName}`;
		if (aliasValueCache.has(cacheKey)) {
			return aliasValueCache.get(cacheKey);
		}

		const visitedKey = `${aliasTarget.collection}:${aliasTarget.name}:${modeName}`;
		if (visited.has(visitedKey)) {
			return entry.value;
		}

		visited.add(visitedKey);

		const collectionVariables = collectionLookup[aliasTarget.collection];
		const variablesByMode = collectionVariables?.[aliasTarget.name];
		const aliasEntry = variablesByMode?.[modeName] || (variablesByMode && Object.values(variablesByMode)[0]);

		if (!aliasEntry) {
			return entry.value;
		}

		const resolvedValue = aliasEntry.isAlias
			? resolveAliasValue(aliasEntry, aliasTarget.collection, modeName, visited)
			: aliasEntry.value;

		aliasValueCache.set(cacheKey, resolvedValue);
		return resolvedValue;
	}

	return { collectionLookup, resolveAliasValue };
}

module.exports = {
	buildCollectionLookup,
	getAliasTarget,
	createAliasResolver,
};
