const postcssPresetEnv = require('postcss-preset-env');
const postcssCustomMedia = require('postcss-custom-media');

// Custom plugin Generation plugins
const postcssRfs = require('./postcss-plugins/postcss-rfs/postcss-rfs.js');
const fontAwesomePlugin = require('./postcss-plugins/postcss-fontawesome-essentials/postcss-fontawesome-essentials.js');
const hoverWrap = require('./postcss-plugins/postcss-hover-wrap/postcss-hover-wrap.js');
const hoistGlobalLayers = require('./postcss-plugins/postcss-hoist-global-layers/postcss-hoist-global-layers.js');
const mergeTopLayers = require('./postcss-plugins/postcss-merge-top-layers/postcss-merge-top-layers.js');
const mergeNestedLayers = require('./postcss-plugins/postcss-merge-nested-layers/postcss-merge-nested-layers.js');

module.exports = {
	plugins: [
		postcssCustomMedia(),
		fontAwesomePlugin({
			scssVariablesPath: './resources/lib/fonts/fontawesome/_variables.scss',
			generateSubsets: true,
			fontsRoot: './resources/lib/fonts/fontawesome',
			outDir: './.vite-fonts',
			scopeFilenamesByEntry: true,
			formats: ['woff2'],
			logger: (msg) => console.log(msg),
		}),
		postcssRfs({
			functionName: 'fs', // fs() -> rem clamp(...)
			pxFunctionNames: ['size'], // size() -> px clamp(...)
			baseValue: 20,
			factor: 2, // global
			breakpoint: 1440,
			minBreakpoint: 420,
			unit: 'rem',
			remValue: 16,
		}),
		hoverWrap(),
		postcssPresetEnv({
			autoprefixer: {},
			stage: 3,
			features: {
				// Native :not() lists retain specificity; simple :is() lists expand
				// as a fallback. Complex cases are written explicitly in SCSS.
				'not-pseudo-class': false,
				'is-pseudo-class': true,
				'custom-properties': false,
				'nesting-rules': false,
				'cascade-layers': false,
				'nested-calc': { preserve: false },
				// Native logical properties follow the element's writing direction.
				'logical-properties-and-values': true,
			},
		}),
		hoistGlobalLayers(),
		mergeTopLayers(),
		mergeNestedLayers(),
		// Keep media and selector rules in source order. Cross-rule merging can
		// change the cascade and make selectors harder to safelist in WP Rocket.
	],
};

// Keep keyframes: other CSS entries, runtime styles and CSS variables can
// reference animations that an entry-local unused-keyframe pass cannot see.
