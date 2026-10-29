const fs = require('fs');
const path = require('path');

// ---------- low-level parsing helpers ----------

/**
 * @param {string} s
 * @param {number} index
 * @returns {boolean}
 */
function isEscaped(s, index) {
	let backslashes = 0;
	let i = index - 1;

	while (i >= 0 && s[i] === '\\') {
		backslashes++;
		i--;
	}

	return backslashes % 2 === 1;
}

/**
 * Remove block and line comments from SCSS content.
 *
 * @param {string} s
 * @returns {string}
 */
function stripComments(s) {
	let out = s.replace(/\/\*[\s\S]*?\*\//g, '');

	out = out
		.split('\n')
		.map((line) => {
			let inSingle = false;
			let inDouble = false;

			for (let i = 0; i < line.length; i++) {
				const c = line[i];

				if (c === "'" && !inDouble && !isEscaped(line, i)) {
					inSingle = !inSingle;
					continue;
				}

				if (c === '"' && !inSingle && !isEscaped(line, i)) {
					inDouble = !inDouble;
					continue;
				}

				if (!inSingle && !inDouble && c === '/' && line[i + 1] === '/') {
					return line.slice(0, i);
				}
			}

			return line;
		})
		.join('\n');

	return out;
}

/**
 * Find the matching closing parenthesis starting from an opening '('.
 * Honors quotes and nested parentheses.
 *
 * @param {string} s
 * @param {number} startIdx
 * @returns {number}
 */
function findMatchingParen(s, startIdx) {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;

	for (let i = startIdx; i < s.length; i++) {
		const c = s[i];

		if (c === "'" && !inDouble && !isEscaped(s, i)) {
			inSingle = !inSingle;
			continue;
		}

		if (c === '"' && !inSingle && !isEscaped(s, i)) {
			inDouble = !inDouble;
			continue;
		}

		if (inSingle || inDouble) continue;

		if (c === '(') depth++;
		else if (c === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}

	return -1;
}

/**
 * Split a string on a delimiter only at top level.
 *
 * @param {string} s
 * @param {string} delimChar
 * @returns {string[]}
 */
function splitTopLevel(s, delimChar) {
	const parts = [];
	let buf = '';
	let inSingle = false;
	let inDouble = false;
	let depth = 0;

	for (let i = 0; i < s.length; i++) {
		const c = s[i];

		if (c === "'" && !inDouble && !isEscaped(s, i)) {
			inSingle = !inSingle;
			buf += c;
			continue;
		}

		if (c === '"' && !inSingle && !isEscaped(s, i)) {
			inDouble = !inDouble;
			buf += c;
			continue;
		}

		if (!inSingle && !inDouble) {
			if (c === '(') {
				depth++;
			} else if (c === ')') {
				depth = Math.max(0, depth - 1);
			} else if (c === delimChar && depth === 0) {
				const chunk = buf.trim();
				if (chunk) parts.push(chunk);
				buf = '';
				continue;
			}
		}

		buf += c;
	}

	if (buf.trim()) parts.push(buf.trim());
	return parts;
}

/**
 * Split once at the first top-level delimiter.
 *
 * @param {string} s
 * @param {string} delimChar
 * @returns {[string, string]}
 */
function splitTopLevelOnce(s, delimChar) {
	let inSingle = false;
	let inDouble = false;
	let depth = 0;

	for (let i = 0; i < s.length; i++) {
		const c = s[i];

		if (c === "'" && !inDouble && !isEscaped(s, i)) {
			inSingle = !inSingle;
			continue;
		}

		if (c === '"' && !inSingle && !isEscaped(s, i)) {
			inDouble = !inDouble;
			continue;
		}

		if (!inSingle && !inDouble) {
			if (c === '(') {
				depth++;
			} else if (c === ')') {
				depth = Math.max(0, depth - 1);
			} else if (c === delimChar && depth === 0) {
				return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
			}
		}
	}

	return [s.trim(), ''];
}

/**
 * Returns true if the body is a top-level list, false if it is a map.
 *
 * @param {string} body
 * @returns {boolean}
 */
function isTopLevelList(body) {
	let inSingle = false;
	let inDouble = false;
	let depth = 0;

	for (let i = 0; i < body.length; i++) {
		const c = body[i];

		if (c === "'" && !inDouble && !isEscaped(body, i)) {
			inSingle = !inSingle;
			continue;
		}

		if (c === '"' && !inSingle && !isEscaped(body, i)) {
			inDouble = !inDouble;
			continue;
		}

		if (!inSingle && !inDouble) {
			if (c === '(') depth++;
			else if (c === ')') depth = Math.max(0, depth - 1);
			else if (c === ':' && depth === 0) return false;
		}
	}

	return true;
}

/**
 * @param {string} s
 * @returns {string}
 */
function stripQuotes(s) {
	const v = String(s).trim();
	if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
		return v.slice(1, -1);
	}
	return v;
}

// ---------- unit helper normalization ----------

/**
 * Replace size()/rem() wrappers with px values.
 *
 * @param {string} s
 * @returns {string}
 */
function unwrapUnitHelpers(s) {
	let out = s;

	out = out.replace(/size\(\s*[^,()]*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g, (_m, n) => `${n}px`);
	out = out.replace(/fs\(\s*[^,()]*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g, (_m, n) => `${n}px`);
	out = out.replace(/em\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*[^,()]*\s*\)/g, (_match, first) => `${first}px`);
	out = out.replace(/size\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g, (_m, n) => `${n}px`);
	out = out.replace(/fs\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g, (_m, n) => `${n}px`);
	out = out.replace(/rem\(\s*([0-9]+(?:\.[0-9]+)?)\s*\)/g, (_m, n) => `${n}px`);
	out = out.replace(/#\{\s*([0-9]+(?:\.[0-9]+)?px)\s*\}/g, (_m, n) => n);

	return out;
}

// ---------- SCSS map extraction ----------

/**
 * Extract SCSS maps of the form `$name: ( ... );`
 *
 * @param {string} fileContent
 * @returns {Map<string, string>}
 */
function extractScssMaps(fileContent) {
	const src = stripComments(fileContent);
	const maps = new Map();

	const pattern = /\$([a-zA-Z0-9_-]+)\s*:\s*\(/g;
	let match;

	while ((match = pattern.exec(src)) !== null) {
		const mapName = match[1];
		const startOfParen = src.indexOf('(', match.index + match[0].length - 1);
		if (startOfParen === -1) continue;

		const endParen = findMatchingParen(src, startOfParen);
		if (endParen === -1) continue;

		let inner = src.slice(startOfParen + 1, endParen).trim();
		inner = unwrapUnitHelpers(inner);

		maps.set(mapName, inner);
		pattern.lastIndex = endParen + 1;
	}

	return maps;
}

// ---------- SCSS output ----------

/**
 * @param {string} mapBody
 * @returns {string}
 */
function formatScssMapBody(mapBody) {
	const items = splitTopLevel(mapBody, ',')
		.map((x) => x.trim())
		.filter(Boolean);

	return items
		.map((item) => {
			const clean = item.replace(/,\s*$/, '');
			return `  ${clean},`;
		})
		.join('\n');
}

/**
 * @param {Map<string, string>} maps
 * @param {string} targetFile
 * @returns {void}
 */
function writeScssMapsToFile(maps, targetFile) {
	let output = `@use 'sass:map';\n@use '@lib/functions' as *;\n\n`;

	maps.forEach((mapBody, mapName) => {
		output += `$${mapName}: (\n${formatScssMapBody(mapBody)}\n);\n\n`;
	});

	fs.mkdirSync(path.dirname(targetFile), { recursive: true });
	fs.writeFileSync(targetFile, output, 'utf8');
	console.log(`SCSS maps have been written to ${targetFile}.`);
}

// ---------- JSON output ----------

/**
 * Parse a single map body into either:
 * - an object if top-level key/value pairs exist
 * - an array otherwise
 *
 * @param {string} mapBody
 * @returns {Record<string, string> | string[]}
 */
function parseMapBodyToJson(mapBody) {
	const entries = splitTopLevel(mapBody, ',')
		.map((entry) => entry.trim())
		.filter(Boolean);

	if (entries.length === 0) return {};

	const hasKeyValue = entries.some((entry) => {
		const [, value] = splitTopLevelOnce(entry, ':');
		return Boolean(value);
	});

	if (!hasKeyValue) {
		return entries;
	}

	const obj = {};

	for (const entry of entries) {
		const [rawKey, rawValue] = splitTopLevelOnce(entry, ':');
		if (!rawKey || !rawValue) continue;

		const key = stripQuotes(rawKey);
		obj[key] = unwrapUnitHelpers(rawValue.trim());
	}

	return obj;
}

/**
 * @param {Map<string, string>} maps
 * @param {string} targetFile
 * @returns {void}
 */
function writeScssMapsToJson(maps, targetFile) {
	const jsonObject = {};

	maps.forEach((mapBody, mapName) => {
		jsonObject[mapName] = parseMapBodyToJson(mapBody);
	});

	fs.mkdirSync(path.dirname(targetFile), { recursive: true });
	fs.writeFileSync(targetFile, JSON.stringify(jsonObject, null, 2), 'utf8');
	console.log(`JSON file has been generated at ${targetFile}.`);
}

// ---------- main pipeline ----------

/**
 * @param {string} sourceFile
 * @param {string} scssTargetFile
 * @param {string} jsonTargetFile
 * @returns {void}
 */
function copyScssMaps(sourceFile, scssTargetFile, jsonTargetFile) {
	const sourceContent = fs.readFileSync(sourceFile, 'utf8');
	const scssMaps = extractScssMaps(sourceContent);

	writeScssMapsToFile(scssMaps, scssTargetFile);
	writeScssMapsToJson(scssMaps, jsonTargetFile);
}

/**
 * @param {{
 *   sourceFile?: string,
 *   scssTargetFile?: string,
 *   jsonTargetFile?: string
 * }} [options]
 * @returns {void}
 */
function main(options = {}) {
	const sourceFile = path.resolve(options.sourceFile || './resources/scss/_1-lib/_tokens.scss');
	const scssTargetFile = path.resolve(options.scssTargetFile || './resources/lib/intellisense/_intellisense-maps.scss');
	const jsonTargetFile = path.resolve(options.jsonTargetFile || './resources/lib/intellisense/_intellisense-maps.json');

	copyScssMaps(sourceFile, scssTargetFile, jsonTargetFile);
}

if (require.main === module) {
	main();
}

module.exports = {
	stripComments,
	findMatchingParen,
	splitTopLevel,
	splitTopLevelOnce,
	isTopLevelList,
	unwrapUnitHelpers,
	extractScssMaps,
	formatScssMapBody,
	parseMapBodyToJson,
	writeScssMapsToFile,
	writeScssMapsToJson,
	copyScssMaps,
	main,
};
