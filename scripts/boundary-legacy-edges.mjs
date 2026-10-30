// Historic module coupling: migrate each edge to the target public index.
export const legacyEdges = new Map([
  [
    "apps/api/src/classrooms/activity-authoring.ts -> ../files/service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/activity-history.ts -> ../files/service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/classrooms.module.ts -> ../database/prisma.service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/classrooms.module.ts -> ../identity/runtime.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/contracts.ts -> ../files/contracts.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/contracts.ts -> ../files/store.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/core.ts -> ../files/store.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/delivery.ts -> ../files/contracts.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/delivery.ts -> ../mail/mailbox.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/drafts.ts -> ../files/promotion.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/errors.ts -> ../identity/errors.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/host.ts -> ../identity/errors.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/host.ts -> ../identity/runtime.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/host.ts -> ../identity/transport.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/host.ts -> ../identity/session-query.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/invitations.ts -> ../mail/mailbox.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/library-cleanup.ts -> ../files/contracts.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/library-cleanup.ts -> ../files/storage.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/plan.ts -> ../files/service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/practical-submissions.ts -> ../files/service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/practical-submissions.ts -> ../files/store.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/session-readers.ts -> ../files/service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/classrooms/session-readers.ts -> ../files/store.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/attempt-bridge.ts -> ../classrooms/attempt-access.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/attempt-bridge.ts -> ../classrooms/attempt-policy.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/attempt-bridge.ts -> ../classrooms/policy.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/files.module.ts -> ../database/prisma.service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/files.module.ts -> ../identity/runtime.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/host.ts -> ../identity/errors.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/host.ts -> ../identity/runtime.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/host.ts -> ../identity/transport.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/host.ts -> ../identity/session-query.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/files/store.ts -> ../identity/errors.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/health/health.controller.ts -> ../database/prisma.service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/identity/errors.ts -> ../mail/mail-error.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/identity/identity.module.ts -> ../database/prisma.service.ts",
    "Existing module wiring pending public API migration"
  ],
  [
    "apps/api/src/identity/persistence.ts -> ../database/prisma.service.ts",
    "Existing module wiring pending public API migration"
  ]
]);
