const valueParser = require('postcss-value-parser');

const defaultOptions = Object.freeze({
	baseValue: 20,
	unit: 'rem', // 'rem' | 'px'
	breakpoint: 1440, // px or rem, normalized to px
	minBreakpoint: 480, // px or rem, normalized to px
	factor: 4,
	unitPrecision: 5,
	remValue: 16,
	functionName: 'rfs',
	pxFunctionNames: [],
	enableRfs: true,
	mode: 'clamp', // 'clamp' | 'raw'
	vwUnit: 'vw', // 'vw' | 'svw' | 'lvw' | 'dvw'
});

const EPS = Number.EPSILON * 8;
const LENGTH_RE = /^([+-]?\d*\.?\d+)\s*(px|rem)?$/i;
const VW_UNIT_RE = /^(vw|svw|lvw|dvw)$/;
const MODE_RE = /^(clamp|raw)$/;

/** @typedef {{ value: number, unit: 'px'|'rem' }} Length */

/**
 * @typedef {object} NormalizedOptions
 * @property {number} baseValue Base size threshold before responsive scaling starts.
 * @property {'rem'|'px'} unit Output unit used when formatting responsive values.
 * @property {number} breakpoint Viewport breakpoint used to compute scaling.
 * @property {number} minBreakpoint Minimum viewport breakpoint allowed for scaling.
 * @property {number} factor Divisor used to reduce the responsive delta.
 * @property {number} unitPrecision Decimal precision used when formatting lengths.
 * @property {number} remValue Root font size used when converting between `rem` and `px`.
 * @property {string} functionName Primary function name handled by the plugin.
 * @property {string[]} pxFunctionNames Alternate function names that force `px` output.
 * @property {boolean} enableRfs Whether responsive scaling is enabled at all.
 * @property {'clamp'|'raw'} mode Output mode used when rendering responsive values.
 * @property {'vw'|'svw'|'lvw'|'dvw'} vwUnit Viewport unit used in the responsive expression.
 * @property {Set<string>} functionNames Set of function names handled by the parser.
 * @property {Set<string>} pxFunctionNameSet Set of alternate function names that force `px` output.
 */

/* ------------------------ Generic helpers ------------------------ */

/**
 * @param {unknown} value
 * @returns {string}
 */
function toTrimmedString(value) {
	return String(value ?? '').trim();
}

/**
 * Stable fixed precision without preserving trailing zeros.
 *
 * @param {number} n
 * @param {number} precision
 * @returns {number}
 */
function toFixedNumber(n, precision) {
	const m = 10 ** precision;
	return Math.round((n + Number.EPSILON) * m) / m;
}

/**
 * @param {string|number} raw
 * @returns {Length}
 */
function parseLength(raw) {
	const input = toTrimmedString(raw);
	const match = input.match(LENGTH_RE);

	if (!match) {
		if (/calc|var\(|[a-z]+\(/i.test(input)) {
			throw new Error(`rfs(): only literal px/rem values are supported (got "${raw}")`);
		}
		throw new Error(`rfs(): expected a number, px, or rem (got "${raw}")`);
	}

	return {
		value: Number.parseFloat(match[1]),
		unit: /** @type {'px'|'rem'} */ ((match[2] || 'px').toLowerCase()),
	};
}

/**
 * @param {Length} len
 * @param {{ remValue: number }} opts
 * @returns {number}
 */
function toPx(len, opts) {
	return len.unit === 'rem' ? len.value * opts.remValue : len.value;
}

/**
 * @param {number} px
 * @param {{ unit: 'px'|'rem', remValue: number, unitPrecision: number }} opts
 * @returns {string}
 */
function formatPx(px, opts) {
	if (opts.unit === 'rem') {
		return `${toFixedNumber(px / opts.remValue, opts.unitPrecision)}rem`;
	}
	return `${toFixedNumber(px, opts.unitPrecision)}px`;
}

/* ------------------------ rfs() arg parsing ------------------------ */

/**
 * Parses the inner contents of rfs(...) into 1 or 2 top-level comma-separated args.
 *
 * @param {string} input
 * @returns {string[]}
 */
function parseRfsArgs(input) {
	const parsed = valueParser(`rfs(${input})`);
	const fn = parsed.nodes && parsed.nodes[0];

	if (!fn || fn.type !== 'function' || !Array.isArray(fn.nodes)) {
		throw new Error(`Invalid rfs() syntax: rfs(${input})`);
	}

	/** @type {string[]} */
	const args = [];
	let current = '';

	for (const node of fn.nodes) {
		if (node.type === 'div' && node.value === ',') {
			if (current.trim()) args.push(current.trim());
			current = '';
			continue;
		}
		current += valueParser.stringify(node);
	}

	if (current.trim()) args.push(current.trim());

	if (args.length === 0 || args.length > 2) {
		throw new Error(`Invalid rfs() syntax: rfs(${input})`);
	}

	return args;
}

/**
 * @param {string} input
 * @param {{ remValue: number }} opts
 * @returns {{ minPx: number | null, maxPx: number }}
 */
function parseRfsRange(input, opts) {
	const args = parseRfsArgs(input);

	if (args.length === 1) {
		const maxLen = parseLength(args[0]);
		return { minPx: null, maxPx: toPx(maxLen, opts) };
	}

	const minLen = parseLength(args[0]);
	const maxLen = parseLength(args[1]);

	return {
		minPx: toPx(minLen, opts),
		maxPx: toPx(maxLen, opts),
	};
}

/* ------------------------ rendering ------------------------ */

/**
 * @param {number} valuePx
 * @param {{ unit: 'px'|'rem', remValue: number, unitPrecision: number }} opts
 * @returns {string}
 */
function renderValue(valuePx, opts) {
	if (!Number.isFinite(valuePx)) return String(valuePx);
	return formatPx(valuePx, opts);
}

/**
 * Generates a responsive clamp() value from an `rfs(a[, b])` call.
 *
 * @param {string} input
 * @param {NormalizedOptions} opts
 * @returns {string}
 */
function rfsClampValue(input, opts) {
	let { minPx, maxPx } = parseRfsRange(input, opts);

	const maxVW = opts.breakpoint;
	const minVW = opts.minBreakpoint;

	if (!(Number.isFinite(minVW) && Number.isFinite(maxVW))) {
		throw new Error('rfs(): invalid breakpoints');
	}
	if (minVW + EPS >= maxVW) {
		throw new Error(`rfs(): minBreakpoint (${minVW}) must be < breakpoint (${maxVW})`);
	}
	if (opts.remValue <= 0) {
		throw new Error('rfs(): remValue must be > 0');
	}

	if (minPx == null && maxPx <= opts.remValue + EPS) {
		return formatPx(maxPx, opts);
	}

	if (minPx == null && maxPx <= opts.baseValue + EPS) {
		return formatPx(maxPx, opts);
	}

	if (minPx == null) {
		minPx = opts.baseValue + (maxPx - opts.baseValue) / opts.factor;
	}

	if (minPx > maxPx + EPS) {
		return formatPx(maxPx, opts);
	}

	if (Math.abs(maxPx - minPx) <= EPS) {
		return formatPx(maxPx, opts);
	}

	const slopePxPerVW = (maxPx - minPx) / (maxVW - minVW);
	const slopeVW = slopePxPerVW * 100;
	const interceptPx = maxPx - slopePxPerVW * maxVW;

	const min = formatPx(slopePxPerVW * minVW + interceptPx, opts);
	const intercept = formatPx(interceptPx, opts);
	const max = formatPx(maxPx, opts);
	const slope = toFixedNumber(slopeVW, opts.unitPrecision);

	if (Math.abs(slope) <= EPS) {
		return max;
	}

	return `clamp(${min}, (${intercept} + ${slope}${opts.vwUnit}), ${max})`;
}

/**
 * @param {string} input
 * @param {NormalizedOptions} opts
 * @returns {string}
 */
function rfsRawValue(input, opts) {
	const { maxPx } = parseRfsRange(input, opts);
	return renderValue(maxPx, opts);
}

/* ------------------------ declaration processing ------------------------ */

/**
 * @param {string} value
 * @param {NormalizedOptions} opts
 * @returns {string}
 */
function processRfsValue(value, opts) {
	if (!opts.enableRfs) return value;

	const parsed = valueParser(value);
	const memo = new Map();

	parsed.walk((node) => {
		if (node.type !== 'function') return;

		const fnName = node.value;
		if (!opts.functionNames.has(fnName)) return;

		const inner = valueParser.stringify(node.nodes).trim();
		const isPxFn = opts.pxFunctionNameSet.has(fnName);
		const localOpts = isPxFn ? { ...opts, unit: 'px' } : opts;

		const key = `${fnName}|${localOpts.unit}|${localOpts.mode}|${inner}`;
		let output = memo.get(key);

		if (!output) {
			output = localOpts.mode === 'clamp' ? rfsClampValue(inner, localOpts) : rfsRawValue(inner, localOpts);
			memo.set(key, output);
		}

		node.type = 'word';
		node.value = output;
	});

	return parsed.toString();
}

/* ------------------------ options ------------------------ */

/**
 * @param {unknown} value
 * @param {string} name
 * @param {{ remValue: number }} opts
 * @returns {number}
 */
function parseOptionLength(value, name, opts) {
	if (typeof value === 'number') return value;

	const input = toTrimmedString(value);
	const match = input.match(LENGTH_RE);

	if (!match) {
		throw new Error(`postcss-rfs: expected number/px/rem for option "${name}", got "${value}"`);
	}

	const num = Number.parseFloat(match[1]);
	const unit = (match[2] || 'px').toLowerCase();

	return unit === 'rem' ? num * opts.remValue : num;
}

/**
 * @param {object} userOptions
 * @returns {NormalizedOptions}
 */
function normalizeOptions(userOptions) {
	const opts = { ...defaultOptions, ...userOptions };

	if (!(opts.remValue > 0)) {
		throw new Error('postcss-rfs: remValue must be > 0');
	}

	if (!(opts.factor > 0)) {
		throw new Error('postcss-rfs: factor must be > 0');
	}

	if (!(Number.isInteger(opts.unitPrecision) && opts.unitPrecision >= 0)) {
		throw new Error('postcss-rfs: unitPrecision must be a non-negative integer');
	}

	if (!VW_UNIT_RE.test(opts.vwUnit)) {
		throw new Error('postcss-rfs: vwUnit must be one of "vw", "svw", "lvw", "dvw"');
	}

	if (!MODE_RE.test(opts.mode)) {
		throw new Error('postcss-rfs: mode must be "clamp" or "raw"');
	}

	if (opts.unit !== 'px' && opts.unit !== 'rem') {
		throw new Error('postcss-rfs: unit must be "px" or "rem"');
	}

	const functionName = toTrimmedString(opts.functionName) || 'rfs';
	const pxFunctionNames = Array.from(
		new Set((opts.pxFunctionNames || []).map((name) => toTrimmedString(name)).filter(Boolean)),
	);

	const normalized = {
		...opts,
		functionName,
		pxFunctionNames,
		baseValue: parseOptionLength(opts.baseValue, 'baseValue', opts),
		breakpoint: parseOptionLength(opts.breakpoint, 'breakpoint', opts),
		minBreakpoint: parseOptionLength(opts.minBreakpoint, 'minBreakpoint', opts),
		functionNames: new Set([functionName, ...pxFunctionNames]),
		pxFunctionNameSet: new Set(pxFunctionNames),
	};

	if (!(normalized.minBreakpoint < normalized.breakpoint)) {
		throw new Error(
			`postcss-rfs: minBreakpoint (${normalized.minBreakpoint}) must be < breakpoint (${normalized.breakpoint})`,
		);
	}

	return /** @type {NormalizedOptions} */ (normalized);
}

/* ------------------------ plugin ------------------------ */

/**
 * PostCSS plugin for responsive font sizing.
 *
 * @param {object} userOptions
 * @returns {object}
 */
function postcssRfs(userOptions = {}) {
	const opts = normalizeOptions(userOptions);

	return {
		postcssPlugin: 'postcss-rfs',

		/**
		 * @param {import('postcss').Root} css
		 */
		Once(css) {
			if (!opts.enableRfs) return;

			css.walkDecls((decl) => {
				if (!decl.value) return;

				const hasCandidate = Array.from(opts.functionNames).some((name) => decl.value.includes(`${name}(`));
				if (!hasCandidate) return;

				try {
					decl.value = processRfsValue(decl.value, opts);
				} catch (error) {
					const where =
						decl.source && decl.source.start ? ` (${decl.source.start.line}:${decl.source.start.column})` : '';

					const message = error && typeof error === 'object' && 'message' in error ? error.message : String(error);

					throw new Error(`postcss-rfs${where}: ${message}`, { cause: error });
				}
			});
		},
	};
}

postcssRfs.postcss = true;
module.exports = postcssRfs;
