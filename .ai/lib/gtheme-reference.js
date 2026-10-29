const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function detectProjectGThemeReference(startDirectory) {
    const gthemeDirectory = findProjectGThemeDirectory(startDirectory);

    if (!gthemeDirectory) {
        return null;
    }

    return {
        directory: gthemeDirectory,
        ref: readGThemeReference(gthemeDirectory),
    };
}

function findProjectGThemeDirectory(startDirectory) {
    const seen = new Set();
    const start = path.resolve(startDirectory);

    for (const ancestor of listAncestors(start)) {
        if (isGThemeSourceDirectory(ancestor)) {
            return ancestor;
        }
    }

    for (const ancestor of listAncestors(start)) {
        const wpContentDirectory = path.basename(ancestor) === 'wp-content'
            ? ancestor
            : path.join(ancestor, 'wp-content');
        const wordpressRoot = path.basename(ancestor) === 'wp-content'
            ? path.dirname(ancestor)
            : ancestor;

        if (start !== path.resolve(wordpressRoot) && !isSameOrDescendant(start, wpContentDirectory)) {
            continue;
        }

        const candidate = path.join(wpContentDirectory, 'themes', 'generation-theme');
        const resolvedCandidate = path.resolve(candidate);

        if (seen.has(resolvedCandidate)) {
            continue;
        }

        seen.add(resolvedCandidate);

        if (isDirectory(resolvedCandidate)) {
            return resolvedCandidate;
        }
    }

    return '';
}

function isGThemeSourceDirectory(directory) {
    const stylePath = path.join(directory, 'style.css');
    const style = fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf8') : '';

    if (/^[ \t/*#@]*Template:\s*\S+/im.test(style)) {
        return false;
    }

    if (/^[ \t/*#@]*Theme Name:[ \t]*G-Theme®?[ \t]*\r?$/im.test(style)) {
        return true;
    }

    try {
        const composer = JSON.parse(fs.readFileSync(path.join(directory, 'composer.json'), 'utf8'));

        return composer.name === 'thegeneration/generation-theme';
    } catch (error) {
        return false;
    }
}

function isGThemeSourceProject(projectRoot, detection = detectProjectGThemeReference(projectRoot)) {
    return Boolean(detection && isSameOrDescendant(
        fs.realpathSync(projectRoot),
        fs.realpathSync(detection.directory),
    ));
}

function readGThemeReference(gthemeDirectory) {
    const exactTag = runGit(gthemeDirectory, [ 'describe', '--tags', '--exact-match', 'HEAD' ]);

    if (exactTag) {
        return exactTag;
    }

    // Branch names can be local-only or deleted remotely after a release.
    // Pin the actual checkout when its tags have not been fetched locally.
    const commit = runGit(gthemeDirectory, [ 'rev-parse', '--verify', 'HEAD^{commit}' ]);

    if (commit) {
        return commit;
    }

    return readThemeVersionHeader(gthemeDirectory);
}

function readThemeVersionHeader(gthemeDirectory) {
    const styleCssPath = path.join(gthemeDirectory, 'style.css');

    if (!fs.existsSync(styleCssPath)) {
        return '';
    }

    const content = fs.readFileSync(styleCssPath, 'utf8');
    const match = content.match(/^[ \t/*#@]*Version:\s*(.+)$/im);

    return match ? match[1].trim() : '';
}

function runGit(cwd, args) {
    const result = childProcess.spawnSync('git', [ '-C', cwd, ...args ], {
        encoding: 'utf8',
        stdio: [ 'ignore', 'pipe', 'ignore' ],
    });

    if (result.status !== 0) {
        return '';
    }

    return result.stdout.trim();
}

function listAncestors(directory) {
    const ancestors = [];
    let current = path.resolve(directory);

    while (true) {
        ancestors.push(current);

        const parent = path.dirname(current);

        if (parent === current) {
            return ancestors;
        }

        current = parent;
    }
}

function isDirectory(directory) {
    try {
        return fs.statSync(directory).isDirectory();
    } catch (error) {
        return false;
    }
}

function isSameOrDescendant(childPath, parentPath) {
    const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));

    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

module.exports = {
    detectProjectGThemeReference,
    findProjectGThemeDirectory,
    isGThemeSourceProject,
    readGThemeReference,
    readThemeVersionHeader,
};
