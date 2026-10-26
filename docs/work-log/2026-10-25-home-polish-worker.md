# Inicio presentation worker — GREEN source ready

- Agent / role: /root/home_polish_worker / slice_worker.
- Session or task ID: /root/home_polish_worker.
- Date: 2026-10-25.
- Branch / worktree: main / shared canonical checkout.
- Starting commit: 27233bab657683a00782f304000652619acce50c.
- Phase/spec: bounded D9 Home polish, [contract](2026-10-25-home-polish-design.md).
- Status: completed (assigned source implementation; independent visual acceptance remains with tester/coordinator).

## Scope and ownership

Implement approved teacher/student composition and honest no-membership state in Home-owned source/CSS only. Preserve hooks, targets, busy, error retry and pagination. Tests belong to test_runner; shared records and commits belong to root. Other agents are active; their changes are preserved.

## Work performed

Read design, coordinator record, roadmap, work-record protocol, exact RED tests, Home source/core barrel, shell styles, package versions and all three supplied images. Context7 React19.3.0 documentation consulted before JSX changes; installed package19.3.1, nearest available version docs19.3.0. RED ENOENT evidence supplied by coordinator. No test edits.

Added pure module visibility and response-zone/calendar-date helpers in home-presentation.ts. Home greeting sits inside left column aligned with right miniagenda. None keeps one illustrated onboarding with real Create/Join, personal agenda, authorized populated history and errors; ready-empty nonagenda shelves are omitted by the explicit state gate. Header has a real Buscar aulas en FoxMind button calling existing onClassrooms. Fullwidth cover artwork, local Fredoka headings, blue/navy text, larger task thumbnails, pastel calendar-date tiles and teacher-first tools match the references. Agenda includes its real open action in its header. Teachers keep a real classroom select; tools render first in DOM as well as pixels. No duplicate Join footer. CSS adapts shell only under :has(.fm-home), maintaining other routes.

Production paths: apps/classrooms-ui/Home.tsx, HomeModule.tsx, HomeRow.tsx, HomeShortcuts.tsx, home-presentation.ts, foxmind-home.css, foxmind-home-layout.css, foxmind-home-rows.css, foxmind-home-shortcuts.css, foxmind-home-shell.css. Every leaf remains below200lines. No API/hook/backend/schema/env/retained-data changes, no runtime restart or build in live .next, no asset or shared navbar edits.

## Verification

- node --test --test-reporter=dot tests/home-polish-presentation.test.mjs tests/p9-home-client.test.mjs tests/foxmind-3d-client.test.mjs tests/foxmind-3d-client-lifecycle.test.mjs tests/foxmind-3d-flows-targets.test.mjs: initial22PASS, no diagnostics.
- After teacher tools DOM-order refinement, same five files with --test-reporter=spec:22PASS/0FAIL/0SKIP, exit0. Covers gate/date contract, archived history, auth boundaries, cancellation, retry, lifecycle and real contextual targets.
- npx tsc -p apps/web/tsconfig.json --noEmit --incremental false: exit0, observed twice, second after final JSX change.
- git diff --check: exit0; existing LF-to-CRLF working-copy advisory only.
- Linter unavailable: package.json has no lint script, no ESLint/stylelint configuration found. No linter installation or invented PASS claimed. Coordinator may run its existing CSS/AST validation.
- Early file discovery read nonexistent foxmind-assets.ts in classroom folder and glob patterns unsupported by rg Windows; corrected using shared-ui actual files and -g. No implementation/test failure occurred, circuit breaker not triggered.

## Commits and handoff

No commit created; coordinator owns semantic commits and roadmap. Source ready notification sent to root. First unfinished task: independent ego visual acceptance for none/study/teach/mixed at desktop/tablet/mobile and controlled action/retry/pagination proof; root owns isolated production build. Any visual feedback can be applied by this worker within the same disjoint ownership. No whole-phase completion or publication claim.

## Final teacher reference priority adjustment

Coordinator visually observed Material reciente pushing teacher tools below the first viewport. On follow-up, changed only Home.tsx: teacher order is pending/review/queries/shortcuts/materials; study/mixed/none retain prior order. One shortcut element with stable key is rendered once, retaining classroom select state across ordinary refreshes. No module/error/target hiding, no test or CSS edits.

Observed final focused helper + p9-home-client checks:6PASS/0FAIL (dot), exit0. Final web tsc noEmit incremental false:exit0. git diff --check:exit0. Home.tsx now57lines. Root notified before final isolated build and visual QA; those remain independently owned. No commit created by worker.
