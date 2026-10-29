const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function hashSkill(directory) {
    const hash = crypto.createHash('sha256');

    function visit(current, relative) {
        const stat = fs.lstatSync(current);

        if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) {
            throw new Error(`Expected regular skill files and directories: ${current}`);
        }

        hash.update(`${stat.isDirectory() ? 'directory' : 'file'}:${relative}\0`);

        if (stat.isDirectory()) {
            for (const name of fs.readdirSync(current).sort()) {
                visit(path.join(current, name), path.join(relative, name));
            }
        } else {
            hash.update(`${stat.mode & 0o111}\0`);
            hash.update(fs.readFileSync(current));
            hash.update('\0');
        }
    }

    visit(directory, '');

    return hash.digest('hex');
}

// Stage each replacement on its destination filesystem. Roll back completed
// swaps if any later swap fails, including the final ownership-state write.
function replaceManagedEntries(changes) {
    const staged = [];
    let committed = false;

    try {
        for (const change of changes) {
            const parent = path.dirname(change.destination);
            fs.mkdirSync(parent, { recursive: true });
            const stagingParent = change.name ? path.dirname(parent) : parent;
            const temporary = fs.mkdtempSync(path.join(stagingParent, '.g-boost-'));
            const entry = { ...change, temporary, backup: path.join(temporary, 'previous'), next: null };
            staged.push(entry);

            if (change.source || change.link !== undefined || change.content !== undefined) {
                entry.next = path.join(temporary, 'next');

                if (change.source) {
                    fs.cpSync(change.source, entry.next, { recursive: true });

                    if (hashSkill(entry.next) !== change.hash) {
                        throw new Error(`Skill source changed during installation: ${change.name}`);
                    }
                } else if (change.link !== undefined) {
                    fs.symlinkSync(change.link, entry.next, 'dir');
                } else {
                    fs.writeFileSync(entry.next, change.content, { mode: change.mode ?? 0o600 });
                }
            }
        }

        for (const entry of staged) {
            if (lstat(entry.destination)) {
                fs.renameSync(entry.destination, entry.backup);
                entry.backedUp = true;
            }

            if (entry.next) {
                fs.renameSync(entry.next, entry.destination);
                entry.installed = true;
            }
        }

        committed = true;
    } catch (error) {
        for (const entry of [ ...staged ].reverse()) {
            if (entry.installed) {
                fs.rmSync(entry.destination, { recursive: true, force: true });
            }

            if (entry.backedUp) {
                fs.renameSync(entry.backup, entry.destination);
            }
        }

        throw error;
    } finally {
        for (const entry of staged) {
            // Preserve a backup if rollback itself failed.
            if (committed || !lstat(entry.backup)) {
                fs.rmSync(entry.temporary, { recursive: true, force: true });
            }
        }
    }
}

function lstat(filePath) {
    try {
        return fs.lstatSync(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }

        throw error;
    }
}

function assertRegularFile(filePath) {
    if (!fs.lstatSync(filePath).isFile()) {
        throw new Error(`Expected a regular file: ${filePath}`);
    }
}

function assertDirectoryPath(directory) {
    // Check ancestors too: a symlinked tool directory could otherwise redirect
    // replacement or deletion into a project or another manager's directory.
    let current = path.resolve(directory);

    while (path.dirname(current) !== current) {
        const stat = lstat(current);

        if (stat && !stat.isDirectory()) {
            throw new Error(`Expected a real directory: ${current}`);
        }

        current = path.dirname(current);
    }
}

module.exports = { hashSkill, replaceManagedEntries, lstat, assertRegularFile, assertDirectoryPath };
