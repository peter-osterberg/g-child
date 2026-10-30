const { main: buildFigmaScss } = require('./build-figma-scss');
const { main: mergeScssMapsAndLists } = require('./merge-figma-vars');

/**
 * Run a named step with simple logging.
 *
 * @param {string} stepName
 * @param {() => void | Promise<void>} run
 * @returns {Promise<void>}
 */
async function runStep(stepName, run) {
	console.log(`Running ${stepName}...`);
	await run();
	console.log(`Finished ${stepName}`);
}

/**
 * Executes the Figma build pipeline in sequence.
 *
 * @returns {Promise<void>}
 */
async function runFigmaPipeline() {
	try {
		await runStep('build-figma-scss', () =>
			buildFigmaScss({
				inputPath: './resources/lib/figma/variables.json',
				outputPath: './resources/lib/figma/figma-output.scss',
				useDesktopMobileDualSize: false,
				desktopModeName: 'Desktop',
				mobileModeName: 'Mobile',
			}),
		);

		await runStep('merge-scss-maps-and-lists', () =>
			mergeScssMapsAndLists({
				sourceFile: './resources/lib/figma/figma-output.scss',
				targetFile: './resources/scss/_2-themes/_tokens.scss',
			}),
		);
	} catch (error) {
		console.error('Error running Figma pipeline:', error);
		process.exitCode = 1;
	}
}

if (require.main === module) {
	runFigmaPipeline();
}

module.exports = {
	runFigmaPipeline,
};
