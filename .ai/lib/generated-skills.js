const fs = require('node:fs');
const path = require('node:path');
const { hashSkill, replaceManagedEntries, lstat, assertDirectoryPath, assertRegularFile } = require('./managed-files');

const skillTargets = [ '.agents', '.claude', '.gemini', '.cursor', '.codex', '.github' ]
    .map((tool) => path.join(tool, 'skills'));
const ownershipFile = '.g-boost-skills.json';

function syncSkillDirectories(projectRoot) {
    // Canonicalize the project root while rejecting symlinks inside the project.
    projectRoot = fs.realpathSync(projectRoot);
    const aiRoot = path.join(projectRoot, '.ai');
    assertDirectoryPath(aiRoot);
    const lockPath = path.join(aiRoot, '.g-boost-skills-sync');
    try {
        fs.mkdirSync(lockPath);
    } catch (error) {
        if (error.code === 'EEXIST') {
            throw new Error(`Skill generation is already locked: ${lockPath}. Remove the lock only after the previous process has stopped.`);
        }
        throw error;
    }

    try {
        const sources = collectSources(projectRoot);
        // Preflight every tool before replacing any generated skill. Unrelated
        // entries are never included in the transaction.
        const plans = skillTargets.map((target) => planTarget(projectRoot, target, sources));
        replaceManagedEntries(plans.flatMap((plan) => plan.changes));
        return plans.map((plan) => ({ directory: plan.directory, status: 'synced' }));
    } finally {
        fs.rmdirSync(lockPath);
    }
}

function collectSources(projectRoot) {
    const sources = new Map();
    const vendorRoot = path.join(projectRoot, '.ai', 'vendor');
    assertDirectoryPath(vendorRoot);
    if (lstat(vendorRoot)) {
        for (const entry of fs.readdirSync(vendorRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            if (entry.isDirectory()) {
                addSources(path.join(vendorRoot, entry.name, 'skills'), 'copy', sources);
            }
        }
    }
    // Preserve existing precedence: sorted vendors, then project-local skills.
    const localRoot = path.join(projectRoot, '.ai', 'skills');
    assertDirectoryPath(localRoot);
    fs.mkdirSync(localRoot, { recursive: true });
    addSources(localRoot, 'link', sources);
    return sources;
}

function addSources(directory, kind, sources) {
    assertDirectoryPath(directory);
    if (!lstat(directory)) {
        return;
    }
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const source = path.join(directory, entry.name);
        if (entry.isDirectory() && fs.existsSync(path.join(source, 'SKILL.md'))) {
            if (!validName(entry.name)) {
                throw new Error(`Unsupported skill directory name: ${source}`);
            }
            sources.set(entry.name, { source, kind, ...(kind === 'copy' ? { hash: hashSkill(source) } : {}) });
        }
    }
}

function planTarget(projectRoot, target, sources) {
    const directory = path.join(projectRoot, target);
    assertDirectoryPath(directory);
    const statePath = path.join(directory, ownershipFile);
    const previous = readOwnership(statePath);
    const desired = describeSources(directory, sources);

    const changes = [];
    for (const name of new Set([ ...previous.keys(), ...desired.keys() ])) {
        const destination = path.join(directory, name);
        const oldEntry = previous.get(name);
        const nextEntry = desired.get(name);
        const exists = lstat(destination);
        const matchesNext = exists && nextEntry && matchesEntry(destination, nextEntry);

        if (exists && !matchesNext && (!oldEntry || !matchesEntry(destination, oldEntry))) {
            const reason = oldEntry ? 'locally modified' : 'not managed by G-Boost';
            throw new Error(`Skill is ${reason}: ${destination}. Preserve it under another name, or copy your customization into .ai/skills and remove the conflicting generated entry before retrying. No generated skills were changed.`);
        }

        // Without a previous record, adopt legacy output only when it exactly
        // matches the current source. Unknown stale output remains untouched.
        if (!matchesNext && (exists || nextEntry)) {
            const source = sources.get(name);
            changes.push({
                name,
                destination,
                ...(nextEntry?.kind === 'copy' ? { source: source.source, hash: source.hash } : {}),
                ...(nextEntry?.kind === 'link' ? { link: nextEntry.link } : {}),
            });
        }
    }
    changes.push(ownershipChange(statePath, [ ...desired.values() ]));
    return { directory, changes };
}

function describeSources(directory, sources) {
    const desired = new Map();
    for (const [ name, source ] of sources) {
        desired.set(name, source.kind === 'copy'
            ? { name, kind: 'copy', hash: source.hash }
            : { name, kind: 'link', link: path.relative(directory, source.source) });
    }

    return desired;
}

function ownershipChange(statePath, skills) {
    return {
        destination: statePath,
        content: `${JSON.stringify({ schemaVersion: 1, skills }, null, 2)}\n`,
    };
}

// Capture identifiable legacy output BEFORE replacing the installed vendor
// snapshot, so the first upgrade can safely update or deselect those skills.
// The caller commits these records together with the source replacement.
function planLegacySkillOwnership(projectRoot) {
    const sources = collectSources(projectRoot);
    const changes = [];
    for (const target of skillTargets) {
        const directory = path.join(projectRoot, target);
        assertDirectoryPath(directory);
        const statePath = path.join(directory, ownershipFile);
        if (lstat(statePath)) {
            readOwnership(statePath);
            continue;
        }
        if (lstat(directory)) {
            const entries = [ ...describeSources(directory, sources).values() ]
                .filter((entry) => matchesEntry(path.join(directory, entry.name), entry));
            changes.push(ownershipChange(statePath, entries));
        }
    }
    return changes;
}

function readOwnership(statePath) {
    if (!lstat(statePath)) {
        return new Map();
    }
    assertRegularFile(statePath);
    let state;
    try {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
        throw new Error(`Invalid generated skill ownership file: ${statePath}`);
    }
    const entries = new Map();
    if (state?.schemaVersion !== 1 || !Array.isArray(state.skills)) {
        throw new Error(`Invalid generated skill ownership file: ${statePath}`);
    }
    for (const entry of state.skills) {
        if (!entry || !validName(entry.name) || entries.has(entry.name)
            || !((entry.kind === 'copy' && /^[a-f0-9]{64}$/.test(entry.hash))
                || (entry.kind === 'link' && typeof entry.link === 'string' && entry.link.length > 0))) {
            throw new Error(`Invalid generated skill ownership file: ${statePath}`);
        }
        entries.set(entry.name, entry);
    }
    return entries;
}

function validName(name) {
    return typeof name === 'string' && name.length > 0 && name !== '.' && name !== '..'
        && name !== ownershipFile && !/[\\/\0]/.test(name);
}

function matchesEntry(destination, entry) {
    const stat = lstat(destination);
    if (entry.kind === 'link') {
        return Boolean(stat?.isSymbolicLink() && fs.readlinkSync(destination) === entry.link);
    }
    if (!stat?.isDirectory()) {
        return false;
    }
    try {
        return hashSkill(destination) === entry.hash;
    } catch {
        // Includes symlinks or special files introduced into a generated copy.
        return false;
    }
}

module.exports = { skillTargets, syncSkillDirectories, ownershipFile, planLegacySkillOwnership };
