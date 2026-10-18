# FoxMind implementation roadmap

**Resume here (2026-10-18): P3 and integrated P4 are completed and published to main.** Local merge `d22c522` is on `codex/p4-p3-integration`, combining accepted P3 `5e86d1e` and isolated P4 `a3fb61e`. [Independent verification](work-log/2026-10-18-p4-verify-final.md) passed combined9/P3browser10/focused36, fresh builds, six migrations/drift0, real private storage/scanning, restart persistence and cleanup0. Parent controls5PASS and own legacy P4 checks67PASS. Start with [integration tasks](../odd/tasks/p4-p3-integration.md), [coordinator](work-log/2026-10-17-root-p4-integration.md) and [guide](p4-integration.md). Historical P3 pipeline81PASS/1FAIL remains attributed with baseline-reproduced1500ms startup timing; it is not global pipeline PASS. Native review off/global, disabled/unmanaged. P3 + P4 publication to main was explicitly authorized and remotely confirmed on2026-10-18 at299cfe9; see [delivery record](work-log/2026-10-18-root-p4-main-publication.md). STOP before P5; no deployment is authorized. Original P3 checkout and retained development data remain preserved.

P3's accepted twelve account/session operations, initial Next.js screens and real browser/API/SQL/captured-email journeys remain documented in [final verification](work-log/2026-10-17-p3-verify-final.md), [coordinator](work-log/2026-10-17-id-unavailable-p3-completion.md), [tasks](../odd/tasks/p3-completion.md) and [web guide](p3-web.md). Historical backend99/control39/browser10/live web16 and strict builds/audit0/cleanup0 are evidence for that accepted checkpoint, not fresh results for the P4 candidate.

## Historical checkpoints (superseded execution status)

The following dated preparation failures and decision holds remain historical evidence. They are not current permission gates: the latest full P3 completion authorization supersedes their proposed next actions. No failed run is converted to PASS.

Last reconciled:2026-10-16. T3-V parent actual build/72PASS and independent fresh build/41PASS with reported actual cleanup0, no blocker. Local F404a94a, proofc81b810, core2fecee9 and orchestration769db2f; checkpoint metadata closure is being recorded. Native assessment unavailable/package-local-binary-missing, not approved or waived. Historical T2 closure2c1b4df parent56/independent33 and its human-selected natively-unreviewed disposition retain their own scope; no RDD switch change/future waiver. Earlier foundation/P3.1/P3.2 dispositions unchanged.

**Current blocker:** recovery candidate passed parent88/actual build0, but its independent verifier stopped at preparation exit1 on an invented minimum declaration-file assertion. All five assigned checks remain unrun; no application failure or independent acceptance was established. [Attributed partial report](work-log/2026-10-16-mvbovr28-p33-recovery-verification.md), [current coordinator/handoff](work-log/2026-10-16-01a14539-p33-recovery.md). Await explicit human disposition before any preflight correction/verification; accepted checkpoint stays nine, P3 is not complete, source/tests remain frozen.

**2026-10-17 superseding handoff:** user authorized correcting preparation and closing P3 only, without integrating P4/P5. Preparation now passed88-file inventory/hash equality, including zero actual declaration files. First independent pure check failed14PASS/1FAIL on a synthetic child null exit with a2000ms helper timeout; real build and three recovery groups remain unrun. [Current attributed report](work-log/2026-10-17-recovery-verify.md), [current coordinator](work-log/2026-10-17-id-unavailable-p3-completion.md). Await bounded synthetic-deadline correction disposition under the newly supplied AGENTS failure policy. Accepted checkpoint remains nine; no runtime recovery acceptance or P3 closure. The earlier preparation failure above is historical and resolved by the new preparation, not erased.

**Latest 2026-10-17 update:** user approved synthetic2000→5000ms only. Fresh90-file snapshot passed and targeted synthetic recheck1PASS. The following real build failed during Prisma generation (exit1/30156ms, `Prisma generation: exit unavailable`, no stderr or TypeScript); recovery groups remain unrun. [Latest independent report](work-log/2026-10-17-recovery-recheck.md). P3 remains blocked on unavailable build proof pending a bounded diagnostic decision; no automatic retry/budget increase. Native review is now observed off/global, disabled/unmanaged. No P4/P5 integration.

Authorized diagnostic subsequently confirmed ETIMEDOUT/SIGTERM at30035ms, within the unchanged configured30s ceiling. Trace stops while loading the Prisma config module; underlying cause is unproven. [Diagnostic/handoff](work-log/2026-10-17-prisma-startup-diagnostic.md). No source fix, new timeout or runtime acceptance; next proposed diagnostic isolates module loading without generation.

Current objective is **close P3 and stop** (user: "Bueno tu nuevo objetivo es cerrar P3 y terminar ahi"). P4 is outside this task. Necessary safe P3 decisions remain limited to session01a14539-ab7b-77dc-8eee-546a8c3dd168: [scope/tasks](../odd/tasks/p3-completion.md). No future-session, publication, destructive-data, sensitive-file or native-consent authority is inferred. Original P3.3 feature/coordinator records remain unchanged under separate historical document-only authority; use the linked current companion records rather than their older T2 state.

## Read and reconcile before continuing

1. Read [AGENTS.md](../AGENTS.md) and this roadmap.
2. Inspect the current branch, commit and working-tree changes. Compare them with the checkpoints below; never discard existing work to match a document.
3. Read the applicable [work records](work-log/README.md), linked feature task document and relevant functional-spec sections.
4. Continue the first unfinished authorized task. If status/proof conflicts, record the discrepancy before proceeding; do not silently assume a phase is complete.

### Sources of truth

| Source | Owns |
|---|---|
| [Functional specification](foxmind-v1-functional-spec.md) | Confirmed product rules, boundaries and acceptance examples. |
| [Visual reference index](visual-reference-index.md) | Supplied29screenshots, visual direction and functional overrides. Screenshots are not implementation evidence. |
| This roadmap | Phase order, current checkpoint, next work and links to detailed evidence. |
| `odd/tasks/` | Detailed specifications/tasks/checks for tracked implementation units, when applicable. |
| [Per-agent work records](work-log/README.md) | Who did what, scope, observed checks, commits, blockers and exact handoff. |

The specification's original "completion boundary" describes its earlier documentation-only milestone. It is not the current implementation status. Later authorized work is evidenced below; product rules still come from that specification. A work record or old consent note does not grant current permission to publish, perform destructive work or change scope.

## Phase overview

| ID | Phase | Status | Outcome / dependency |
|---|---|---|---|
| P0 | Product and visual definition | completed | V1 rules and22decisions closed;29local visual references reviewed. |
| P1 | Architecture and data model | completed | Next.js/React/TypeScript UI, modular NestJS backend, PostgreSQL/Prisma, private S3-compatible files; relational dictionary agreed. |
| P2 | Technical foundations | completed |33-table schema,3migrations, local PostgreSQL definition, minimal NestJS/Prisma server, health/lifecycle tests and dependency remediation. Not all supporting services or product APIs. |
| P3 | Identity/access and initial web foundation | completed | Accepted baseline`5e86d1e`: twelve operations, actual Next screens and independent account/browser evidence; preserve while integrating P4. |
| P4 | Private file infrastructure | completed | Real P3 session/CSRF and web binary connections, private S3/validation/scan/quarantine/quotas, authorized retrieval and persistent restart independently verified; [proof](work-log/2026-10-18-p4-verify-final.md). |
| P5 | Classrooms and enrollment | not_started | Creation/drafts, required plan/units/topics, invitations/codes, classroom-scoped roles, membership history and archive lifecycle. Requires P3/P4. |
| P6 | Teaching plan, Library and Muro | not_started | Plan maintenance/states, teacher-managed materials, student consultation and moderated publication/reply threads. |
| P7 | Activities, attempts and submissions | not_started | Authoring, practical assignments, questionnaires/evaluations, autosave, single editor, locks, deadlines, delivery and reopening. |
| P8 | Grading and follow-up | not_started | Exact scoring, teacher publication/corrections, effective grades, audit history, individual/class averages and progress. |
| P9 | Integrated local validation | not_started | Complete teacher/student journeys, authorization and failure paths, responsive behavior and local pilot preparation. |

Statuses: `not_started`, `in_progress`, `blocked`, `completed`. A blocked phase names the external decision/proof it awaits. Dropped or superseded tasks remain recorded as such; they never count as completed.

### Completed checkpoints: P0–P2

| Deliverable | Evidence |
|---|---|
| Product scope and visual direction | [Functional spec](foxmind-v1-functional-spec.md), [visual index](visual-reference-index.md). |
| Database model/migrations and isolated contracts | [Database task record](../odd/tasks/database-foundation.md), [operations](database.md), [verification](database-verification.md); implementation`5910345`, forward correction`489cce1`, evidence`373c56a`. |
| Minimal NestJS backend | [Backend task record](../odd/tasks/backend-foundation.md), [operations](backend.md), [verification](backend-verification.md); implementation`766f342`, evidence`3da7bde`. |
| Dependency alert remediation | [Security evidence](dependency-security.md); implementation`917bb39`, evidence`1c08fa3`. |

Last verified baseline: full npm audit0known vulnerabilities;8dependency regressions,7HTTP/backend contracts and38database contracts PASS, plus build, migration replay/status/drift and Prisma smoke. These are previously observed results, not checks rerun by this documentation change. Dependency remediation also received independent verification and acknowledged native approval; earlier foundation review dispositions remain recorded separately, not retrospectively changed.

### What is not implemented yet

- P5 classroom creation/enrollment/publication flows are not integrated. Isolated P5 work requires separate authorization and reconciliation, not automatic import.
- P6 plan/Library/Muro and P7–P9 activities/submissions/grading/full pilot journeys are not integrated by this P4 task.
- P4 `/files` operates on existing authorized contexts; test SQL fixtures do not implement the future classroom wizard or enrollment API.
- No production deployment or persistent development API/database service was established by disposable verification fixtures.
- Standalone logo/illustration/cover assets still need preparation; screenshots are not reusable brand assets.

Do not equate tables with working features, healthy connectivity with migration/domain correctness, or a clean audit with exhaustive security/production readiness. Framework close is tested; Windows signal-driven graceful shutdown remains unproven. Other non-blocking coverage limits are retained in the verification documents.

## Execution approach

Implement vertical slices where applicable: API contract and server behavior, matching web screens, then public-interface tests. Do not defer all UI work until the whole backend is finished. Start the Next.js shell during P3; evolve it with each module and the approved visual references.

Tests accompany every phase. P9 integrates complete journeys; it is not the first verification step. Notifications and durable processing are wired into the modules that generate events, rather than postponed entirely to P8/P9. Keep academic email notifications within the approved scope; not every academic event sends email.

<a id="p3--seven-backend-identity-operations-verified-t3-and-web-remain"></a>

### P3 — Identity backend and initial web

P3.1 contracts and P3.2 local email were completed at their attributed checkpoints. P3.3 now provides all twelve independently verified operations, including recovery and authenticated password change. P3.4 provides the actual Next/React/TypeScript/Tailwind account screens and bounded same-origin proxy; P3.5 proves the complete local browser/SQL/captured-mail journey. [Final independent proof](work-log/2026-10-17-p3-verify-final.md) retains old failed checks and one bounded correction for stream cancellation and same-document proof reopening. No whole-phase acceptance is inferred from tables or screenshots alone.

- [x] P3.1 — Account/session API contracts and security/abuse configuration against specification sections2,3and12: [guide](api/accounts-sessions.md), [OpenAPI](api/accounts-sessions.openapi.json), [coordinator evidence](work-log/2026-10-15-01a13fc3-p31-contracts.md), [independent review](work-log/2026-10-15-mva0p514-p31-contract-review.md).8offline contract checks and independent R1–R6 PASS at the contract-only checkpoint; seven endpoints were subsequently implemented and independently verified at T2.
- [x] P3.2 — Completed local inbox and real verification/recovery SMTP message capture without external delivery provider: [tasks](../odd/tasks/p32-local-email.md), [coordinator](work-log/2026-10-15-01a13fc3-p32-local-email.md). Captured messages retain trusted-origin fragments/lifetimes, recipient spelling and explicit uppercase-domain rejection; restart refresh/persistence/isolation verified. Development inbox http://127.0.0.1:8025, SMTP127.0.0.1:1025; stop with npm run mail:stop, preserve its volume. P3.2 itself implemented no account/token issuance/consumption or encrypted outbox; later T2 implements registration issuance/outbox, not token consumption.
- [x] P3.3 — All twelve identity/account operations independently verified, including token issuance/consumption, recovery, password change, session revocation, rejection and concurrent operations. [Detailed tasks](../odd/tasks/p33-token-flows.md).
- [x] P3.4 — Actual Next.js account shell/screens, truthful loading/errors, same-origin Nest proxy, memory-only proof capture and explicit confirmation. [Guide](p3-web.md), [tasks](../odd/tasks/p34-web.md).
- [x] P3.5 — Real registration → captured email → verification → sign-in → profile → sign-out and recovery/reuse/expiry/revocation/restart journeys; responsive320/375/1280px, keyboard focus and failure retry. [Independent10PASS and narrow correction proof](work-log/2026-10-17-p3-verify-final.md).

Exit condition: a person can actually create and verify an account, enter/leave a session and recover access through the local web/API/email flow, with server-enforced boundaries and applicable checks. Tables, mocked email or hidden navigation alone do not satisfy it.

### P4 — Private files

- Implement private S3-compatible storage and real inspection/scanning, with separate upload/validation/scan states.
- Enforce approved formats/limits, quarantine until checks succeed, authorized preview/download and classroom quota accounting.
- Verify failed/unavailable scanning stays blocked; clean only incomplete abandoned uploads, never confirmed drafts/history.

Exit condition: allowed files can be securely stored/retrieved by authorized users; unsafe/pending files remain inaccessible. Concrete tools and operational limits must be selected and verified before use, not inferred as already installed.

### P5 — Classrooms and enrollment

- Build the classroom wizard/private drafts with its required plan file and units/topics, cover catalog and fixed timezone.
- Implement classroom-scoped teacher/student permissions, invitations/codes and membership periods/re-entry history.
- Implement archive/reactivation, departure/removal and correct loss of access without deleting academic history.

Exit condition: a verified creator can publish a valid classroom and a different verified user can join through the approved flow; forbidden and archived operations are rejected without changing stored records.

### P6 — Teaching organization and communication

- Maintain units/topics and their manual states; preserve study-plan versions and constrained deletion rules.
- Implement Library materials/associations, teacher management and authorized student consultation.
- Implement Muro posts/replies and moderation tombstones; retain replies when a parent is removed.

Exit condition: teacher and student use the approved Plan/Library/Muro screens with their different capabilities enforced on the server.

### P7 — Activities and participation

- Build private authoring drafts/publication and the three approved activity types.
- Implement questions/options, practical attachments, actual autosave and server-enforced single-editor transfer.
- Implement immutable started content, deadlines/timezones, submission confirmation, preserved attempts and teacher reopening.

Exit condition: students can complete and submit each activity type under the correct eligibility/time/file rules without overwriting history or exposing answer keys.

### P8 — Grading and follow-up

- Implement exact scoring and round-half-up, private teacher correction and explicit publication.
- Implement effective-grade replacement and teacher-only published-grade correction audit, preserving attempts.
- Implement individual/class progress, averages and the notification center with current membership/record permissions.

Exit condition: published grades and metrics match the specification examples; missing work is not a zero and multiple attempts do not duplicate activity counts. Notifications for earlier implemented modules must already be connected as those modules land.

### P9 — Integrated local validation

- Exercise complete teacher/student workflows, cross-classroom authorization, revoked access and archived state.
- Verify responsive web layouts, empty/loading/error/retry states and real supporting-service failures/recovery.
- Prepare reproducible local setup, operational notes and a bounded local pilot checklist.

Exit condition: the approved V1 works end to end locally with its acceptance examples and explicit limitations, not merely isolated endpoint tests. Any production rollout remains a separate user decision.

## Work records and next-session handoff

Every agent must report its contribution through the [work-record protocol](work-log/README.md), including read-only reviewers via their coordinator. Use one record per agent/task/session; do not let parallel agents append to the same file.

Completed P3.1 records: [coordinator handoff](work-log/2026-10-15-01a13fc3-p31-contracts.md), [attributed read-only requirements map](work-log/2026-10-15-mv9zsb0p-p31-requirements-map.md) and [independent security/requirements review](work-log/2026-10-15-mva0p514-p31-contract-review.md). Historical consolidation record: [DOC-001](work-log/2026-10-15-01a13fc3-roadmap.md). Older completed work is evidenced by the task/verification documents above; no fictional historical agent logs are backfilled.

Completed P3.2 remains on local implementation0c0b0e9 plus evidence, not published main. T2 closure2c1b4df precedes current `feat/p33-token-flows`: [tasks](../odd/tasks/p33-token-flows.md), [coordinator](work-log/2026-10-16-01a14539-p33-token-flows.md), [independent verification](work-log/2026-10-16-mvbkihar-p33-verification-recheck.md). F404a94a/proofc81b810/core2fecee9/orchestration769db2f observed local commits; source631-line cohesive core needs a future review-workload exception before publication, not compression. Scope P3 only then STOP: [umbrella](../odd/tasks/p3-completion.md). Preserve broad mailbox/uppercase-domain policy; do not repeat completed preparation questions.

T2 historical parent56/independent33 and current T3-V parent72/independent41/actual builds and cleanup0 separately attributed. Retain initial confirmation RED exception, original4s failures and incomplete147-input snapshot as historical, never relabeled PASS; corrected178-input verification is a distinct first execution. Retain bounded inbox/idle-category/interleaving/default-budget/Windows limits. Native T3 assessment unavailable, not approved or waived; no switch/maintenance/publication authority. First unfinished product unit recovery request/confirmation, then password change, P3.4/P3.5; no P4 work by this coordinator.

## Deferred decisions and non-goals

Hosting/provider/budget/production quotas/deployment topology remain deferred until local validation. AI is outside V1. Do not introduce microservices, Redis, WebSockets or other infrastructure without a demonstrated need and the applicable decision. No push/PR/release is implied by a phase status, roadmap entry or completed work log.
