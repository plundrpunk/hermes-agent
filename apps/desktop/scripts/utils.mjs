
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// returns true if the passsed file is being invoked from node,
// not imported. `node -e` / stdin runs have no argv[1]: nothing is main.
/** @param {string} importMetaUrl @returns {boolean} */
export function isMain(importMetaUrl) {
    const entry = process.argv[1];
    if (entry === undefined) return false;
    // Node loads the main module by its real path (unless --preserve-symlinks-main), so a
    // symlinked entry or cwd matches by either spelling.
    const resolved = path.resolve(entry);
    let real = resolved;
    try {
        real = fs.realpathSync(resolved);
    } catch {
        // Missing or unreadable entry: compare the plain spelling only.
    }
    return importMetaUrl === pathToFileURL(real).href || importMetaUrl === pathToFileURL(resolved).href;
}
