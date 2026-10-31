import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifest } from './documentation-manifest.mjs';
import { checkDocumentation } from './documentation-links.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--manifest')) throw new Error('Usage: check-documentation.mjs [--manifest path]');
  const path = args.length ? resolve(args[1]) : resolve(root, 'docs/documentation-map.json');
  const manifest = await loadManifest(root, path);
  const result = await checkDocumentation({ root, files: manifest.activeFiles, manifest });
  for (const entry of result.issues) console.error(`${entry.file}:${entry.line} ${entry.code} ${entry.target}: ${entry.detail}`);
  console.log(`Checked ${result.checkedFiles} files and ${result.checkedLinks} links; ${result.issues.length} issues.`);
  return result.issues.length ? 1 : 0;
}
main().then(code => { process.exitCode = code; }).catch(error => { console.error(`Invalid manifest or usage: ${error.message}`); process.exitCode = 2; });
