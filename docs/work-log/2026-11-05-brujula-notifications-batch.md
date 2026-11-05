# Notificaciones read-all — en curso

- Agent / role: worker
- Session or task ID: /root/brujula_account_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula / compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: Brújula completa; revisión brujula_complete_review
- Status: in_progress

## Request and scope
Corregir marcar todas para121+avisos sin Nmutaciones/ratebudget, con endpoint atómico/idempotente, autorización idéntica, locks aulas ordenados y recheck. Sin cambiar presupuestos ni builds simultáneos.

## Work performed
Reviewer confirmó reproducción120leídas/1pendiente al pedir121. Leídas selecciones wall/academic/grade, contexto transaccional, HTTP/proxy/bindings/UI. Skill harness-tdd-qa consultada para RED/GREEN/seguridad. Plan: POST notifications/read-all {} -> {read:true,updatedCount}; descubrir solo aulas visibles/unread, lockclases ordenado, rechecklos3predicados y UPDATE en una transacción. Archivadas siguen legibles.

## Verification
Pendiente RED UI121+ y SQL.

## Commits and outcomes
Sin commits.

## Handoff
Implementar pruebas y endpoint. Usar TS real contra fixture PostgreSQL desechable para evitar build mientras root trabaja.

## Frozen implementation

New contract: POST /api/v1/classrooms/notifications/read-all with exact empty object body; response {read:true,updatedCount:number}. No browser ids, recipients, queries or actor input accepted. Existing HTTP admission, CSRF proxy forwarding, authenticated write runner and120mutation budget remain unchanged; batch consumes one write unit.

- apps/api/src/classrooms/notification-page.ts: readAllVisibleNotifications reuses exact WALL/academic/grade visible-target SQL predicates, discovers only unread authorized classroom ids, locks classrooms ORDER BY id FOR UPDATE and reevaluates all predicates in UPDATE after locks. Update additionally gates recipient, discovered classroom ids and read_atISNULL. Archived classroom readability retained; no class revision changes. Zero matches returns count0; repeated call preserves timestamps.
- wall.ts: public readAllNotifications wraps helper in one runwrite transaction.
- composition.ts/composition-bindings.ts: explicit method delegation and bound method.
- http.ts/classroom-proxy.ts: narrow exact empty POST route before per-id operations. No broadened budgets/permissions.
- Notifications.tsx: markAll now one read-all POST then current-generation readback; no unread cursor walk or per-id mutation loop. Existing abort/stale/error/filter behavior remains.
- tests/brujula-notifications-complete.test.mjs updated first test to approved single mutation contract; tests/brujula-notifications-batch.test.mjs and batch-database added. Root owns suite inventory update.

## Observed RED/GREEN evidence

- RED node --test tests/brujula-notifications-batch.test.mjs before production:2FAIL. UI requested121unread but issued individual read calls; valid batch proxy route404.
- RED node --test tests/brujula-notifications-batch-database.test.mjs:1FAIL because readAllNotifications missing, before starting fixture.
- GREEN node --test tests/brujula-notifications-batch.test.mjs:2PASS. Covers121unread→onePOST+readback; exact empty envelope, directAPI/proxy rejected ids/actor/recipient/query/GET and verified cookie+CSRF admission forwarding.
- GREEN node --test tests/brujula-notifications-batch-database.test.mjs:1PASS (~10.6s); P5 owned database cleanup exit0. Uses actual current TS WallService/ClassroomCore through loader, existing fixture builds only for unrelated setup; no build invoked.121WALL+academic+grade visible entries, rollback on injected update trigger, budgetincrement1, timestamp-idempotent repeated call, excludes other recipient/revoked membership/invalid WALL_REPLY parent, permits archived visible rooms. Race pauses after authorized discovery while other transaction holds classroom lock, commits revocation, then batch recheck updates0 and unread row remains untouched.
- Final node --test tests/brujula-notifications-batch.test.mjs tests/brujula-notifications-complete.test.mjs tests/notifications-presentation.test.mjs tests/audit-notifications-contract.test.mjs:10PASS/0FAIL.
- npx eslint apps/api/src/classrooms/wall.ts apps/api/src/classrooms/notification-page.ts apps/api/src/classrooms/http.ts apps/api/src/classrooms/composition.ts apps/api/src/classrooms/composition-bindings.ts apps/web/src/lib/classroom-proxy.ts apps/classrooms-ui/Notifications.tsx:exit0.
- node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --incremental false:exit0; equivalent apps/web:exit0. No artifacts/builds generated.
- Scoped git diff --check exit0 after removing extra EOF blankline Notifications.

## Review and exact handoff

Reviewer /root/brujula_complete_review consulted before implementation: require identical target/access predicates, ordered classroom locks+recheck, archived readability, one budget. Reviewer read helper during implementation and reported no additional race finding; final candidate freeze sent for revalidation. Root notified freeze and can build/E2E now; this agent changes only own record afterward. No production/retained DB, secrets, real providers, commits or publication accessed. Status in_progress until coordinator completes independent review and global acceptance.
