const escapeRegex = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'nav', 'xl', 'xxl'];

const mixinInclude = (name) => ({
	type: 'at-rule',
	name: 'include',
	parameter: new RegExp(`^${escapeRegex(name)}(?:\\(|$)`),
});

const mediaQuery = (parameter) => ({
	type: 'at-rule',
	name: 'media',
	parameter,
	hasBlock: true,
});

const breakpointPattern = breakpointOrder.map(escapeRegex).join('|');
const baseCustomMediaNames = [
	'motion-ok',
	'motion-not-ok',
	'opacity-ok',
	'opacity-not-ok',
	'use-data-ok',
	'use-data-not-ok',
	'os-dark',
	'os-light',
	'high-contrast',
	'low-contrast',
	'inverted-colors',
	'forced-colors',
	'portrait',
	'landscape',
	'hd-color',
];
const interactionCustomMediaNames = ['mouse', 'touch', 'stylus', 'pointer'];
const baseCustomMediaWrappers = baseCustomMediaNames.map((name) =>
	mediaQuery(new RegExp(`^\\(--${escapeRegex(name)}\\)$`)),
);
const interactionCustomMediaWrappers = interactionCustomMediaNames.map((name) =>
	mediaQuery(new RegExp(`^\\(--${escapeRegex(name)}\\)$`)),
);
const customMediaBreakpointFamilies = breakpointOrder.flatMap((name) => [
	mediaQuery(new RegExp(`^\\(--${escapeRegex(name)}-up\\)$`)),
	mediaQuery(new RegExp(`^\\(--${escapeRegex(name)}-only\\)$`)),
	mediaQuery(new RegExp(`^\\(--${escapeRegex(name)}-phone\\)$`)),
]);
const customMediaDownFamilies = [...breakpointOrder]
	.reverse()
	.map((name) => mediaQuery(new RegExp(`^\\(--${escapeRegex(name)}-down\\)$`)));
const reservedCustomMediaPattern = [
	...baseCustomMediaNames,
	...interactionCustomMediaNames,
].map(escapeRegex).join('|');
const otherCustomMediaWrappers = mediaQuery(
	new RegExp(
		`^\\(--(?!(?:${breakpointPattern})-(?:up|down|only|phone)\\)$)(?!(?:${reservedCustomMediaPattern})\\)$)[a-z0-9-]+\\)$`,
	),
);

const orderedMixinIncludes = [
	// Button family
	'btn',
	'btn-variant',
	'btn-color',
	'btn-size',
	'btn-block',
	'btn-icon-only',
	'btn-square',
	'btn-round',
	'btn-icon',
	'btn-icon-start',
	'btn-icon-end',

	// Card family
	'card',
	'card-size',
	'card-outlined',
	'card-elevation',
	'floating-card',
	'card-dropdown',

	// Content card family
	'content-card',
	'content-card-interaction',
	'content-card-frame',
	'content-card-media',
	'content-card-body',
	'content-card-title-link',

	// Choice control family
	'choice-control-vars',
	'choice-control-base',
	'choice-control-state-hover',
	'choice-control-state-focus',
	'choice-control-state-checked',
	'choice-control-state-checked-focus',
	'choice-control-state-disabled',
].map(mixinInclude);

const nestedRuleOrder = [
	// 1. BEM elements
	{
		type: 'rule',
		selector: /&__/,
		hasBlock: true,
	},

	// 2. BEM modifiers
	{
		type: 'rule',
		selector: /&--/,
		hasBlock: true,
	},

	// 3. Variant classes (&-large etc)
	{
		type: 'rule',
		selector: /&-[a-z]/,
		hasBlock: true,
	},

	// 4. State helpers
	{
		type: 'rule',
		selector: /&\.(is-|has-)/,
		hasBlock: true,
	},

	// 5. LVFHA pseudo classes
	{ type: 'rule', selector: /:link\b/, hasBlock: true },
	{ type: 'rule', selector: /:visited\b/, hasBlock: true },
	{ type: 'rule', selector: /:focus-visible\b/, hasBlock: true },
	{ type: 'rule', selector: /:focus(?!-visible)\b/, hasBlock: true },
	{ type: 'rule', selector: /:hover\b/, hasBlock: true },
	{ type: 'rule', selector: /:active\b/, hasBlock: true },

	// 6. Structural pseudo classes
	{
		type: 'rule',
		selector: /:(first-child|last-child|first-of-type|last-of-type)/,
		hasBlock: true,
	},

	// 7. Functional pseudos
	{
		type: 'rule',
		selector: /:(where|is|not|has)/,
		hasBlock: true,
	},

	// 8. Attribute selectors
	{
		type: 'rule',
		selector: /&\[.+\]/,
		hasBlock: true,
	},

	// 9. Nested classes
	{
		type: 'rule',
		selector: /&\.[\w-]+/,
		hasBlock: true,
	},

	// 10. Combinators / descendants
	{
		type: 'rule',
		selector: /&\s+[>+~]/,
		hasBlock: true,
	},
	{
		type: 'rule',
		selector: /&\s+/,
		hasBlock: true,
	},

	// 11. Pseudo elements
	{
		type: 'rule',
		selector: /::before/,
		hasBlock: true,
	},
	{
		type: 'rule',
		selector: /::after/,
		hasBlock: true,
	},
	{
		type: 'rule',
		selector: /::/,
		hasBlock: true,
	},
];

const orderRules = [
	// SCSS module system
	{ type: 'at-rule', name: 'import' },
	{ type: 'at-rule', name: 'forward' },
	{ type: 'at-rule', name: 'use' },

	// Variables / tokens
	'dollar-variables',
	'at-variables',
	'custom-properties',
	{ type: 'at-rule', name: 'custom-media' },

	// Functions / mixins
	{ type: 'at-rule', name: 'function' },
	{ type: 'at-rule', name: 'mixin' },
	{ type: 'at-rule', name: 'extend' },

	// Inline includes behaving like declarations
	...orderedMixinIncludes,
	{ type: 'at-rule', name: 'include' },

	// Base declarations
	'declarations',
	...baseCustomMediaWrappers,

	// Nested selectors
	...nestedRuleOrder,

	// Block includes / query wrappers
	{ type: 'at-rule', name: 'include', hasBlock: true },
	...interactionCustomMediaWrappers,
	otherCustomMediaWrappers,
	...customMediaBreakpointFamilies,
	...customMediaDownFamilies,
	{ type: 'at-rule', name: 'media', hasBlock: true },
	{ type: 'at-rule', name: 'container', hasBlock: true },
	{ type: 'at-rule', name: 'supports', hasBlock: true },
];

module.exports = {
	customSyntax: 'postcss-scss',
	extends: ['stylelint-config-standard-scss', '@stylistic/stylelint-config', 'stylelint-config-recess-order'],
	plugins: ['stylelint-declaration-block-no-ignored-properties', 'stylelint-order'],
	rules: {
		// Plugins
		'plugin/declaration-block-no-ignored-properties': true,
		'order/custom-properties-alphabetical-order': [true, { severity: 'warning' }],

		// Core relaxations / tweaks
		'block-no-redundant-nested-style-rules': null,
		'value-no-vendor-prefix': null,
		'property-no-vendor-prefix': null,

		// Slightly softer for SCSS partials / placeholders
		'block-no-empty': [true, { severity: 'warning' }],

		// Variables & custom properties
		'custom-media-pattern': [
			'^(?:[a-z][a-z0-9]*|#\\{\\$[a-z0-9-]+\\})(?:-(?:[a-z0-9]+|#\\{\\$[a-z0-9-]+\\}))*$',
			{
				message: (name) =>
					`Expected custom media query name "${name}" to be kebab-case or use SCSS interpolation safely`,
			},
		],
		'custom-property-pattern': '_?[a-z0-9-]+',
		'scss/dollar-variable-colon-space-after': 'at-least-one-space',
		'scss/map-keys-quotes': 'always',

		// Empty lines / vertical rhythm
		'declaration-empty-line-before': [
			'always',
			{
				except: ['first-nested', 'after-declaration', 'after-comment'],
			},
		],
		'at-rule-empty-line-before': [
			'always',
			{
				ignore: ['first-nested', 'blockless-after-same-name-blockless', 'after-comment'],
				ignoreAtRules: ['else'],
			},
		],
		'custom-property-empty-line-before': [
			'always',
			{
				except: ['first-nested', 'after-custom-property', 'after-comment'],
			},
		],

		// Formatting-lite
		'@stylistic/at-rule-name-space-after': 'always',
		'@stylistic/at-rule-semicolon-space-before': 'never',

		'@stylistic/declaration-bang-space-after': 'never',
		'@stylistic/declaration-bang-space-before': 'always',
		'@stylistic/declaration-colon-space-after': 'always-single-line',
		'@stylistic/declaration-colon-space-before': 'never',

		'@stylistic/function-comma-space-after': 'always-single-line',
		'@stylistic/function-comma-space-before': 'never',

		'@stylistic/selector-list-comma-space-after': 'always-single-line',
		'@stylistic/selector-list-comma-space-before': 'never-single-line',

		'@stylistic/max-line-length': null,
		'@stylistic/value-list-comma-space-after': 'always',
		'@stylistic/value-list-comma-space-before': 'never',
		'@stylistic/value-list-comma-newline-after': 'always-multi-line',
		'@stylistic/value-list-comma-newline-before': 'never-multi-line',

		'@stylistic/string-quotes': 'single',
		'@stylistic/unicode-bom': 'never',
		'@stylistic/no-eol-whitespace': true,
		'@stylistic/no-missing-end-of-source-newline': true,
		'@stylistic/no-extra-semicolons': true,
		'@stylistic/block-closing-brace-newline-after': null,
		// Order
		'order/order': [
			orderRules,
			{
				severity: 'warning',
			},
		],
	},
};
