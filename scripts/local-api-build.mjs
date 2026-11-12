import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildApi } from './build-api.mjs';

const localBudgetMs = 90000;
const shutdownMarginMs = 5000;

// Fixed local opt-in; both stages and their deadline remain owned by buildApi.
export function buildLocalApi({ root, run, now } = {}) {
  return buildApi({ root, run, now, budgetMs: localBudgetMs });
}

export function runLocalApiBuild(command) {
  // Margin permits Node startup/output/shutdown, not extra compiler runtime.
  return command(process.execPath, ['scripts/local-api-build.mjs'], process.env,
    localBudgetMs + shutdownMarginMs);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'Usage: node scripts/local-api-build.mjs';
  if (args.length === 1 && args[0] === '--help') console.log(usage);
  else if (args.length) { console.error(usage); process.exitCode = 2; }
  else {
    try { process.exitCode = buildLocalApi(); }
    catch { console.error('API build unavailable'); process.exitCode = 1; }
  }
}
