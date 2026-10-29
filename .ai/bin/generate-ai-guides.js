#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');
const childProcess = require('node:child_process');

const { detectProjectGThemeReference, isGThemeSourceProject } = require('../lib/gtheme-reference');

const guideFiles = [ 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md' ];
const markerStart = '<!-- g-boost-guidelines:start -->';
const markerEnd = '<!-- g-boost-guidelines:end -->';
const { skillTargets, syncSkillDirectories } = require('../lib/generated-skills');

function generateProjectGuides(options = {}) {
    const projectRoot = path.resolve(options.projectRoot || process.cwd());
    const aiRoot = path.join(projectRoot, '.ai');
    const onProgress = typeof options.onProgress === 'function'
        ? options.onProgress
        : () => {};

    onProgress('Checking .ai source');
    if (!fs.existsSync(aiRoot)) {
        throw new Error(`No .ai directory found in ${projectRoot}. Run g-boost apply first.`);
    }

    onProgress('Reading guidelines');
    const generatedBlock = buildGeneratedBlock(projectRoot);
    onProgress('Writing guide files');
    const guideResults = guideFiles.map((fileName) => {
        const filePath = path.join(projectRoot, fileName);

        return {
            filePath,
            status: upsertManagedBlock(filePath, fileName, generatedBlock),
        };
    });

    onProgress('Syncing skill directories');
    const skillResults = syncSkillDirectories(projectRoot);

    return {
        guideResults,
        skillResults,
    };
}

function buildGeneratedBlock(projectRoot) {
    const sections = [
        ...readGuidelineSections(path.join(projectRoot, '.ai', 'guidelines', 'shared')),
        ...readGuidelineSections(path.join(projectRoot, '.ai', 'guidelines', 'custom')),
    ];
    const architectureSection = buildArchitectureSection(projectRoot);
    const gthemeContextSection = buildGThemeContextSection(projectRoot);
    const generatedSections = sections.length > 0
        ? sections
        : [ '### Guidelines\n\n- No guideline files were found in `.ai/guidelines`.' ];

    if (architectureSection) {
        generatedSections.push(architectureSection);
    }

    if (gthemeContextSection) {
        generatedSections.push(gthemeContextSection);
    }

    return [
        markerStart,
        '## G-Boost Guidelines',
        '',
        'These instructions are generated from the committed `.ai` source directory.',
        'Repository-specific custom guidance should take precedence when it conflicts with shared guidance.',
        '',
        generatedSections.join('\n\n'),
        markerEnd,
        '',
    ].join('\n');
}

function readGuidelineSections(directory) {
    return listMarkdownFiles(directory)
        .map((filePath) => transformGuidelineSection(filePath).trim())
        .filter(Boolean);
}

function listMarkdownFiles(directory) {
    if (!fs.existsSync(directory)) {
        return [];
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...listMarkdownFiles(entryPath));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.md')) {
            files.push(entryPath);
        }
    }

    return files.sort((first, second) => first.localeCompare(second));
}

function transformGuidelineSection(filePath) {
    const content = fs.readFileSync(filePath, 'utf8').trim();

    if (!content) {
        return '';
    }

    const lines = content.split('\n');

    if (lines[0] && lines[0].startsWith('# ')) {
        lines[0] = `### ${lines[0].slice(2)}`;
    }

    return lines.join('\n');
}

function buildArchitectureSection(projectRoot) {
    const facts = [
        ...readComposerFacts(projectRoot),
        ...readPackageFacts(projectRoot),
        ...readWordPressFacts(projectRoot),
    ];

    if (facts.length === 0) {
        return '';
    }

    return [
        '### Project Architecture',
        '',
        ...facts.map((fact) => `- ${fact}`),
    ].join('\n');
}

function buildGThemeContextSection(projectRoot) {
    const detection = detectProjectGThemeReference(projectRoot);

    if (isGThemeSourceProject(projectRoot, detection)) {
        return [
            '### G-Theme Context',
            '',
            '- This repository is the G-Theme source. Use the local working tree as the source of truth, including uncommitted changes.',
            '- Treat `module`, `section`, `row`, and `column` as G-Theme page-builder concepts unless local evidence clearly says otherwise.',
            '- Inspect local modules, fields, controllers, base classes, and templates directly. Use `gtheme.*` MCP tools only for an explicit comparison with a published version, passing that version explicitly.',
        ].join('\n');
    }

    if (!detection || !detection.ref) {
        return '';
    }

    return [
        '### G-Theme Context',
        '',
        `- This project uses G-Theme reference \`${detection.ref}\`.`,
        '- Treat `module`, `section`, `row`, and `column` as G-Theme page-builder concepts unless local evidence clearly says otherwise.',
        `- When the task, relevant instructions, and nearby code leave uncertainty about G-Theme APIs, commands, configuration, or implementation patterns, consult the \`gtheme.*\` MCP tools before guessing and pass \`version: "${detection.ref}"\` explicitly.`,
        '- Search for the specific operation or concept and inspect only the relevant results. Use the documented G-Theme approach; skip the lookup when the correct approach is already clear from local context.',
    ].join('\n');
}

function readComposerFacts(projectRoot) {
    const composerPath = path.join(projectRoot, 'composer.json');
    const composer = readJsonFile(composerPath);

    if (!composer) {
        return [];
    }

    const facts = [ '`composer.json` is present.' ];
    const phpVersion = composer.require && composer.require.php;

    if (phpVersion) {
        facts.push(`PHP version constraint: \`${phpVersion}\`.`);
    }

    const runtimePackages = formatDependencyList(composer.require, [ 'php' ]);
    const devPackages = formatDependencyList(composer['require-dev']);

    if (runtimePackages) {
        facts.push(`Composer runtime packages: ${runtimePackages}.`);
    }

    if (devPackages) {
        facts.push(`Composer dev packages: ${devPackages}.`);
    }

    return facts;
}

function readPackageFacts(projectRoot) {
    const packagePath = path.join(projectRoot, 'package.json');
    const packageJson = readJsonFile(packagePath);

    if (!packageJson) {
        return [];
    }

    const facts = [ '`package.json` is present.' ];

    if (packageJson.name) {
        const version = packageJson.version ? `@${packageJson.version}` : '';
        facts.push(`Node package: \`${packageJson.name}${version}\`.`);
    }

    if (packageJson.engines && packageJson.engines.node) {
        facts.push(`Node version constraint: \`${packageJson.engines.node}\`.`);
    }

    if (packageJson.packageManager) {
        facts.push(`Package manager: \`${packageJson.packageManager}\`.`);
    }

    const runtimePackages = formatDependencyList(packageJson.dependencies);
    const devPackages = formatDependencyList(packageJson.devDependencies);

    if (runtimePackages) {
        facts.push(`Node runtime packages: ${runtimePackages}.`);
    }

    if (devPackages) {
        facts.push(`Node dev packages: ${devPackages}.`);
    }

    return facts;
}

function readWordPressFacts(projectRoot) {
    const facts = [];
    const styleCssPath = path.join(projectRoot, 'style.css');

    if (fs.existsSync(styleCssPath)) {
        const styleCss = fs.readFileSync(styleCssPath, 'utf8');
        const themeName = readHeaderValue(styleCss, 'Theme Name');

        if (themeName) {
            facts.push(`WordPress theme detected: \`${themeName}\`.`);
        }
    }

    for (const fileName of listRootPhpFiles(projectRoot)) {
        const filePath = path.join(projectRoot, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        const pluginName = readHeaderValue(content, 'Plugin Name');

        if (pluginName) {
            facts.push(`WordPress plugin detected: \`${pluginName}\` from \`${fileName}\`.`);
            break;
        }
    }

    if (facts.length > 0 || fs.existsSync(path.join(projectRoot, 'wp-config.php')) || fs.existsSync(path.join(projectRoot, 'wp-content'))) {
        facts.push(...readWpCliFacts(projectRoot));
    }

    return facts;
}

function readWpCliFacts(projectRoot) {
    const facts = [];
    const coreVersion = runWpCli(projectRoot, [ 'core', 'version', '--skip-plugins', '--skip-themes' ]);
    const activeTheme = runWpCli(projectRoot, [ 'theme', 'list', '--status=active', '--field=name', '--skip-plugins', '--skip-themes' ]);
    const activePlugins = runWpCli(projectRoot, [ 'plugin', 'list', '--status=active', '--field=name', '--skip-plugins', '--skip-themes' ]);
    const multisiteStatus = runWpCliStatus(projectRoot, [ 'core', 'is-installed', '--network', '--skip-plugins', '--skip-themes' ]);

    if (coreVersion) {
        facts.push(`WordPress runtime version from WP-CLI: \`${coreVersion}\`.`);
    }

    if (activeTheme) {
        facts.push(`WordPress active theme from WP-CLI: \`${activeTheme.split(/\r?\n/)[0]}\`.`);
    }

    if (activePlugins) {
        facts.push(`WordPress active plugins from WP-CLI: ${formatValueList(activePlugins.split(/\r?\n/).filter(Boolean))}.`);
    }

    if (multisiteStatus === 0) {
        facts.push('WordPress multisite is enabled according to WP-CLI.');
    }

    return facts;
}

function listRootPhpFiles(projectRoot) {
    if (!fs.existsSync(projectRoot)) {
        return [];
    }

    return fs.readdirSync(projectRoot, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.php'))
        .map((entry) => entry.name)
        .sort((first, second) => first.localeCompare(second))
        .slice(0, 20);
}

function readHeaderValue(content, headerName) {
    const escapedHeader = headerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = content.match(new RegExp(`^[ \\t/*#@]*${escapedHeader}:\\s*(.+)$`, 'im'));

    return match ? match[1].trim() : '';
}

function formatDependencyList(dependencies, excludedPackages = []) {
    if (!dependencies || typeof dependencies !== 'object') {
        return '';
    }

    const excluded = new Set(excludedPackages);
    const entries = Object.entries(dependencies)
        .filter(([ packageName ]) => !excluded.has(packageName))
        .sort(([ first ], [ second ]) => first.localeCompare(second));

    if (entries.length === 0) {
        return '';
    }

    const visibleEntries = entries.slice(0, 20)
        .map(([ packageName, version ]) => `\`${packageName}@${version}\``);
    const remainingCount = entries.length - visibleEntries.length;

    if (remainingCount > 0) {
        visibleEntries.push(`${remainingCount} more`);
    }

    return visibleEntries.join(', ');
}

function formatValueList(values) {
    const visibleEntries = values.slice(0, 20)
        .map((value) => `\`${value}\``);
    const remainingCount = values.length - visibleEntries.length;

    if (remainingCount > 0) {
        visibleEntries.push(`${remainingCount} more`);
    }

    return visibleEntries.join(', ');
}

function runWpCli(projectRoot, args) {
    const result = runWpCliCommand(projectRoot, args);

    if (result.status !== 0) {
        return '';
    }

    return result.stdout.trim();
}

function runWpCliStatus(projectRoot, args) {
    return runWpCliCommand(projectRoot, args).status;
}

function runWpCliCommand(projectRoot, args) {
    const result = childProcess.spawnSync('wp', args, {
        cwd: projectRoot,
        encoding: 'utf8',
        env: {
            ...process.env,
            WP_CLI_COLOR: '0',
        },
        stdio: [ 'ignore', 'pipe', 'ignore' ],
        timeout: 5000,
    });

    return {
        status: result.status,
        stdout: result.stdout || '',
    };
}

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return null;
    }
}

function upsertManagedBlock(filePath, fileName, generatedBlock) {
    if (!fs.existsSync(filePath)) {
        const newContent = [
            `# ${path.basename(fileName, '.md')} Instructions`,
            '',
            generatedBlock,
        ].join('\n');

        fs.writeFileSync(filePath, newContent, 'utf8');

        return 'created';
    }

    const currentContent = fs.readFileSync(filePath, 'utf8');
    const managedPattern = new RegExp(
        `${escapeRegExp(markerStart)}[\\s\\S]*?${escapeRegExp(markerEnd)}\\n?`,
        'm',
    );

    if (managedPattern.test(currentContent)) {
        const updatedContent = currentContent.replace(managedPattern, generatedBlock);

        fs.writeFileSync(filePath, updatedContent, 'utf8');

        return 'updated';
    }

    const separator = currentContent.endsWith('\n') ? '\n' : '\n\n';
    const updatedContent = `${currentContent}${separator}${generatedBlock}`;

    fs.writeFileSync(filePath, updatedContent, 'utf8');

    return 'tagged';
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (require.main === module) {
    try {
        const projectRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
        const results = generateProjectGuides({ projectRoot });

        for (const result of results.guideResults) {
            console.log(`${result.status}: ${result.filePath}`);
        }

        for (const result of results.skillResults) {
            console.log(`${result.status}: ${result.directory}`);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = {
    buildGeneratedBlock,
    generateProjectGuides,
    markerEnd,
    markerStart,
    skillTargets,
};
