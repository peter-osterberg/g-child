const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RESOURCES_DIR = path.join(ROOT, 'resources');
const ACTIVE_JS_DIR = path.join(ROOT, 'resources/js');
const ACTIVE_SCSS_DIR = path.join(ROOT, 'resources/scss');
const ARCHIVE_DIR = path.join(ROOT, 'resources/_archive');

/**
 * @param {string} targetPath
 * @returns {boolean}
 */
function exists(targetPath) {
	return fs.existsSync(targetPath);
}

/**
 * @param {string} targetPath
 * @returns {string}
 */
function toRepoPath(targetPath) {
	return path.relative(ROOT, targetPath).split(path.sep).join('/');
}

/**
 * @param {string} dir
 * @param {(entryPath: string, dirent: fs.Dirent) => void} visitor
 * @returns {void}
 */
function walk(dir, visitor) {
	if (!exists(dir)) {
		return;
	}

	for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
		const entryPath = path.join(dir, dirent.name);
		visitor(entryPath, dirent);

		if (dirent.isDirectory()) {
			walk(entryPath, visitor);
		}
	}
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isCodeFile(filePath) {
	return filePath.endsWith('.js') || filePath.endsWith('.scss');
}

/**
 * @param {string[]} issues
 * @param {string} message
 * @returns {void}
 */
function pushIssue(issues, message) {
	issues.push(`- ${message}`);
}

/**
 * @param {string} rootDir
 * @param {string[]} issues
 * @returns {void}
 */
function checkModuleAssetRoot(rootDir, issues) {
	if (!exists(rootDir)) {
		return;
	}

	for (const dirent of fs.readdirSync(rootDir, { withFileTypes: true })) {
		if (!dirent.isDirectory()) {
			continue;
		}

		const moduleDir = path.join(rootDir, dirent.name);
		checkModuleAssets(moduleDir, issues);
	}
}

/**
 * @param {string} moduleDir
 * @param {string[]} issues
 * @returns {void}
 */
function checkModuleAssets(moduleDir, issues) {
	const moduleName = path.basename(moduleDir);
	const expectedBase = moduleName.replace(/_/g, '-').toLowerCase();
	const allowedJs = new Set([`${expectedBase}.js`, `${expectedBase}-backend.js`]);
	const allowedScss = new Set([`${expectedBase}.scss`, `${expectedBase}-backend.scss`]);

	for (const [subdir, allowed] of [
		['js', allowedJs],
		['scss', allowedScss],
	]) {
		const assetsDir = path.join(moduleDir, 'resources', subdir);

		if (!exists(assetsDir)) {
			continue;
		}

		for (const dirent of fs.readdirSync(assetsDir, { withFileTypes: true })) {
			if (!dirent.isFile()) {
				continue;
			}

			if (!allowed.has(dirent.name)) {
				pushIssue(
					issues,
					`${toRepoPath(path.join(assetsDir, dirent.name))} does not match the ${expectedBase} module asset contract.`,
				);
			}
		}
	}
}

const issues = [];

walk(RESOURCES_DIR, (entryPath, dirent) => {
	if (dirent.isFile() && dirent.name === '.DS_Store') {
		pushIssue(issues, `${toRepoPath(entryPath)} should not exist.`);
	}
});

walk(ACTIVE_SCSS_DIR, (entryPath, dirent) => {
	if (!dirent.isFile()) {
		return;
	}

	if (/copy/i.test(dirent.name)) {
		pushIssue(issues, `${toRepoPath(entryPath)} looks like a scratch copy and should be archived.`);
	}

	const source = fs.readFileSync(entryPath, 'utf8');

	if (source.includes('_archive/')) {
		pushIssue(issues, `${toRepoPath(entryPath)} references the archive tree.`);
	}
});

walk(ACTIVE_JS_DIR, (entryPath, dirent) => {
	if (!dirent.isFile() || !isCodeFile(entryPath)) {
		return;
	}

	if (/copy/i.test(dirent.name)) {
		pushIssue(issues, `${toRepoPath(entryPath)} looks like a scratch copy and should be archived.`);
	}

	const source = fs.readFileSync(entryPath, 'utf8');

	if (source.includes('_archive/')) {
		pushIssue(issues, `${toRepoPath(entryPath)} references the archive tree.`);
	}
});

checkModuleAssetRoot(path.join(ROOT, 'inc/Modules'), issues);
checkModuleAssetRoot(path.join(ROOT, 'console/Commands/Modules'), issues);
checkModuleAssets(path.join(ROOT, 'console/Commands/Dummy'), issues);

if (exists(ARCHIVE_DIR)) {
	walk(ARCHIVE_DIR, (entryPath, dirent) => {
		if (dirent.isFile() && /copy/i.test(dirent.name)) {
			pushIssue(issues, `${toRepoPath(entryPath)} should be renamed or removed instead of staying as a copy file.`);
		}
	});
}

if (issues.length) {
	console.error('Asset checks failed:\n');
	console.error(issues.join('\n'));
	process.exit(1);
}

console.log('Asset checks passed.');
