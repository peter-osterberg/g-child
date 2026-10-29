const globals = require('globals');
const pluginJs = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc').default;
const prettierConfig = require('eslint-config-prettier');

module.exports = [
	pluginJs.configs.recommended,
	jsdoc.configs['flat/recommended'],
	{
		ignores: ['**/dist/', '**/vendor/', 'resources/_archive/**', '.config/*'],
	},
	{
		files: ['resources/js/**/*.js', 'inc/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		files: [
			'console/**/*.js',
			'postcss-plugins/**/*.js',
			'stylelint-rules/**/*.js',
			'postcss.config.js',
			'eslint.config.js',
			'stylelint.config.js',
		],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'commonjs',
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		files: ['vite.config.mjs', 'console/**/*.mjs'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.node,
		},
	},
	{
		files: ['console/**/resources/js/**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		plugins: {
			jsdoc,
		},
		rules: {
			'jsdoc/require-jsdoc': [
				'error',
				{
					require: {
						MethodDefinition: true,
						ClassDeclaration: true,
						FunctionDeclaration: true,
						FunctionExpression: true,
					},
				},
			],
			'jsdoc/tag-lines': [
				'error',
				'any',
				{
					startLines: 1,
					tags: {
						param: {
							lines: 'never',
						},
						return: {
							lines: 'never',
						},
					},
				},
			],
			'no-unused-vars': 'warn',
			'jsdoc/require-param-description': 0,
			'jsdoc/require-returns-description': 0,
		},
	},
	prettierConfig, // Disable conflicting rules
];
