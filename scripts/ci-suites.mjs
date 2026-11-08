// Deliberate inventory: no helper discovery or opt-in/live-provider tests.
export const suites = {
  pure: [
    'tests/local-app-environment.test.mjs',
    'tests/architecture-test-discovery.test.mjs',
    'tests/p31-contracts.test.mjs', 'tests/p4-file-policy.test.mjs',
    'tests/agenda-contracts.test.mjs', 'tests/agenda-recurrence.test.mjs', 'tests/agenda-time.test.mjs',
    'tests/home-reference-summary.test.mjs',
    'tests/p8-scoring.test.mjs',
    'tests/activity-ai-contracts.test.mjs', 'tests/grading-ai-contract.test.mjs',
    'tests/audit-ci-runner.test.mjs', 'tests/audit-ci-execution.test.mjs', 'tests/audit-boundaries-guard.test.mjs',
    'tests/audit-browser-action-observer.test.mjs',
    'tests/audit-shared-contracts.test.mjs', 'tests/audit-notifications-contract.test.mjs',
    'tests/audit-architecture.test.mjs', 'tests/audit-progress-linear.test.mjs',
    'tests/audit-scheduler-diagnostics.test.mjs', 'tests/audit-resource-lazy.test.mjs',
  ],
  transport: [
    'tests/pending-classrooms.test.mjs',
    'tests/p3-web-client.test.mjs', 'tests/p3-web-proxy.test.mjs', 'tests/p4-web-proxy.test.mjs',
    'tests/agenda-proxy.test.mjs', 'tests/p9-home-client.test.mjs', 'tests/p6-wall-client.test.mjs',
    'tests/p7-authoring-proxy.test.mjs', 'tests/p8-grading-proxy.test.mjs',
    'tests/activity-ai-proxy.test.mjs', 'tests/audit-wall-proxy.test.mjs',
  ],
  'integration-owned': [
    'tests/pending-classrooms-database.test.mjs',
    'tests/p6-wall.test.mjs',
    'tests/p4-integration.test.mjs', 'tests/agenda-database.test.mjs',
    'tests/p6-wall-integration.test.mjs', 'tests/p7-authoring-integration.test.mjs',
    'tests/p8-grading-integration.test.mjs', 'tests/grading-ai-integration.test.mjs',
    'tests/audit-wall-database.test.mjs', 'tests/audit-notifications-database.test.mjs',
    'tests/audit-activity-ai-lock.test.mjs',
    'tests/audit-lock-concurrency.test.mjs',
    'tests/audit-wall-http-database.test.mjs',
  ],
};

// `discovered` validates coverage only; execution always uses the committed manifest.
export function validateCompleteSuite({ discovered, entries, exclusions, manual = [] }) {
  const errors = [], found = new Set(discovered), seen = new Set(), manualSet = new Set(manual);
  const add = (path, label) => {
    if (seen.has(path)) errors.push(`Duplicate ${label}: ${path}`);
    seen.add(path);
    if (!found.has(path)) errors.push(`Missing file: ${path}`);
  };
  for (const path of entries) {
    add(path, 'entry');
    if (manualSet.has(path)) errors.push(`Unsafe entry: ${path}`);
  }
  for (const { path, reason, kind } of exclusions) {
    add(path, 'exclusion');
    if (typeof reason !== 'string' || !reason.trim() || !['helper', 'manual', 'retired', 'opt-in', 'typecheck'].includes(kind)) errors.push(`Unexplained exclusion: ${path}`);
  }
  for (const path of found) if (!seen.has(path)) errors.push(`Unclassified: ${path}`);
  for (const path of manualSet) if (!exclusions.some(item => item.path === path)) errors.push(`Manual not excluded: ${path}`);
  return errors;
}

const allowedWrappers = new Set([
  'scripts/test-database.mjs', 'scripts/test-backend.mjs', 'scripts/test-p3-browser.mjs',
  'scripts/test-p33-registration-profile.mjs', 'scripts/test-p33-verification.mjs',
  'scripts/test-p33-recovery.mjs', 'scripts/test-p33-password-change.mjs',
  'scripts/test-p33-mail-cancellation.mjs', 'scripts/test-p33-identity-http.mjs', 'scripts/test-p33-outbox.mjs',
]);
const requiredWrappers = new Map([
  ['tests/database.test.mjs', 'scripts/test-database.mjs'],
  ['tests/backend.test.mjs', 'scripts/test-backend.mjs'],
  ['tests/p3-browser.test.mjs', 'scripts/test-p3-browser.mjs'],
  ['tests/p33-registration-profile.test.mjs', 'scripts/test-p33-registration-profile.mjs'],
  ['tests/p33-verification.test.mjs', 'scripts/test-p33-verification.mjs'],
  ['tests/p33-recovery.test.mjs', 'scripts/test-p33-recovery.mjs'],
  ['tests/p33-password-change.test.mjs', 'scripts/test-p33-password-change.mjs'],
  ['tests/p33-mail-deadline.test.mjs', 'scripts/test-p33-mail-cancellation.mjs'],
  ['tests/p33-identity-http.test.mjs', 'scripts/test-p33-identity-http.mjs'],
  ['tests/p33-account-mail-outbox.test.mjs', 'scripts/test-p33-outbox.mjs'],
]);
const groupedWrappers = new Map([
  ['registration-profile', ['registration', 'account', 'sessions', 'lifecycle']],
  ['verification', ['confirm', 'resend']],
  ['recovery', ['request', 'issuance', 'confirm']],
  ['password-change', ['core', 'guards', 'ip', 'races']],
]);
function validateGroups(entries, routes) {
  const errors = [];
  for (const [name, groups] of groupedWrappers) {
    const file = `tests/p33-${name}.test.mjs`;
    if (!entries.includes(file)) continue;
    const assigned = routes.filter(route => route.files?.includes(file)).map(route => route.command?.[2]);
    for (const group of groups) if (!assigned.includes(`--group=${group}`)) errors.push(`Missing group ${name}:${group}`);
    for (const arg of assigned) if (!groups.some(group => arg === `--group=${group}`)) errors.push(`Invalid group ${name}:${arg}`);
  }
  return errors;
}
export function validateCompleteRoutes({ entries, exclusions, routes }) {
  const errors = [], available = new Set(entries), omitted = new Set(entries), ids = new Set();
  const excluded = new Set(exclusions.map(item => item.path));
  for (const route of routes) {
    if (!route.id || ids.has(route.id)) errors.push(`Duplicate or missing route id: ${route.id}`);
    ids.add(route.id);
    if (!['fast', 'owned', 'wrapper'].includes(route.kind) || !Array.isArray(route.files) || !route.files.length) {
      errors.push(`Invalid route: ${route.id}`); continue;
    }
    if (route.kind === 'wrapper' && (route.command?.[0] !== 'node' || !allowedWrappers.has(route.command?.[1]))) errors.push(`Unknown wrapper: ${route.id}`);
    if (route.kind === 'wrapper' && Array.isArray(route.command)) {
      const script = route.command[1];
      const grouped = [...groupedWrappers.keys()].some(name => script === `scripts/test-p33-${name}.mjs`);
      const deadline = script === 'scripts/test-p33-mail-cancellation.mjs';
      if (route.command.length !== (grouped || deadline ? 3 : 2) || (deadline && route.command[2] !== '--deadline'))
        errors.push(`Invalid wrapper arguments: ${route.id}`);
    }
    for (const file of route.files) {
      if (!available.has(file) || excluded.has(file)) errors.push(`Unknown or excluded route file: ${file}`);
      const required = requiredWrappers.get(file);
      if (required && (route.kind !== 'wrapper' || route.command?.[1] !== required)) errors.push(`Required wrapper: ${file}`);
      omitted.delete(file);
    }
  }
  for (const file of omitted) errors.push(`Unrouted: ${file}`);
  return errors.concat(validateGroups(entries, routes));
}
