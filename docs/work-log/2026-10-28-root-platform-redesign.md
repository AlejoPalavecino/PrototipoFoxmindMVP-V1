# Platform UX/UI redesign — local implementation verified

- Agent / role: /root, sole designer and implementer; no subagents this session.
- Session or task ID: /root (runtime task identity).
- Date: 2026-10-28.
- Branch / worktree: codex/foxmind-ux-redesign, canonical checkout; main at start.
- Starting commit: 2b58fbe (observed clean, matching cached origin/main).
- Phase: cross-platform UX/UI; [functional spec](../foxmind-v1-functional-spec.md), [roadmap](../implementation-roadmap.md).
- Status: in_progress (local implementation verified; authenticated whole-product acceptance remains pending).

## Request and scope

User authorizes a comprehensive local redesign of FoxMind, including navigation, screens, creation flows, buttons and tabs on desktop/mobile. Existing design is not a constraint; retain the original fox logo and reuse generated graphic assets. New imagery, if needed, must ship as WebP. Session explicitly disables global subagent delegation. Model selection cannot be changed by the assistant; user was informed. No remote publication or deployment requested.

## Work performed

Read current roadmap, work-record protocol, scoped web instructions, current shared shell/styles, demo access guide and previous delivery evidence. Inspected actual Git state. Loaded Product Design index/context/audit and ego-browser, plus Engram memory guidance. Product Design preflight found no saved context. Engram project/context/search succeeded. Installed ego-browser v2.1.0 guide is available (unlike the historical missing executable).

Implemented a compact shared presentation in `apps/shared-ui/workspace*.css`, imported last by the web and standalone classroom entries. Neutral surfaces, restrained orange emphasis, readable type hierarchy, 44px primary controls, visible keyboard focus, reduced-motion handling, desktop sidebar, mobile bottom navigation and compact account/Agenda layouts. Existing logo, covers and illustrations remain byte-for-byte unchanged; no new assets or dependencies.

Home retains pending/review/queries in view, places resources behind a disclosure and exposes Create/Join near the top. Plan keeps learning content visible and groups writable administration separately. Mobile topic selection shares the existing selected context. Questionnaire copy preserves the distinction between saving and submission. Wizard has accessible sticky actions, smaller covers/review and tighter extraction guidance. Existing role, archive, routing, authentication and mutation contracts are preserved.

Affected behavior: `Home.tsx`, `Plan.tsx`, `PlanWorkspace.tsx`, `QuestionnaireAttempt.tsx`, `AppNavbar.tsx`; new tests: `tests/workspace-disclosure.test.mjs`. Extended the test-only wizard fixture with `?mode=prepared` for later steps using a synthetic approved file reference. This does not upload a file, call a provider or publish a classroom.

Self-reviewed using React best practices: no new network requests, effects, dependencies or authorization logic; native disclosures and a labeled native select reuse existing callbacks. No independent-agent or native review is claimed: this session explicitly requested sole-agent work.

## Verification

- Test-first: missing disclosures/chooser failed before implementation; final five new behavior checks pass. Initial test harness needed a window stub and whitespace-normalized text assertion; these failures are preserved as setup history, not product failures.
- Final focused regression command in [QA record](evidence/2026-10-28-platform-redesign/README.md): 71 tests, 69 PASS, 0 FAIL, 2 historical optional SKIP; 9.86 seconds. Includes real owned PostgreSQL test rows with transactional rollback, not retained participant data.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`: exit 0. Final `npm run web:build`: exit 0, all production routes compiled and types checked after the final CSS changes. Existing advisory: an external user-home pnpm lockfile was ignored.
- `git diff --check`: exit 0. No repository lint script or ESLint/boundary configuration was found; do not claim a linter/boundary PASS. New imports are presentation-only and existing shared/domain boundaries are unchanged.
- Ego TaskSpace 14, one managed page: real rendered components with synthetic APIs at `http://127.0.0.1:53191`. Matrix of 17 scenarios at 320/1440px: 34 checks with no document/major-container horizontal overflow. Seven further scenarios at 768px also fit. Supplemental 390px wizard/menu/dialog/editor/attempt checks and 1366px classroom tabs were inspected.
- Verified topic selection, Plan disclosure, menu open/Escape/focus restoration, all eight classroom tabs, membership filter (one study card), search (zero cards), Join dialog, event form and all four wizard steps. The wizard's missing-file validation correctly prevents continuing; prepared fixture enables later steps. No publication or real account operation was performed. Event-save output was truncated, so successful event persistence is not claimed.
- Corrected mobile registration sizing and recovery header spacing after the matrix, then recaptured: input 46px; recovery header reduced from 211px to 121px and form top from 307px to 153px. Tablet Home row reduced from 161px to 107px; wizard review cover 72px. Updated screenshots were visually inspected.
- Initial Home animation/profile-loading captures were rejected as stable visual evidence. An early wizard-review screenshot preceded image decoding; the final loaded-image capture supersedes it. Local diagnostic scripts/captures and metrics remain in `.test-artifacts/platform-redesign-20261028/`; selected durable evidence is linked below.
- The usual application at localhost:52171 refused connection. Authenticated E2E, real upload/AI/submission/grading flows, physical mobile/Safari, native zoom and performance metrics are not newly accepted by this session. Fixture pixels are not proof of those boundaries.
- Engram writes were not attempted after compaction: the runtime hook reported no registered attribution identity. Repository records remain the durable handoff.

## Commits and outcomes

Local semantic delivery is being split into shell/account/Agenda presentation and compact academic workflows. No push, merge to main, PR or deployment. Exact commit identities are recorded only after creation.

Rollback boundary: the shell unit can be reverted with its presentation imports and navbar location label; the learning unit removes its three CSS imports plus disclosures/topic chooser/copy and corresponding tests. No DB migration or retained-data rollback is involved. All final acceptance results above refer to the combined candidate.

## Handoff

Local UX implementation and bounded fixture verification are finished. Review [selected captures and reproduction steps](evidence/2026-10-28-platform-redesign/README.md). First unfinished acceptance: run authenticated teacher/student journeys against an available, authorized disposable application runtime, including creation/upload, submission, correction and feedback. Keep this distinction from a claim of “100% production-ready.” Historical P0–P9 acceptance is not reopened by presentation work.
