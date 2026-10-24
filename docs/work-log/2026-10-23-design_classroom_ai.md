# Classroom AI extraction — architectural design

- Agent / role: design_classroom_ai / architect.
- Session or task ID: `/root/design_classroom_ai` (runtime task identifier).
- Date: 2026-10-23.
- Branch / worktree: `codex/classroom-gemini`, `C:/Users/alejo/.codex/worktrees/classroom-gemini/ProtipoFoxMind`.
- Starting commit: `ed06f885bfbf08725024013a7a45c9a3a723cfc7`.
- Phase and detailed task/spec links: [P5 classrooms](../../odd/tasks/p5-classrooms.md); [functional specification](../foxmind-v1-functional-spec.md); proposed [AI extraction task](../../odd/tasks/classroom-ai-extraction.md).
- Status: completed (approved-design update and executable backend handoff; production owned by other agents).

## Request and scope

Design Gemini extraction of units/topics from a private approved PDF or DOCX in the existing classroom creation wizard. A teacher edits and confirms the proposal before classroom creation. This is an L3 design task only; no RED/GREEN, runtime, migration execution, secret-file reads, publication or data mutation is authorized here. The coordinator states the current user scope supersedes the historical AI-out-of-V1 and P3-stop notes for this capability.

## Work performed

Read project continuity/roadmap/work-record requirements, applicable architecture skills, functional-spec sections 5/7 and P5 tasks. Inspected `apps/classrooms-ui/Wizard.tsx` and `api.ts`, `apps/api/src/classrooms/{contracts,drafts,host,service,policy}.ts`, public files contracts/store/service boundary, package metadata and relevant draft/file schema declarations. Reconciled branch/HEAD and clean initial tree before writing. The absent `src/core/domain/` and absent classrooms barrel are discoveries, not an inferred implementation failure.

Wrote `odd/tasks/classroom-ai-extraction.md`: one structural decision (durable recommended vs bounded synchronous), exact shared transport/domain/port proposals, automatic first extraction, private approved-source reading, PDF inline/DOCX bounded text, review/apply/idempotency, worker/fencing/budgets, forward schema additions, anti-collision slices and unit/integration/ego(lite) DoT. Incorporated the coordinator's official Google-source findings and adjustments to dedup-before-revision and a configurable 90-second worker dispatch deadline/300-second job age. No source or test implementation was changed; only the coordinator owns the roadmap.

## Verification

- Observed `git status --short --branch`: `## codex/classroom-gemini`, no initial changes.
- Observed `git rev-parse HEAD`: `ed06f885bfbf08725024013a7a45c9a3a723cfc7`.
- Observed initial feature/record line counts: 167/31 before closing this record; feature remains under the requested 220-line budget. `git diff --check` exited 0 after initial document creation.
- Some inventory reads returned missing-path diagnostics for the nonexistent `src/core/domain/`, `apps/api/src/core/` and classrooms `index.ts`; the design explicitly proposes the new shared nucleus and uses the existing files public barrel. No missing-path read was labeled a passing functional check.
- Coordinator will perform final structural/link checks and commit after this handoff. Functional tests are unnecessary for this documentation-only design; no RED/GREEN/runtime/real Gemini verification is claimed.
- Engram bootstrap reads succeeded. The coordinator reported writes unavailable because its host session was not registered; this agent did not alter session registration or retry mutations. Repository documents contain the complete handoff.

## Commits and outcomes

No commit created by this agent. No implementation or approval claimed.

## Handoff

Design returned to coordinator with `ESTADO_DISENO: BLOQUEADO_POR_AMBIGUEDAD`. First unfinished task: present D1 (A durable recommended / B synchronous 20 seconds) and obtain the required L3 confirmation before RED. The original user request authorizes the integration, but the AGENTS L3 procedure requires this gate. After A, record the decision and start C1 contract RED; after B, first adjust persistence/routes/DoT. Final document verification/commit belongs to the coordinator. No whole phase completion or publication is inferred.

## Approval and backend contract follow-up — 2026-10-23

The coordinator relayed the user's acceptance of D1:A and request to implement. Updated design to `LISTO_PARA_TDD_RED`, preserving the alternative as decision history. This agent's scope remains only the design and this work record, with no production/test edits. Read `classrooms/core.ts`, `http.ts`, public ports and files barrel. The requested `app.module.ts` does not exist; inspected the actual composition in `application.ts`/`classrooms.module.ts` after identifying it through `main.ts` and the source inventory.

Added stable service/worker constructor/method contracts, the approved DB snapshot + private reader boundary, explicit token-count port/configuration/budget arithmetic, HTTP status/error adaptation and root lifecycle ordering. `ClassroomCore.run` is safe only for DB operations (6-second transaction), not external provider work; its constructor requires unrelated invitation keys, so the agreed IA constructors receive a minimal object instead. RED is owned by `ai_red`; host/manual behavior must remain compatible when AI is disabled.

Sent the agreed executable contract directly to `/root/ai_red`, `/root/ai_core_green` and the coordinator: both constructors accept `{database,authenticate,reader,provider,configuration}`; service exposes `start/get/retry/apply`, worker exposes timer-free `runOnce()` and shutdown. `reader.snapshot` is DB-only behind files; reader bytes and provider count/generation stay outside locks. Reinforced that the worker's durable grant validates the actor/source without inventing a session. No further product decision remains. Observed final `git diff --check` exit0; design219lines, within the requested220-line budget. No functional tests were run by this documentation agent. First unfinished action is ai_red's preimplementation RED evidence, then coordinator dispatches GREEN; no new approval is requested by this agent.
