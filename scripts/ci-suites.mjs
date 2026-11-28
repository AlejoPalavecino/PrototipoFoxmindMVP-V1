// Deliberate inventory: no helper discovery or opt-in/live-provider tests.
export const suites = {
  study: [
    'tests/monthly-ai-quota-database.test.mjs',
    'tests/study-image-database.test.mjs',
    'tests/ai-monthly-budget-database.test.mjs',
    'tests/ai-quota-completion-race.test.mjs',
    'tests/study-source-concurrency-database.test.mjs',
    'tests/study-ui-audit-regressions.test.mjs',
    'apps/web/src/features/study/model/study-discovery.test.mjs',
    'apps/web/src/features/study/model/study-file-policy.test.mjs',
    'apps/api/src/modules/study/generation/application/engine.test.ts',
    'apps/api/src/modules/study/folders/infrastructure/tests/policy.test.ts',
    'apps/api/src/modules/study/folders/infrastructure/tests/service.test.ts',
    'apps/api/src/modules/study/sources/infrastructure/uploads/upload-policy.test.mjs',
    'apps/api/src/modules/study/reviews/infrastructure/tests/session-event.test.mjs',
    'apps/web/src/features/study/api/study-client.test.mjs',
    'apps/web/src/features/study/model/study-payload.test.mjs',
    'apps/web/src/features/study/model/study-sequence.test.mjs',
    'apps/api/src/modules/study/folders/infrastructure/tests/database.test.mjs',
    'apps/api/src/modules/study/folders/infrastructure/tests/http.test.mjs',
    'apps/api/src/modules/study/folders/infrastructure/tests/integrations.test.mjs',
  ],
  pure: [
    'tests/choice-order.test.mjs',
    'tests/ci-local.test.mjs',
    'tests/ci-pr-gate.test.mjs',
    'tests/test-timeout-scale.test.mjs',
    'tests/ai-text-tuning.test.mjs',
    'tests/study-chat-preview.test.mjs',
    'tests/study-shared-strategy-policy.test.mjs',
    'tests/teacher-writing-policy.test.mjs',
    'tests/teacher-support-extension-ui.test.mjs',
    'tests/teacher-support-backend-policy.test.mjs',
    'tests/teacher-support-postgres-options.test.mjs',
    'tests/teacher-support-ui.test.mjs',
    'tests/ai-cost-reconciliation.test.mjs',
    'tests/monthly-ai-quota-errors.test.mjs',
    'tests/monthly-ai-quota-client.test.mjs',
    'apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-turn-stream.test.mjs',
    'apps/api/src/platform/ai/text-client.test.mjs',
    'tests/backend-academic-runtime.test.mjs',
    'apps/api/src/modules/study/generation/application/tests/generation-transaction-phases.test.mjs',
    'apps/api/src/modules/foxy/resources/infrastructure/tests/foxy-resource-editorial-policy.test.mjs',
    'apps/api/src/modules/foxy/resources/application/editorial-policy.test.mjs',
    'apps/api/src/modules/foxy/private-assets/infrastructure/tests/foxy-private-editorial-policy.test.mjs',
    'apps/api/src/modules/foxy/citations/infrastructure/tests/foxy-citation-attachment-port.test.mjs',
    'apps/api/src/modules/foxy/citations/application/citation-service-policy.test.mjs',
    'tests/backend-academic-routes.test.mjs',
    'apps/api/src/modules/study/generation/infrastructure/providers/study-response-schema.test.mjs',
    'apps/api/src/modules/study/generation/application/tests/generation-protocol.test.mjs',
    'apps/api/src/modules/participation/attempts/application/repository-contracts.test.mjs',
    'apps/api/src/modules/materials/publication/application/publication.test.mjs',
    'apps/api/src/modules/materials/library/application/library-repository.test.mjs',
    'apps/api/src/modules/materials/library/application/contracts.test.mjs',
    'apps/api/src/modules/home/notifications/infrastructure/repository.test.ts',
    'apps/api/src/modules/home/notifications/infrastructure/projections.test.ts',
    'apps/api/src/modules/home/notifications/application/inbox.test.ts',
    'apps/api/src/modules/grading/review/application/repository-contracts.test.mjs',
    'apps/api/src/modules/curriculum/generation/application/service.test.mjs',
    'apps/api/src/modules/curriculum/generation/application/request-policy.test.mjs',
    'apps/api/src/modules/curriculum/generation/application/repository.test.mjs',
    'apps/api/src/modules/communication/wall/application/wall.test.ts',
    'apps/api/src/modules/classrooms/memberships/application/membership-behavior.test.ts',
    'apps/api/src/modules/classrooms/invitations/application/batch-behavior.test.ts',
    'apps/api/src/modules/classrooms/drafts/infrastructure/classrooms-persistence.test.ts',
    'apps/api/src/modules/classrooms/drafts/application/publication.test.ts',
    'apps/api/src/modules/activities/generation/application/service.test.mjs',
    'apps/api/src/modules/activities/generation/application/request-policy.test.mjs',
    'apps/api/src/modules/activities/generation/application/repository.test.mjs',
    'apps/api/src/modules/activities/generation/application/apply.test.mjs',
    'apps/api/src/modules/activities/generation/application/apply-repository.test.mjs',
    'apps/api/src/modules/agenda/academic-projection/application/academic-agenda-service.test.mjs',
    'apps/api/src/modules/files/uploads/application/receive-http.test.mjs',
    'apps/api/src/modules/files/uploads/application/receive-authorization.test.mjs',
    'apps/api/src/modules/identity/accounts/application/runtime-lifecycle.test.mjs',
    'tests/backend-authoring-repository.test.mjs',
    'tests/frontend-study-workspace-views.test.mjs',
    'tests/study-tool-drafts-ui.test.mjs',
    'tests/frontend-study-step-views.test.mjs',
    "tests/frontend-boundaries.test.mjs",
    "tests/frontend-participation-cases.test.mjs",
    "tests/frontend-authoring-cases.test.mjs",
    "tests/activity-question-review.test.mjs",
    "tests/frontend-classroom-workflows.test.mjs",
    "tests/frontend-foxy-cases.test.mjs",
    "tests/frontend-grading-cases.test.mjs",
    "tests/frontend-grading-discard.test.mjs",
    "tests/frontend-materials-cases.test.mjs",
    "tests/frontend-study-cases.test.mjs",
    "tests/frontend-study-context.test.mjs",
    'tests/ai-execution-snapshot.test.mjs',
    'tests/ai-generation-snapshots.test.mjs',
    'tests/ai-grading-snapshots.test.mjs',
    'tests/ai-foxy-execution-snapshot.test.mjs',
    'tests/ai-profile-client.test.mjs',
    'tests/ai-chat-latency.test.mjs',
    'tests/ai-text-execution.test.mjs',
    'tests/ai-official-transports.test.mjs',
    'tests/ai-sdk-clients.test.mjs',
    'tests/study-ai-execution.test.mjs',
    'tests/ai-foxy-preflight-budget.test.mjs',
    'tests/architecture-host.test.mjs',
    'tests/study-runtime.test.mjs',
    'tests/agenda-ux-navigation.test.mjs',
    'tests/teacher-home-polish.test.mjs',
    'tests/home-order.test.mjs',
    'tests/expedition-access.test.mjs', 'tests/expedition-navigation.test.mjs', 'tests/expedition-home.test.mjs', 'tests/expedition-classrooms.test.mjs', 'tests/expedition-library.test.mjs', 'tests/expedition-settings.test.mjs', 'tests/expedition-activities.test.mjs', 'tests/expedition-agenda.test.mjs', 'tests/expedition-notifications.test.mjs', 'tests/expedition-profile.test.mjs', 'tests/expedition-desk.test.mjs', 'tests/foxy-chat-layout-tools-rail.test.mjs', 'tests/study-folder-progress.test.mjs', 'tests/study-collection-progress.test.mjs', 'tests/foxy-quiz-format.test.mjs',
    'tests/p8-ui-contract-helpers.test.mjs',
    'apps/api/src/modules/classrooms/access/infrastructure/context-run.test.ts', 'apps/api/src/modules/curriculum/plan/application/plan.test.ts', 'apps/api/src/modules/files/uploads/application/file-use-cases.test.mjs', 'apps/api/src/modules/identity/accounts/application/runtime.test.mjs',
    'tests/grading-participation-modules.test.mjs',
    'tests/foxy-feature.test.mjs', 'tests/study-feature.test.mjs', 'tests/academic-features.test.mjs', 'tests/technical-backend-modules.test.mjs', 'tests/academic-backend-modules.test.mjs',
    'tests/identity-feature.test.mjs', 'tests/identity-composition.test.mjs',
    'tests/agenda-module.test.mjs', 'tests/agenda-feature.test.mjs',
    'apps/shared-ui/chat-follow.test.mjs',
    'apps/api/src/modules/study/generation/application/engine.test.ts',
    'apps/api/src/modules/study/folders/infrastructure/tests/policy.test.ts',
    'apps/api/src/modules/study/folders/infrastructure/tests/service.test.ts',
    'apps/api/src/modules/study/sources/infrastructure/uploads/upload-policy.test.mjs',
    'apps/api/src/modules/study/reviews/infrastructure/tests/session-event.test.mjs',
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
    'tests/audit-scheduler-diagnostics.test.mjs', 'tests/audit-resource-lazy.test.mjs', 'tests/home-diagnostics.test.mjs',
  ],
  transport: [
    'tests/teacher-support-backend-http.test.mjs',
    'tests/teacher-support-transport.test.mjs',
    'tests/monthly-ai-quota-transport.test.mjs',
    'tests/agenda-client-http.test.mjs',
    'tests/proxy-rejection-lifecycle.test.mjs',
    'tests/ux-chat-polish.test.mjs',
    'apps/web/src/features/study/model/study-discovery.test.mjs',
    'apps/web/src/features/study/model/study-file-policy.test.mjs',
    'apps/web/src/features/study/api/study-client.test.mjs',
    'apps/web/src/features/study/model/study-payload.test.mjs',
    'apps/web/src/features/study/model/study-sequence.test.mjs',
    'tests/pending-classrooms.test.mjs',
    'tests/p3-web-client.test.mjs', 'tests/p3-web-proxy.test.mjs', 'tests/p4-web-proxy.test.mjs', 'tests/web-security-headers.test.mjs',
    'tests/agenda-proxy.test.mjs', 'tests/web-proxy-transport.test.mjs', 'tests/http-admission.test.mjs', 'tests/p9-home-client.test.mjs', 'tests/p6-wall-client.test.mjs',
    'tests/p7-authoring-proxy.test.mjs', 'tests/p8-grading-proxy.test.mjs',
    'tests/activity-ai-proxy.test.mjs', 'tests/audit-wall-proxy.test.mjs', 'tests/classroom-query-forwarding.test.mjs', 'tests/classroom-body-forwarding.test.mjs', 'tests/classroom-attempt-forwarding.test.mjs', 'tests/file-proxy-upload-deadline.test.mjs', 'tests/study-upload-deadline.test.mjs', 'tests/api-error-characterization.test.mjs',
    'tests/client-address.test.mjs', 'tests/proxy-client-address.test.mjs', 'tests/study-proxy-upload-streaming.test.mjs',
  ],
  'integration-owned': [
    'tests/ai-execution-policy-database.test.mjs',
    'tests/database-roles.test.mjs',
    'tests/ai-budget-owner-lock-database.test.mjs',
    'tests/foreign-key-indexes-database.test.mjs',
    'tests/database-backup-restore.test.mjs',
    'tests/classroom-code-digest-database.test.mjs',
    'tests/data-retention-database.test.mjs',
    'tests/ai-study-profile-database.test.mjs',
    'tests/ai-study-reservation-database.test.mjs',
    'tests/home-order-database.test.mjs',
    'apps/api/src/modules/study/folders/infrastructure/tests/database.test.mjs',
    'apps/api/src/modules/study/folders/infrastructure/tests/http.test.mjs',
    'apps/api/src/modules/study/folders/infrastructure/tests/integrations.test.mjs',
    'tests/pending-classrooms-database.test.mjs',
    'tests/p6-wall.test.mjs',
    'tests/p4-integration.test.mjs', 'tests/agenda-database.test.mjs',
    'tests/p6-wall-integration.test.mjs', 'tests/p7-authoring-integration.test.mjs',
    'tests/p8-grading-integration.test.mjs', 'tests/grading-ai-integration.test.mjs',
    'tests/audit-wall-database.test.mjs', 'tests/audit-notifications-database.test.mjs',
    'tests/audit-activity-ai-lock.test.mjs',
    'tests/audit-lock-concurrency.test.mjs',
    'tests/audit-wall-http-database.test.mjs',
    'tests/classroom-body-api-database.test.mjs',
    'tests/classroom-attempt-api-database.test.mjs',
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

// PR gate: the owned-db files that guard security and access, run with every identity wrapper
// route by `run-complete-suite --group critical`. They stay routed in owned-db for the full suite.
// Areas: file custody, AI cost limits, classroom membership and codes, exclusive roles, grading AI authorization.
export const criticalOwnedFiles = [
  'apps/api/src/modules/files/custody/infrastructure/tests/chat-attachment-custody.test.mjs',
  'apps/api/src/modules/files/custody/infrastructure/tests/chat-attachment-transfer.test.mjs',
  'apps/api/src/modules/files/custody/infrastructure/tests/foxy-begin-transaction.test.mjs',
  'apps/api/src/modules/files/custody/infrastructure/tests/foxy-private-asset-files.test.mjs',
  'apps/api/src/modules/files/custody/infrastructure/tests/foxy-publication-files.test.mjs',
  'tests/agenda-identity.test.mjs',
  'tests/ai-study-profile-database.test.mjs',
  'tests/ai-study-reservation-database.test.mjs',
  'tests/ai-monthly-budget-database.test.mjs',
  'tests/ai-quota-completion-race.test.mjs',
  'tests/monthly-ai-quota-database.test.mjs',
  'tests/audit-lock-concurrency.test.mjs',
  'tests/exclusive-account-role.test.mjs',
  'tests/grading-ai-authorization.test.mjs',
  'tests/p5-codes-invitation-batches.test.mjs',
  'tests/p5-enrollment.test.mjs',
  'tests/pending-classrooms-database.test.mjs',
];
