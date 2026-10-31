import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative } from 'node:path';
import { anchors, links, visibleLines } from './documentation-markdown.mjs';
import { safePath } from './documentation-manifest.mjs';

const issue = (code, file, line, target, detail) => ({ code, file, line, target, detail });
const external = target => /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target);
async function exists(path) { try { return await stat(path); } catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; } }
function targetPath(root, source, target) {
  const [rawPath, rawFragment = ''] = target.split('#', 2);
  const path = decodeURIComponent(rawPath.split('?')[0]);
  const fragment = decodeURIComponent(rawFragment);
  const full = path ? resolve(dirname(safePath(root, source)), path) : safePath(root, source);
  const rel = relative(root, full).replaceAll('\\', '/');
  safePath(root, rel);
  return { full, rel, fragment };
}
async function inspectLink(root, file, link) {
  if (link.target === undefined) return issue('UNDEFINED_REFERENCE', file, link.line, link.reference, 'Reference is not defined');
  if (external(link.target)) return null;
  let target;
  try { target = targetPath(root, file, link.target); } catch { return issue('INVALID_TARGET', file, link.line, link.target, 'Invalid or escaping target'); }
  const info = await exists(target.full);
  if (!info) return issue('FILE_NOT_FOUND', file, link.line, link.target, 'Target does not exist');
  if (target.fragment && info.isFile() && !anchors(await readFile(target.full, 'utf8')).has(target.fragment)) return issue('ANCHOR_NOT_FOUND', file, link.line, link.target, 'Target anchor does not exist');
  return null;
}
async function checkFile(root, file, result) {
  const full = safePath(root, file);
  if (!await exists(full)) { result.issues.push(issue('FILE_NOT_FOUND', file, 0, file, 'Source does not exist')); return; }
  const found = links(await readFile(full, 'utf8'));
  result.checkedFiles++;
  for (const link of found) {
    if (link.target !== undefined && external(link.target)) continue;
    result.checkedLinks++;
    const problem = await inspectLink(root, file, link);
    if (problem) result.issues.push(problem);
  }
}
async function checkAlias(root, move, result) {
  const file = safePath(root, move.from), destination = safePath(root, move.to);
  if (!await exists(file) || !await exists(destination)) {
    result.issues.push(issue('ALIAS_ANCHOR_MISSING', move.from, 0, move.to, 'Alias or canonical destination missing')); return;
  }
  const text = await readFile(file, 'utf8'), ids = anchors(text), canonical = anchors(await readFile(destination, 'utf8'));
  const aliasText = visibleLines(text).join('\n');
  for (const id of move.anchorsBefore) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const marker = new RegExp(`<a\\s+[^>]*id=["']${escaped}["'][^>]*><\\/a>`, 'i').exec(aliasText);
    const section = marker ? aliasText.slice(marker.index + marker[0].length).split(/<a\s+[^>]*id=|^\s{0,3}#{1,6}\s/gm, 1)[0] : '';
    const correct = links(section).some(link => {
      if (!link.target) return false;
      try { const target = targetPath(root, move.from, link.target); return target.full === destination && target.fragment === id; } catch { return false; }
    });
    if (!ids.has(id) || !canonical.has(id) || !correct) result.issues.push(issue('ALIAS_ANCHOR_MISSING', move.from, 0, id, 'Historical anchor must link to its canonical anchor'));
  }
}
async function checkPreserved(root, entry, result) {
  const full = safePath(root, entry.path);
  if (!await exists(full)) { result.issues.push(issue('PRESERVED_HASH_MISMATCH', entry.path, 0, entry.path, 'Preserved file missing')); return; }
  const bytes = await readFile(full);
  const text = /\.(?:md|txt|log|tap|jsonl|json|ya?ml|csv|tsv|html|css|js|mjs|ts|tsx|xml|svg|py|ps1|sh)$/i.test(entry.path);
  const data = text ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes;
  const actual = createHash('sha256').update(data).digest('hex');
  if (actual !== entry.sha256.toLowerCase()) result.issues.push(issue('PRESERVED_HASH_MISMATCH', entry.path, 0, entry.path, `Expected ${entry.sha256}, got ${actual}`));
}
export async function checkDocumentation({ root, files, manifest }) {
  root = resolve(root);
  const result = { checkedFiles: 0, checkedLinks: 0, issues: [] };
  for (const file of files) await checkFile(root, file, result);
  for (const path of manifest.fixedPaths ?? []) if (!await exists(safePath(root, path))) result.issues.push(issue('FIXED_PATH_MISSING', path, 0, path, 'Fixed path missing'));
  for (const entry of manifest.preserved ?? []) await checkPreserved(root, entry, result);
  for (const move of manifest.moves ?? []) await checkAlias(root, move, result);
  return result;
}
