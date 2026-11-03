import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Nest decorators require the strict TypeScript build. Never rewrite test bodies or
// fall back to source when preparation is missing. The suite prepares this build.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    if (!result.url.startsWith('file:') || !result.url.endsWith('.ts')) return result;
    const path = relative(root, fileURLToPath(result.url)).replaceAll('\\', '/');
    if (!path.startsWith('apps/api/src/') && !path.startsWith('src/core/domain/')) return result;
    const compiled = resolve(root, '.build/api', path.replace(/\.ts$/, '.js'));
    if (!existsSync(compiled)) throw new Error(`Missing strict API test build: ${path}`);
    return { ...result, url: pathToFileURL(compiled).href };
  },
});
