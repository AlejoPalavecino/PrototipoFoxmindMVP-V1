# Permanent local demo — operational contract

ESTADO_DISENO: LISTO_PARA_TDD_RED

Ready for bounded operational provisioning through existing APIs. RED is not applicable: this task changes synthetic development data only, with no product contract, source, schema or dependency change. This record specifies intended outcomes; it does not claim that accounts or data have been created.

- Agent / role: /root/permanent_demo_design, architect.
- Session or task ID: /root/permanent_demo_design; host memory identity unavailable.
- Date: 2026-10-26, America/Buenos_Aires.
- Branch / worktree: main, canonical checkout.
- Starting commit: b97098f42302bee92d2142ba35e1ab56808c548c.
- Phase: operational permanent-demo setup; no P0–P9 phase reopening.
- Status: completed (design only; provisioning remains the coordinator's task).
- Scope authority: [current coordinator](2026-10-26-root-permanent-demo.md); [retained local startup](2026-10-25-root-main-local-start.md) supplies environment history, not additional mutation consent.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

The coordinator alone provisions data and owns its private durable journal. This agent owns only this document. Other agents' source, logs and runtime state remain theirs; no shared roadmap edit is required. Use the admitted retained launcher and its current environment binding. A new worktree or contract micro-PR adds no protection to these API data operations.

The primary verified synthetic account teaches Mathematics and Literature and studies Biology. One companion verified synthetic account studies the first two and teaches Biology. Roles come from classroom ownership/membership; no global role or same-classroom dual role is created. Use the previously requested synthetic primary account if its current login identifies it as the intended account; do not reset a password or adopt an existing account merely because a registration response is 202.

Reversible content conventions: academic year 2026, division Demo, zone America/Argentina/Buenos_Aires, an admitted predefined cover, short Spanish synthetic content, one unit with two topics per classroom. The two companion names must clearly identify demonstration accounts. No student personal data, AI/provider calls or AI extraction is needed. Dates are computed once from the successful provisioning day and retained in the journal; rerunning never silently extends deadlines.

| Classroom | Primary / companion | Initial content and state |
|---|---|---|
| Matemáticas · Demo | teacher / student | Approved plan, one approved Library PDF, one published questionnaire with one development question, companion submission confirmed and left ungraded for primary review. |
| Literatura · Demo | teacher / student | Approved plan, one approved Library PDF, one published practical assignment with written instructions and optional attachments; companion has not submitted. |
| Biología · Demo | student / teacher | Approved plan, one approved Library PDF, one published evaluation with one development question; primary has not started/submitted. |

All memberships precede activity publication. Each activity selects its classroom's real unit/topic IDs and has a future classroom-local deadline, for example provisioning day +7/+10/+14 days at 18:00. This creates actual expected work and upcoming deadlines. Add two personal events to the primary account, one timed and one all-day; these are private and do not publish classroom activities. No automatic cleanup runs at completion.

## DoR in six dimensions

| Dimension | Operational decision |
|---|---|
| Data / idempotency | Bind stable actor/resource IDs to this environment in a durable journal. Names are labels, never unique keys: classroom names need not be unique. Reconcile every uncertain write before retrying. |
| States | Preserve private classroom draft → approved plan → published classroom → explicit membership → activity draft → saved → explicitly published. File selection/upload is not approval; started/saved work is not a submission. |
| Failure / atomicity | Each API command is independent; partial creation is retained and journaled. Resume the first incomplete stage. No rollback by deleting persistent actors/content and no assumption of a transaction across requests. |
| Concurrency | One coordinator process plus an exclusive local provisioning lock. Re-read the resource revision before each compare-and-swap mutation. On 409 reconcile; do not overwrite user edits or retry stale bodies. |
| Permissions | Separate cookie jars per actor, verified session, same-origin web API, Origin and fresh CSRF on writes. Read addressed verification mail only; keep proof, cookies, editor tokens and CSRF in memory. |
| GRASP | Existing identity/classroom/file/Agenda APIs remain the information experts. The provisioner orchestrates commands; it does not import persistence internals, update SQL, bypass scans or add a product abstraction. |

No unresolved business decision prevents this bounded setup. Lack of retained-runtime readiness is an operational prerequisite to report separately, not evidence that the design is ambiguous.

## CONTRATOS_Y_PLAN_POR_SLICE

All paths below use the running web origin plus `/api/v1`. The coordinator must confirm the actual running origin rather than reuse historical ports blindly. JSON writes carry `Content-Type: application/json`, the session cookie, Origin and `X-CSRF-Token` obtained from `GET /auth/csrf`. Binary content uses `application/octet-stream`. All state reads bypass caches.

1. **Identity:** `POST /auth/register` with `{firstName,lastName,email,password}` only for a new journal-bound actor; `POST /auth/login` with `{email,password}`; confirm the matching captured proof using `POST /auth/email-verification/confirm` with `{token}`. Verify the authenticated session and account identity. A masked registration response is not proof of new ownership. Reuse a successful login on rerun.
2. **Classroom:** inventory `GET /classrooms` and `GET /classrooms/drafts`; create `POST /classrooms/drafts` with `{}` once. Allocate its plan using `POST /files` with `{scope:{kind:'draft',id:draftId},purpose:'plan',name,bytes}`, `PUT /files/:fileId/content` with the synthetic PDF, and poll `GET /files/:fileId` until `ready === true`. Save `PATCH /classrooms/drafts/:draftId` with `{revision,payload:{name,subject,division,academicYear,timezone,coverKey,planFileId,units:[{name,topics:[{name},{name}]}]}}`. Explicitly publish `POST /classrooms/drafts/:draftId/publish` with `{revision}`; retain the resulting classroom ID immediately.
3. **Membership:** as the opposite actor, `POST /classrooms/codes/preview` with `{code}`, then `POST /classrooms/codes/confirm` with `{confirmation}`. Confirm each classroom appears under the correct `teach`/`study` collection and read `GET /classrooms/:id`. Keep codes/confirmation proofs private. If already enrolled, skip both writes. Do not use code enrollment for a previously departed/removed member.
4. **Library:** allocate/upload/approve a synthetic PDF through `/files` using `{scope:{kind:'classroom',id:classroomId},purpose:'material',name,bytes}`. Read classroom revision and `POST /classrooms/:id/library` with `{revision,operation:{action:'publish',title,fileId,unitId,topicId}}`. Confirm `GET /classrooms/:id/library` returns that material as ready, nondeleted and linked as intended; verify authorized download. Each classroom uses its own uploaded file and real association IDs.
5. **Activity:** read the latest classroom revision, then `POST /classrooms/:id/activities` with `{revision,operation:{action:'create',type}}`, where type is `QUESTIONNAIRE`, `ASSIGNMENT` or `EVALUATION` per the table. Read `/classrooms/:id/activities/:activityId/preview` for the current revision. Resolve the future local deadline with `POST /classrooms/:id/activities/deadline` and `{local}`; require an unambiguous admitted choice. Save and publish separately through `POST /classrooms/:id/activities` using the bodies below. Re-read revisions between mutations.

```ts
// Existing request shapes, not new domain/source interfaces.
{ revision, operation: { action: 'save', id: activityId, payload: {
  title, unitId, topicIds: [topicId], instructions,
  attachmentRequired: false, instructionFileIds: [], materialIds: [materialId],
  deadline: { local }, allowLate: false,
  questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT',
    prompt, points: '10', scoringRule: null, options: [] }]
} } }
{ revision, operation: { action: 'publish', id: activityId } }
```

6. **Teaching review:** as the companion in Mathematics, read `GET /classrooms/:id/activities/:activityId/session`, start once with `POST .../start` and `{}`, preserve its returned editor token/epoch in memory, and use the existing answer/submit-answers commands with their current attempt revision. Submit one complete synthetic development answer and `confirm:true`; do not publish a grade. Confirm a submitted history row and the primary teacher's review item. Rerun reads session/history and never starts a second attempt or reopens work. If editor authority was lost during interruption, use the explicit current transfer protocol only for this own unsubmitted demo attempt.
7. **Personal Agenda:** generate and journal each UUID before `PUT /agenda/events/:id`. Payload is `{title,description,category,schedule,repeat:{kind:'NONE'},color?}`; category uses `CLASS`, `ACTIVITY` or `EVALUATION`; optional color is a supported finite token. Timed schedule is `{kind:'TIMED',timeZone,startLocal,endLocal}`; all-day is `{kind:'ALL_DAY',startDate,endDateExclusive}`. Identical retry at the same ID returns the same event; changed payload is a conflict. Read via `GET /agenda/events/:id`, and list with `GET /agenda?startDate=...&endDateExclusive=...&timeZone=...` plus pagination. Do not PATCH a manually edited event during rerun.

### Durable resume and credential custody

Use ignored operational state such as `.test-artifacts/permanent-demo/manifest.json` and a separately protected credential file. This candidate path passed `git check-ignore -q` during design. The coordinator verifies the final path and restrictive Windows ACL before first write. Protect passwords with current-user DPAPI or an equivalent OS credential store; Git ignore alone is insufficient. Generate strong passwords once, seal them before registration and retain their secure reference for future use. Report no password, proof, cookie, code or private configuration in versioned records. Credentials for the requesting user are delivered directly only through the authorized credential handoff.

The journal contains version, environment origin, run ID, creation date, actor IDs/secure credential references, immutable desired payloads, draft/classroom/file/material/activity/attempt/event IDs and per-command status `planned | confirmed | uncertain`, with safe verification results. Persist the planned command before sending and the returned identity/status immediately afterward using atomic file replacement. Do not store session/editor/verification tokens. A rerun acquires the lock, confirms the same environment/account IDs and reads recorded resources before sending any missing command.

POST creation endpoints do not offer a general idempotency key. Therefore this is reconciled sequential provisioning, not an exactly-once API guarantee. Before a create command, journal the owned collection's ID inventory. After a lost response, read it again: reconcile a uniquely attributable new resource under the exclusive actor session; if attribution is absent or ambiguous, retain `uncertain` and stop that branch without replaying the create. Never infer ownership only from a matching title. Publish uncertainty is reconciled through the draft's `publishedClassroomId` and actual classroom read. File-allocation uncertainty has no general public listing: preserve it explicitly and avoid an automatic replacement allocation. Confirmed user edits or missing recorded resources are reported, not repaired destructively.

## CRITERIOS_DE_TEST_DOT

No new unit tests, RED, integration fixture, disposable Docker `_test` database or full product regression is necessary for this documentation/data operation. The live acceptance below uses only the authorized synthetic actors against the retained local environment. Historical acceptance is not a fresh result.

- Fresh independent login for both actors succeeds and resolves the intended verified identity; the primary lists two teaching classrooms and one study classroom, with the companion reversed.
- Every classroom is active, has its approved plan, real unit/topics and a readable approved Library material. Student access is consultative; only the classroom teacher authors content.
- All three activities are actually published, associated and future-dated. Primary has Biology pending, and Mathematics has one confirmed companion submission awaiting teacher review. Literature remains unsubmitted. No numeric grade is invented for pending work.
- `GET /home?timeZone=America%2FArgentina%2FBuenos_Aires` reflects mixed membership plus real pending/review content. `GET /agenda/upcoming?limit=5` contains eligible future work in the correct teaching/study context; the monthly range contains the two primary private events. Academic entries are projections, not personal-event duplicates.
- Logout and fresh cookie jars preserve all recorded classroom/material/activity/event IDs and outcomes. Rerun/reconcile leaves the confirmed ID inventory unchanged; it does not reset content or extend dates. Independent sessions prove persisted application state; survival after a service restart is only claimed if that restart is actually performed and verified.
- An authorized browser verifier uses `ego(lite)` in a dedicated task Space for primary Home, Mis aulas, Library and Agenda; preserve snapshots/captures with secrets excluded. Avoid starting/submitting Biology or grading Mathematics as a side effect of read verification. This design agent did not run UI checks.

## Work performed and verification

Inspected current coordinator/startup records, roadmap/work-record protocol, relevant functional-spec account/classroom/activity/eligibility sections, classroom/domain/Home/Agenda public interfaces, web adapters and activity authoring/attempt call sites. The existing `scripts/activity-ai-live-seed.mjs` confirms API shapes but is unsuitable for this task: fixed actor registration, global mailbox enumeration and no rerun reconciliation. No fixture wrapper was executed or copied into the retained runtime.

Observed `git status --short`, `git branch --show-current` and `git rev-parse HEAD`: main at the starting commit with only the coordinator's new record initially untracked. `git check-ignore -q -- .test-artifacts/permanent-demo/manifest.json` exited 0. Initial lookup of the nonexistent `docs/functional-spec.md` and a PowerShell glob-shaped rg path failed; corrected paths were then read successfully. These were discovery-command errors, not failed product checks. PowerShell record-structure/link/whitespace validation exited 0: 97 lines, 0 broken relative links, 0 trailing-whitespace lines, 2 balanced code fences, 0 missing required sections. `git diff --check` exited 0. No runtime mutation, secret/config read, DB access, memory write, source edit, commit or publication by this agent.

## Handoff

Coordinator: restore/confirm the admitted local runtime, choose the secure journal/custody implementation, provision in the sequence above, then record actual API/UI evidence and nonsecret reuse instructions in its own record. Keep any unavailable prerequisite or uncertain create explicit. Do not mark the provisioning complete based on this design's readiness. This document has no own commit identity yet.
