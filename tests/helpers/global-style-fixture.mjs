import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Follow the actual app entry and CSS imports instead of assuming every sheet
// is imported directly by _app. Reads fail if any imported sheet is missing.
export function appStylesheets(entry = 'apps/web/pages/_app.tsx') {
  const sheets = [], seen = new Set();
  function visit(file, css) {
    const absolute = resolve(file);
    if (seen.has(absolute)) return;
    seen.add(absolute);
    const source = readFileSync(absolute, 'utf8');
    if (css) sheets.push(absolute);
    const pattern = css ? /@import\s+['"]([^'"]+\.css)['"]/g : /import\s+['"]([^'"]+\.css)['"]/g;
    for (const [, target] of source.matchAll(pattern)) visit(resolve(dirname(absolute), target), true);
  }
  visit(entry, false);
  return sheets;
}
