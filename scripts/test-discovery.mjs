import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Discovery checks classification only. Execution always uses explicit versioned routes.
const generated = new Set(['node_modules', '.next', '.build', 'dist', 'build']);
export function discoverTests({ cwd = process.cwd(), roots = ['tests', 'apps', 'src'] } = {}) {
  function walk(directory) {
    return readdirSync(resolve(cwd, directory), { withFileTypes: true }).flatMap(entry => {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory() && !generated.has(entry.name)) return walk(path);
      return entry.isFile() && /\.test\.(?:mjs|js|ts|tsx)$/.test(entry.name) ? [path] : [];
    });
  }
  return roots.flatMap(walk).sort();
}
