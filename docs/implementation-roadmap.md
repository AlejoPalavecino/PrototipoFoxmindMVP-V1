# FoxMind implementation roadmap

**Resume here:** P0–P2 and P3.1/P3.2 are completed. **P3.3 T2 now has seven implemented and independently verified backend operations:** session/CSRF, login/logout, registration and profile GET/PATCH. [Current execution/closure](../odd/tasks/p33-t2-execution.md), [coordinator](work-log/2026-10-16-01a14539-p33-t2-resume.md), [independent PASS](work-log/2026-10-16-mvb63m78-p33-t2-verification.md). Next: five T3 confirmation/resend/recovery/password-change operations. P3.4 web/P3.5 browser journey are not started; P3 remains incomplete.

Last reconciled: 2026-10-16. Committed D1 checkpoint:`3f63c58327508b31063c3ca91bce5d1f7be4c4f1`; T2 local work-unit commits are recorded in current execution/coordination records, never inferred here. Parent actual build/56 checks, independent build/33 checks and passive metadata/offline9 checks passed. Current T2 code/tests/docs are explicitly **natively unreviewed by human choice**, not approved; no RDD switch change or future review waiver follows. Historical foundation/P3.1/P3.2 checkpoints retain their own dispositions.

The current user authorized completing P3 and then P4 with safe technical decisions **only in session01a14539-ab7b-77dc-8eee-546a8c3dd168**: [scope/tasks](../odd/tasks/p3-completion.md). No future-session, publication, destructive-data, sensitive-file or native-consent authority is inferred. Original P3.3 feature/coordinator records remain unchanged under separate historical document-only authority; use the linked current companion records rather than their older T2 state.

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
| P3 | Identity/access and initial web foundation | in_progress | **P3.1 completed:** verified contracts/policies only. **P3.2 completed:** isolated SMTP capture/templates and independent verification. **P3.3 in_progress:** foundations and seven-operation T2 independently verified; five T3 operations pending. Web/P3.4 not started. |
| P4 | Private file infrastructure | not_started | Private storage, upload validation, real scanner, quarantine, authorized retrieval, quota and safe incomplete-upload cleanup. |
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

- No `apps/web` frontend or complete account verification/recovery flow. Backend registration/sign-in/profile/server sessions are implemented and independently verified at T2.
- No functional classroom/activity/grading API. Backend health and seven T2 identity/account operations are available; five T3 operations remain unimplemented.
- No private S3-compatible service or real scanner installed yet. Registration encrypted-outbox/mail lifecycle is verified; token confirmation/recovery remain T3. P4 begins after P3.
- No persistent development database/API server left running by the completed isolated test work.
- Standalone logo/illustration/cover assets still need preparation; screenshots are not reusable brand assets.

Do not equate tables with working features, healthy connectivity with migration/domain correctness, or a clean audit with exhaustive security/production readiness. Framework close is tested; Windows signal-driven graceful shutdown remains unproven. Other non-blocking coverage limits are retained in the verification documents.

## Execution approach

Implement vertical slices where applicable: API contract and server behavior, matching web screens, then public-interface tests. Do not defer all UI work until the whole backend is finished. Start the Next.js shell during P3; evolve it with each module and the approved visual references.

Tests accompany every phase. P9 integrates complete journeys; it is not the first verification step. Notifications and durable processing are wired into the modules that generate events, rather than postponed entirely to P8/P9. Keep academic email notifications within the approved scope; not every academic event sends email.

### P3 — Seven backend identity operations verified; T3 and web remain

P3.1 artifacts and independent contract verification are complete. P3.2 is completed: [feature tasks](../odd/tasks/p32-local-email.md), [operating guide](local-email.md), [standalone sender](mail-sender.md), [UNIT A](work-log/2026-10-15-mva2tlkx-p32-capture-review.md) and [UNIT B](work-log/2026-10-15-mva2tlrh-p32-sender-review.md). Parent suite75PASS/build/migrations/smoke/audit0; independent capture3/3 and sender19/19PASS. Earlier failed checks and authorized corrections remain attributed, not rewritten as initial passes. Both native assessments returned reviewDue:false/under_budget; no native review approval is claimed. P3.3 is now explicitly authorized and in progress; follow its current tasks rather than repeat completed P3.2. P3.4–P3.5 have not started; current session user authorization covers their completion after backend work. P3.2 capture alone did not implement authentication/encrypted issuance; subsequent T2 now implements registration/session/profile and encrypted registration mail. Confirmation/resend/recovery/password change remain T3; no completed P3 claim.

- [x] P3.1 — Account/session API contracts and security/abuse configuration against specification sections2,3and12: [guide](api/accounts-sessions.md), [OpenAPI](api/accounts-sessions.openapi.json), [coordinator evidence](work-log/2026-10-15-01a13fc3-p31-contracts.md), [independent review](work-log/2026-10-15-mva0p514-p31-contract-review.md).8offline contract checks and independent R1–R6 PASS at the contract-only checkpoint; seven endpoints were subsequently implemented and independently verified at T2.
- [x] P3.2 — Completed local inbox and real verification/recovery SMTP message capture without external delivery provider: [tasks](../odd/tasks/p32-local-email.md), [coordinator](work-log/2026-10-15-01a13fc3-p32-local-email.md). Captured messages retain trusted-origin fragments/lifetimes, recipient spelling and explicit uppercase-domain rejection; restart refresh/persistence/isolation verified. Development inbox http://127.0.0.1:8025, SMTP127.0.0.1:1025; stop with npm run mail:stop, preserve its volume. P3.2 itself implemented no account/token issuance/consumption or encrypted outbox; later T2 implements registration issuance/outbox, not token consumption.
- [ ] P3.3 — **IN PROGRESS:** foundations and seven T2 registration/sign-in/out/session/profile operations verified. Next five T3 operations: confirmation/resend, recovery request/confirmation and password change. No exclusive global teacher/student role. [Current execution](../odd/tasks/p33-t2-execution.md).
- [ ] P3.4 — Create the initial Next.js shell and corresponding registration/verification/sign-in/recovery/profile screens, including truthful loading/error states.
- [ ] P3.5 — Verify the complete registration → captured email → verification → sign-in → profile → sign-out journey, plus rejected/reused/expired tokens and previous-session revocation after recovery.

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

Completed P3.2 remains on the local feature chain at implementation0c0b0e9 plus evidence, not published main. Current P3.3 T2 is on local `feat/p33-registration-profile`: [execution/closure](../odd/tasks/p33-t2-execution.md), [coordinator](work-log/2026-10-16-01a14539-p33-t2-resume.md), [independent scoped PASS](work-log/2026-10-16-mvb63m78-p33-t2-verification.md), [metadata closure](work-log/2026-10-16-t2-closure-mvb6iyk6.md). Current scope is P3 then P4 only for this session: [tracked handoff](../odd/tasks/p3-completion.md). Preserve broad quoted/international mailbox support and uppercase-domain rejection; do not repeat completed policy/preparation questions.

T2 actual parent build/56PASS and independent build/33PASS include registration concurrency, SQL/counter outages, captured mail, rollback, session recheck and SMTP deadline/cancellation, with reported cleanup0. Offline/passive9PASS preserves normative contracts. Retain verifier limits (dedicated profile-budget exhaustion, bounded inbox absence, Windows signal/hard-kill timing, optional final snapshot rehash) and historical failures. T2 is explicitly natively unreviewed by human choice, not approved; no future consent or old-authority maintenance follows. Cohesive units exceeding400 review lines are recorded, not compressed; obtain any workload exception before publication. Next product work is T3, then P3.4/P3.5; P4 has not started.

## Deferred decisions and non-goals

Hosting/provider/budget/production quotas/deployment topology remain deferred until local validation. AI is outside V1. Do not introduce microservices, Redis, WebSockets or other infrastructure without a demonstrated need and the applicable decision. No push/PR/release is implied by a phase status, roadmap entry or completed work log.
