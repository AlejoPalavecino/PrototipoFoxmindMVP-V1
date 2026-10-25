import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('TS test loader resolves real import.meta.url by AST while preserving literal text and ordinary property access', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'foxmind-loader-')), filename = join(folder, 'module-url.test.ts');
  try {
    await writeFile(filename, `export const moduleUrl=import.meta.url;
      export const relative=new URL('./document.test.pdf',import.meta.url).href;
      export const literal='import.meta.url';
      export const regular=({meta:{url:'ordinary-property'}}).meta.url;
      // import.meta.url in this comment is not a language expression.
    `);
    const result = loadTsModule(filename);
    assert.equal(result.moduleUrl, pathToFileURL(filename).href);
    assert.equal(result.relative, new URL('./document.test.pdf', pathToFileURL(filename)).href);
    assert.equal(result.literal, 'import.meta.url'); assert.equal(result.regular, 'ordinary-property');
  } finally { await unlink(filename).catch(() => {}); await rmdir(folder); }
});
