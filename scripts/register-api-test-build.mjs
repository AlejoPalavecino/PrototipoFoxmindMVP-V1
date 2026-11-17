import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A renamed source must not remain executable merely because tsc left an old JS file.
// Historical snapshots used for comparison have a different build root and stay explicit.
export function assertCurrentCompiledSource(root, file, exists = existsSync) {
  const match = /^\.build\/(?:api|p33-(?:mail|security|outbox))\/(.+)\.js$/.exec(file);
  if (!match || !['apps/api/src/', 'src/core/domain/', 'src/core/contracts/'].some(prefix => match[1].startsWith(prefix))) return;
  const source = match[1] + '.ts';
  if (!exists(resolve(root, source))) throw new Error('Missing current API source for compiled test artifact: ' + source);
}

// Nest decorators require the strict TypeScript build. Never rewrite test bodies or
// fall back to source when preparation is missing. The suite prepares this build.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    if (!result.url.startsWith('file:')) return result;
    const path = relative(root, fileURLToPath(result.url)).replaceAll('\\', '/');
    assertCurrentCompiledSource(root, path);
    if (!result.url.endsWith('.ts')) return result;
    if (!path.startsWith('apps/api/src/') && !path.startsWith('src/core/domain/') && !path.startsWith('src/core/contracts/')) return result;
    const compiled = resolve(root, '.build/api', path.replace(/\.ts$/, '.js'));
    if (!existsSync(compiled)) throw new Error(`Missing strict API test build: ${path}`);
    return { ...result, url: pathToFileURL(compiled).href };
  },
});
