const fs = require('fs');
const path = require('path');

// ---------- low-level parsing helpers ----------

/**
 * Determines if the given SCSS body represents a top-level list.
 *
 * @param {string} body
 * @returns {boolean}
 */
function isTopLevelList(body) {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let previousChar = '';

	for (let index = 0; index < body.length; index++) {
		const char = body[index];

		if (char === "'" && !inDouble && previousChar !== '\\') inSingle = !inSingle;
		else if (char === '"' && !inSingle && previousChar !== '\\') inDouble = !inDouble;
		else if (!inSingle && !inDouble) {
			if (char === '(') depth++;
			else if (char === ')') depth = Math.max(0, depth - 1);
			else if (char === ':' && depth === 0) return false;
		}

		previousChar = char;
	}

	return true;
}

/**
 * Splits a string at the top level by the given delimiter, respecting parentheses and quotes.
 *
 * @param {string} value
 * @param {string} delimiter
 * @returns {string[]}
 */
function splitTopLevel(value, delimiter) {
	const parts = [];
	let buffer = '';
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let previousChar = '';

	for (let index = 0; index < value.length; index++) {
		const char = value[index];

		if (char === "'" && !inDouble && previousChar !== '\\') inSingle = !inSingle;
		else if (char === '"' && !inSingle && previousChar !== '\\') inDouble = !inDouble;
		else if (!inSingle && !inDouble) {
			if (char === '(') depth++;
			else if (char === ')') depth = Math.max(0, depth - 1);
			else if (char === delimiter && depth === 0) {
				const chunk = buffer.trim();
				if (chunk) parts.push(chunk);
				buffer = '';
				previousChar = char;
				continue;
			}
		}

		buffer += char;
		previousChar = char;
	}

	const tail = buffer.trim();
	if (tail) parts.push(tail);

	return parts;
}

/**
 * Splits a string once at the first top-level delimiter, respecting parentheses and quotes.
 *
 * @param {string} value
 * @param {string} delimiter
 * @returns {[string, string]}
 */
function splitTopLevelOnce(value, delimiter) {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let previousChar = '';

	for (let index = 0; index < value.length; index++) {
		const char = value[index];

		if (char === "'" && !inDouble && previousChar !== '\\') inSingle = !inSingle;
		else if (char === '"' && !inSingle && previousChar !== '\\') inDouble = !inDouble;
		else if (!inSingle && !inDouble) {
			if (char === '(') depth++;
			else if (char === ')') depth = Math.max(0, depth - 1);
			else if (char === delimiter && depth === 0) {
				return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
			}
		}

		previousChar = char;
	}

	return [value.trim(), ''];
}

/**
 * Finds the index of the matching closing parenthesis in a string.
 *
 * @param {string} value
 * @param {number} openIndex
 * @returns {number}
 */
function findMatchingParen(value, openIndex) {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let previousChar = '';

	for (let index = openIndex; index < value.length; index++) {
		const char = value[index];

		if (char === "'" && !inDouble && previousChar !== '\\') inSingle = !inSingle;
		else if (char === '"' && !inSingle && previousChar !== '\\') inDouble = !inDouble;
		else if (!inSingle && !inDouble) {
			if (char === '(') depth++;
			else if (char === ')') {
				depth--;
				if (depth === 0) return index;
			}
		}

		previousChar = char;
	}

	return -1;
}

/**
 * @param {string} value
 * @returns {string}
 */
function stripQuotes(value) {
	const normalized = String(value).trim();

	if (
		(normalized.startsWith("'") && normalized.endsWith("'")) ||
		(normalized.startsWith('"') && normalized.endsWith('"'))
	) {
		return normalized.slice(1, -1);
	}

	return normalized;
}

/**
 * @param {string} key
 * @returns {string}
 */
function quoteKey(key) {
	return `'${String(key).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// ---------- SCSS map/list locator (with exact spans) ----------

/**
 * Returns array of { name, body, start, end, isList }
 * where [start, end) spans `$name: (body);`
 *
 * @param {string} sourceScss
 * @returns {Array<{ name: string, body: string, start: number, end: number, isList: boolean }>}
 */
function findScssMapsAndLists(sourceScss) {
	const results = [];
	const pattern = /\$([a-zA-Z0-9_-]+)\s*:\s*\(/g;

	let match;
	while ((match = pattern.exec(sourceScss)) !== null) {
		const name = match[1];
		const openIndex = sourceScss.indexOf('(', match.index + match[0].length - 1);
		const closeIndex = findMatchingParen(sourceScss, openIndex);
		if (closeIndex === -1) continue;

		let end = closeIndex + 1;
		if (sourceScss[end] === ';') end += 1;

		const body = sourceScss.slice(openIndex + 1, closeIndex).trim();

		results.push({
			name,
			body,
			start: match.index,
			end,
			isList: isTopLevelList(body),
		});

		pattern.lastIndex = end;
	}

	return results;
}

// ---------- body parsers ----------

/**
 * Parse a list body into array of items.
 *
 * @param {string} body
 * @returns {string[]}
 */
function parseListBody(body) {
	return splitTopLevel(body, ',')
		.map((item) => item.trim())
		.filter(Boolean);
}

/**
 * Parse a map body into:
 * - order: array of keys in appearance order
 * - map: Map<normalizedKey, { key, value }>
 *
 * @param {string} body
 * @returns {{ order: string[], map: Map<string, { key: string, value: string }> }}
 */
function parseMapBody(body) {
	const entries = splitTopLevel(body, ',').filter(Boolean);
	const order = [];
	const map = new Map();

	for (const entry of entries) {
		const [rawKey, value] = splitTopLevelOnce(entry, ':');
		if (!rawKey || !value) continue;

		const keyText = rawKey.trim();
		const normalizedKey = stripQuotes(keyText);

		if (!map.has(normalizedKey)) order.push(normalizedKey);
		map.set(normalizedKey, { key: keyText, value: value.trim() });
	}

	return { order, map };
}

/**
 * Format a map body consistently.
 *
 * @param {string} body
 * @returns {string}
 */
function formatMapBody(body) {
	const { order, map } = parseMapBody(body);

	return order
		.map((key) => {
			const entry = map.get(key);
			return `  ${entry.key}: ${entry.value},`;
		})
		.join('\n');
}

// ---------- merging ----------

/**
 * Merge two list bodies.
 * Keep target order, append unique items from source.
 *
 * @param {string} sourceBody
 * @param {string} targetBody
 * @returns {string}
 */
function mergeLists(sourceBody, targetBody) {
	const targetItems = parseListBody(targetBody);
	const sourceItems = parseListBody(sourceBody);

	const seen = new Set(targetItems);
	const mergedItems = [...targetItems];

	for (const item of sourceItems) {
		if (!seen.has(item)) {
			mergedItems.push(item);
			seen.add(item);
		}
	}

	return mergedItems.join(', ');
}

/**
 * Merge two map bodies.
 * - Preserve target key quoting
 * - Override target values with source when same normalized key
 * - Append new keys from source
 *
 * @param {string} sourceBody
 * @param {string} targetBody
 * @returns {string}
 */
function mergeMaps(sourceBody, targetBody) {
	const sourceMapData = parseMapBody(sourceBody);
	const targetMapData = parseMapBody(targetBody);

	const mergedOrder = [...targetMapData.order];
	const mergedMap = new Map(targetMapData.map);

	for (const key of sourceMapData.order) {
		const sourceEntry = sourceMapData.map.get(key);

		if (mergedMap.has(key)) {
			const previousEntry = mergedMap.get(key);
			mergedMap.set(key, { key: previousEntry.key, value: sourceEntry.value });
		} else {
			mergedMap.set(key, { key: quoteKey(key), value: sourceEntry.value });
			mergedOrder.push(key);
		}
	}

	return mergedOrder
		.map((key) => {
			const entry = mergedMap.get(key);
			return `  ${entry.key}: ${entry.value},`;
		})
		.join('\n');
}

/**
 * Only sort some maps.
 *
 * @param {string} name
 * @returns {boolean}
 */
function shouldSortMap(name) {
	return /^theme-/.test(name) || name === 'themes' || name === 'theme';
}

/**
 * Take a map body string and return a sorted version.
 *
 * @param {string} body
 * @returns {string}
 */
function sortMapBody(body) {
	const parsedMap = parseMapBody(body);
	const sortedOrder = [...parsedMap.order].sort((a, b) =>
		String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }),
	);

	return sortedOrder
		.map((key) => {
			const entry = parsedMap.map.get(key);
			return `  ${entry.key}: ${entry.value},`;
		})
		.join('\n');
}

/**
 * Merge two bodies (map or list).
 *
 * @param {string} sourceBody
 * @param {string} targetBody
 * @returns {string}
 */
function mergeBodies(sourceBody, targetBody) {
	const sourceIsList = isTopLevelList(sourceBody);
	const targetIsList = isTopLevelList(targetBody);

	if (sourceIsList && targetIsList) return mergeLists(sourceBody, targetBody);
	if (!sourceIsList && !targetIsList) return mergeMaps(sourceBody, targetBody);

	return targetBody.trim();
}

// ---------- formatting helpers ----------

const PINNED_TOP_BLOCKS = new Set(['colors']);

/**
 * @param {string} name
 * @param {string} body
 * @returns {string}
 */
function renderBlock(name, body) {
	const formattedBody = isTopLevelList(body) ? `  ${parseListBody(body).join(', ')}` : formatMapBody(body);

	return `\n$${name}: (\n${formattedBody}\n);\n`;
}

// ---------- high-level merge pipeline ----------

/**
 * Merge all maps/lists from source SCSS into target SCSS content.
 * - Updates existing maps in place
 * - Inserts new ones in the right place
 *
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 * @returns {void}
 */
function mergeScssMapsAndLists(sourceFilePath, targetFilePath) {
	const sourceScss = fs.readFileSync(sourceFilePath, 'utf8');
	const targetScss = fs.readFileSync(targetFilePath, 'utf8');

	const sourceBlocks = findScssMapsAndLists(sourceScss);
	const targetBlocks = findScssMapsAndLists(targetScss);

	const targetBlockByName = new Map(targetBlocks.map((block) => [block.name, block]));

	const newBlocks = [];
	const blockUpdates = [];

	for (const sourceBlock of sourceBlocks) {
		const targetBlock = targetBlockByName.get(sourceBlock.name);

		if (!targetBlock) {
			newBlocks.push(sourceBlock);
			continue;
		}

		let mergedBody = mergeBodies(sourceBlock.body, targetBlock.body);

		if (!isTopLevelList(mergedBody) && shouldSortMap(sourceBlock.name)) {
			mergedBody = sortMapBody(mergedBody);
		}

		if (mergedBody.trim() !== targetBlock.body.trim()) {
			blockUpdates.push({ name: sourceBlock.name, mergedBody, targetBlock });
		}
	}

	let updatedScss = targetScss;

	blockUpdates
		.sort((a, b) => b.targetBlock.start - a.targetBlock.start)
		.forEach(({ mergedBody, targetBlock }) => {
			const replacement = `$${targetBlock.name}: (\n${mergedBody}\n);`;
			updatedScss = updatedScss.slice(0, targetBlock.start) + replacement + updatedScss.slice(targetBlock.end);
		});

	const generatedHeader = `/* ==========================================================================*
 * Generated maps/lists
 *===========================================================================*/\n`;

	for (const pinnedBlockName of PINNED_TOP_BLOCKS) {
		const index = newBlocks.findIndex((block) => block.name === pinnedBlockName);

		if (index !== -1) {
			const block = newBlocks.splice(index, 1)[0];
			updatedScss = `${generatedHeader}${renderBlock(block.name, block.body)}\n${updatedScss}`;
		}
	}

	const insertionAnchor = updatedScss.indexOf('// Theme Configuration');
	const insertionContent = newBlocks.map((block) => renderBlock(block.name, block.body)).join('');

	if (insertionContent) {
		if (insertionAnchor !== -1) {
			updatedScss = `${updatedScss.slice(0, insertionAnchor)}${insertionContent}${updatedScss.slice(insertionAnchor)}`;
		} else {
			updatedScss = `${updatedScss}\n${insertionContent}`;
		}
	}

	fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
	fs.writeFileSync(targetFilePath, updatedScss, 'utf8');
	console.log(`SCSS maps and lists have been merged from ${sourceFilePath} to ${targetFilePath}.`);
}

/**
 * @param {{
 *   sourceFile?: string,
 *   targetFile?: string
 * }} [options]
 * @returns {void}
 */
function main(options = {}) {
	const sourceFilePath = options.sourceFile || './resources/lib/figma/figma-output.scss';
	const targetFilePath = options.targetFile || './resources/scss/_2-themes/_tokens.scss';

	mergeScssMapsAndLists(sourceFilePath, targetFilePath);
}

if (require.main === module) {
	main();
}

module.exports = {
	isTopLevelList,
	splitTopLevel,
	splitTopLevelOnce,
	findMatchingParen,
	findScssMapsAndLists,
	parseListBody,
	parseMapBody,
	formatMapBody,
	mergeLists,
	mergeMaps,
	shouldSortMap,
	sortMapBody,
	mergeBodies,
	renderBlock,
	mergeScssMapsAndLists,
	main,
};
