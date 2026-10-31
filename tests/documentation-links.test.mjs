import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { checkDocumentation } from '../scripts/documentation-links.mjs';
import { loadManifest } from '../scripts/documentation-manifest.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(project, 'scripts/check-documentation.mjs');
const digest = value => createHash('sha256').update(value).digest('hex');
const manifest = (extra = {}) => ({
  schemaVersion: 1, baseCommit: 'a'.repeat(40), moves: [], fixedPaths: [],
  preserved: [], duplicateDecisions: [], ...extra,
});

async function fixture(t, entries) {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-docs-test-'));
  t.after(async () => { await rm(root, { recursive: true, force: true }); });
  for (const [path, content] of Object.entries(entries)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}

async function check(root, files, extra = {}) {
  return await checkDocumentation({ root, files, manifest: manifest(extra) });
}

function issuesOf(result, code) {
  return result.issues.filter(issue => issue.code === code);
}

test('reports missing files, fragments and undefined references with source location', async t => {
  const root = await fixture(t, {
    'source.md': '[missing](absent.md)\n[anchor](target.md#missing)\n[unknown][not-defined]\n',
    'target.md': '# Present\n',
  });
  const result = await check(root, ['source.md']);
  assert.equal(result.checkedFiles, 1);
  assert.equal(result.checkedLinks, 3);
  for (const [code, line] of [['FILE_NOT_FOUND', 1], ['ANCHOR_NOT_FOUND', 2], ['UNDEFINED_REFERENCE', 3]]) {
    const matches = issuesOf(result, code);
    assert.equal(matches.length, 1, JSON.stringify(result.issues));
    assert.equal(matches[0].file, 'source.md');
    assert.equal(matches[0].line, line);
    assert.equal(typeof matches[0].target, 'string');
    assert.equal(typeof matches[0].detail, 'string');
  }
});

test('resolves Unicode, encoded spaces, reference links, GitHub headings and HTML IDs', async t => {
  const root = await fixture(t, {
    'source.md': '[uno](gu%C3%ADa%20%C3%BAnica.md#repetido)\n[dos][ref]\n[tres](gu%C3%ADa%20%C3%BAnica.md#subt%C3%ADtulo)\n[cuatro](gu%C3%ADa%20%C3%BAnica.md#manual-id)\n\n[ref]: gu%C3%ADa%20%C3%BAnica.md#repetido-1\n',
    'guía única.md': '# Repetido\n## Repetido\nSubtítulo\n=========\n<a id="manual-id"></a>\n',
  });
  const result = await check(root, ['source.md']);
  assert.equal(result.checkedLinks, 4);
  assert.deepEqual(result.issues, []);
});

test('ignores fenced and inline code and external links', async t => {
  const root = await fixture(t, {
    'source.md': '`[ignored](missing-inline.md)`\n```md\n[ignored](missing-fence.md)\n```\n~~~\n[ignored](missing-tilde.md)\n~~~\n[web](https://example.invalid/a) [mail](mailto:a@example.invalid) [phone](tel:123) [data](data:text/plain,abc)\n[ok](target.md)\n',
    'target.md': '# OK\n',
  });
  const result = await check(root, ['source.md']);
  assert.equal(result.checkedLinks, 1);
  assert.deepEqual(result.issues, []);
});

test('requires every historical alias anchor to link to its canonical anchor', async t => {
  const root = await fixture(t, {
    'old.md': '# Alias\n<a id="first"></a> [Traslado](new.md#first)\n<a id="second"></a> [Traslado](new.md#second)\n',
    'new.md': '# First\n# Second\n',
  });
  const move = { from: 'old.md', to: 'new.md', owner: 'test', sha256Before: digest('old'), anchorsBefore: ['first', 'second'] };
  assert.deepEqual((await check(root, ['old.md'], { moves: [move] })).issues, []);
  await writeFile(join(root, 'old.md'), '# Alias\n<a id="first"></a> [Traslado](new.md#first)\n');
  const result = await check(root, ['old.md'], { moves: [move] });
  assert.ok(issuesOf(result, 'ALIAS_ANCHOR_MISSING').length, JSON.stringify(result.issues));
});

test('checks fixed paths and preserved hashes, normalizing text line endings', async t => {
  const root = await fixture(t, { 'present.md': 'line one\r\nline two\r\n', 'changed.bin': Buffer.from([0, 1, 2]) });
  const result = await check(root, [], {
    fixedPaths: ['present.md', 'absent.json'],
    preserved: [
      { path: 'present.md', sha256: digest('line one\nline two\n') },
      { path: 'changed.bin', sha256: digest(Buffer.from([0, 1, 3])) },
    ],
  });
  assert.equal(issuesOf(result, 'FIXED_PATH_MISSING').length, 1);
  assert.equal(issuesOf(result, 'PRESERVED_HASH_MISMATCH').length, 1);
  assert.equal(issuesOf(result, 'PRESERVED_HASH_MISMATCH')[0].file, 'changed.bin');
});

test('CLI validates manifest and works independently of the working directory', async t => {
  const root = await fixture(t, {
    'valid.json': JSON.stringify(manifest({ activeFiles: [] })),
    'broken.json': JSON.stringify(manifest({ activeFiles: [], fixedPaths: ['__missing_foxmind_doc_test__.md'] })),
    'invalid.json': JSON.stringify({ schemaVersion: 42 }),
  });
  const run = name => spawnSync(process.execPath, [cli, '--manifest', join(root, name)], { cwd: root, encoding: 'utf8' });
  for (const [name, status] of [['valid.json', 0], ['broken.json', 1], ['invalid.json', 2]]) {
    const result = run(name);
    assert.equal(result.status, status, `${name}: ${result.stdout}\n${result.stderr}`);
  }
});

test('rejects alias anchors whose canonical links are swapped', async t => {
  const root = await fixture(t, {
    'old.md': '<a id="first"></a> [Traslado](new.md#second)\n<a id="second"></a> [Traslado](new.md#first)\n',
    'new.md': '# First\n# Second\n',
  });
  const move = { from: 'old.md', to: 'new.md', owner: 'test', sha256Before: digest('old'), anchorsBefore: ['first', 'second'] };
  const result = await check(root, ['old.md'], { moves: [move] });
  assert.equal(issuesOf(result, 'ALIAS_ANCHOR_MISSING').length, 2, JSON.stringify(result.issues));
});

test('loads preservation TSV header and enforces hashes and root boundaries', async t => {
  const root = await fixture(t, {
    'evidence.md': 'texto\r\n',
    'evidence.tsv': `path\tsha256\nevidence.md\t${digest('texto\n')}\n`,
    'manifest.json': JSON.stringify(manifest({ activeFiles: [], preservationFile: 'evidence.tsv' })),
  });
  const path = join(root, 'manifest.json');
  const loaded = await loadManifest(root, path);
  assert.deepEqual((await checkDocumentation({ root, files: [], manifest: loaded })).issues, []);
  await writeFile(join(root, 'evidence.md'), 'changed\n');
  const result = await checkDocumentation({ root, files: [], manifest: loaded });
  assert.equal(issuesOf(result, 'PRESERVED_HASH_MISMATCH').length, 1);
  await writeFile(join(root, 'evidence.tsv'), `path\tsha256\n../escape.md\t${digest('x')}\n`);
  await assert.rejects(loadManifest(root, path));
  await writeFile(join(root, 'evidence.tsv'), 'incorrect\theader\n');
  await assert.rejects(loadManifest(root, path));
});

test('resolves heading fragments containing inline code while ignoring code links', async t => {
  const root = await fixture(t, {
    'source.md': '[run](target.md#run-npm-ci)\n`[ignored](missing.md)`\n',
    'target.md': '# Run `npm ci`\n',
  });
  const result = await check(root, ['source.md']);
  assert.equal(result.checkedLinks, 1);
  assert.deepEqual(result.issues, []);
});

test('preserves CRLF log as LF text and hashes PNG bytes exactly', async t => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  const root = await fixture(t, { 'evidence.log': 'first\r\nsecond\r\n', 'evidence.png': png });
  const result = await check(root, [], {
    preserved: [
      { path: 'evidence.log', sha256: digest('first\nsecond\n') },
      { path: 'evidence.png', sha256: digest(png) },
    ],
  });
  assert.deepEqual(result.issues, []);
  const changed = await check(root, [], {
    preserved: [{ path: 'evidence.png', sha256: digest(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0a])) }],
  });
  assert.equal(issuesOf(changed, 'PRESERVED_HASH_MISMATCH').length, 1);
});

test('does not treat HTML anchors in inline code or comments as real anchors', async t => {
  const root = await fixture(t, {
    'source.md': '[inline](target.md#inline-fake)\n[comment](target.md#comment-fake)\n',
    'target.md': '`<a id="inline-fake"></a>`\n<!--\n<a id="comment-fake"></a>\n-->\n',
  });
  const result = await check(root, ['source.md']);
  const problems = issuesOf(result, 'ANCHOR_NOT_FOUND');
  assert.equal(problems.length, 2, JSON.stringify(result.issues));
  assert.deepEqual(problems.map(problem => problem.line), [1, 2]);
});
