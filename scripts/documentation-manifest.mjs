import { readFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';

export function safePath(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /^[a-z]:/i.test(path) || path.includes('\\')) throw new Error(`Invalid path: ${path}`);
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) throw new Error(`Path escapes root: ${path}`);
  return full;
}
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const list = value => Array.isArray(value);
export function validateManifest(root, m) {
  if (!m || m.schemaVersion !== 1 || !/^[a-f0-9]{40}$/i.test(m.baseCommit ?? '') || !list(m.moves) || !list(m.fixedPaths) || !list(m.preserved) || !list(m.duplicateDecisions) || !list(m.activeFiles)) throw new Error('Invalid manifest schema');
  for (const path of [...m.activeFiles, ...m.fixedPaths]) safePath(root, path);
  for (const p of m.preserved) { safePath(root, p.path); if (!hash(p.sha256)) throw new Error('Invalid preserved hash'); }
  const edges = new Map();
  for (const move of m.moves) {
    safePath(root, move.from); safePath(root, move.to);
    if (!move.owner || !hash(move.sha256Before) || !list(move.anchorsBefore) || move.anchorsBefore.some(x => typeof x !== 'string' || !x) || edges.has(move.from)) throw new Error('Invalid move');
    edges.set(move.from, move.to);
  }
  for (const start of edges.keys()) {
    const seen = new Set(); let path = start;
    while (edges.has(path)) { if (seen.has(path)) throw new Error('Move cycle'); seen.add(path); path = edges.get(path); }
  }
  for (const d of m.duplicateDecisions) {
    if (!list(d.paths) || d.paths.length < 2 || !hash(d.sha256) || !d.decision || !d.reason) throw new Error('Invalid duplicate decision');
    for (const path of d.paths) safePath(root, path);
  }
  if (m.preservationFile !== undefined) safePath(root, m.preservationFile);
  return m;
}
function mergePreserved(root, entries) {
  const seen = new Map(), merged = [];
  for (const entry of entries) {
    const path = safePath(root, entry.path);
    const key = process.platform === 'win32' ? path.toLowerCase() : path;
    const digest = entry.sha256.toLowerCase();
    if (seen.has(key) && seen.get(key) !== digest) throw new Error(`Conflicting preserved hashes: ${entry.path}`);
    if (!seen.has(key)) { seen.set(key, digest); merged.push(entry); }
  }
  return merged;
}
export async function loadManifest(root, file) {
  const m = JSON.parse(await readFile(file, 'utf8'));
  validateManifest(root, m);
  if (m.preservationFile) {
    const bytes = await readFile(safePath(root, m.preservationFile));
    const lines = new TextDecoder('utf-8', { fatal: true }).decode(bytes).split(/\r?\n/);
    if (lines.at(-1) === '') lines.pop();
    if (lines.shift() !== 'path\tsha256') throw new Error('Invalid preservation file header');
    for (const line of lines) {
      const [path, sha256, extra] = line.split('\t');
      if (extra !== undefined || !hash(sha256)) throw new Error('Invalid preservation file row');
      safePath(root, path); m.preserved.push({ path, sha256 });
    }
  }
  m.preserved = mergePreserved(root, m.preserved);
  return m;
}
