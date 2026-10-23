# Folder platform RED — confirmed

- Agent / role: test_runner
- Session or task ID: /root/folder_red_tests
- Date: 2026-10-22
- Branch / worktree: codex/folder-style-platform; foxmind-folders-implementation/ProtipoFoxMind
- Starting commit: 0bcb7d48dac76d49aa8e89b3ac76b32b03515425
- Phase: folder platform presentation; existing P0–P9 behavior preservation
- Status: completed

## Request and scope
Create only tests/folder-platform.test.mjs and this attributed record. SSR composition, folder assets/styles and existing controls; no production changes, API calls, secret reads or browser work. Other workers are present; do not revert their changes.

## Work performed
Read roadmap, work-record protocol, existing entry/platform tests and relevant component/client implementations. Starting Git state was clean. Added eight focused tests in tests/folder-platform.test.mjs. The old Home hides one classroom perspective. ClassroomView SSR initially has no room; preserve this loading contract rather than inject fake server room state. Tabs/teacher guards receive structural checks, which do not prove server authorization. Next routing context alone is stubbed for account SSR; login fetch is an in-memory stub, with no service/network use.

DoT: actual Next cascade imports a folder stylesheet without glass; navbar includes raster logo and retains route/current/notification/menu semantics; account SSR includes welcome illustration, loading, skip link and entry navigation; AccountField retains password semantics and non-submit visibility control; login mutation retains raw credentials, current CSRF and post-rotation refresh; Home exposes both populated role groups and current create/join/enter/news controls; ClassroomView SSR preserves no-fetch loading/exit; complete existing tabs and teacher-only guards remain defined.

## Verification
Observed command once: `node --test --test-reporter=spec tests/folder-platform.test.mjs` — exit 1, 8 tests, 4 PASS / 4 FAIL / 0 SKIP, duration 1966 ms. Native Node's concise spec reporter was used; it has no --silent equivalent. No suite, database or browser run.

Expected RED assertions:
- tests/folder-platform.test.mjs:36: folder stylesheet missing from _app imports.
- tests/folder-platform.test.mjs:47: navbar raster logo absent from SSR.
- tests/folder-platform.test.mjs:58: welcome illustration absent from account SSR.
- tests/folder-platform.test.mjs:108: Estudio group is hidden when teaching data exists.

Passing preservation checks: password controls, login client session/CSRF rotation and unchanged raw credentials, initial classroom loading/exit without API invocation, classroom tab definition and teacher-only guards. No test infrastructure/import failure occurred.

Engram search was available. Attempted memory save was blocked by the runtime PreToolUse hook: “Codex host session is not registered; start a new Codex session to register it.” Session-summary write was consequently not executed. This repository record retains the complete proof; coordinator can persist attributed memory through its registered session.

## Commits and outcomes
No commit created by this test agent.

## Handoff
Coordinator notified immediately after RED; implementation may now begin. Next action: run the unchanged new test file against completed workers, then independent browser validation in an isolated ego Space. No Space was used in this RED assignment. Existing glass-specific tests may conflict intentionally with the new stylesheet contract; coordinator owns their disposition. Classroom tab/role runtime proof remains a separate real-data/browser responsibility. Home create/join stay on Home under the coordinator's confirmed preservation decision. No endpoint or “Lo próximo” feature introduced.

## Follow-up — authorized legacy presentation expectation migration

- Status: in_progress.
- Ownership expanded by coordinator to tests/entry-glass-client.test.mjs, tests/entry-glass-polish.test.mjs and tests/platform-glass.test.mjs; production remains prohibited.
- Replaced obsolete Home toggle expectation with two visible semantic sections. Migrated theme/cascade expectations to folders.css and recursive local imports, selected opaque palette and colored-tab contrast. Existing focus restoration, password semantics, native controls, dialog, disabled state, responsive safeguards and heading checks remain assertions. Academic base safeguards must actually be loaded by the selected cascade, not merely exist in an unused stylesheet.
- Test execution pending coordinator's CSS-ready signal. These changes implement the agreed presentation contract and are not responses to a failing GREEN run.
- After CSS-ready signal, migrated base reader to folders-controls.css (copied native-control base loaded by folders.css). Replaced obsolete glass Home heading sizes with compact 16–24px folder row title bounds and retained shared academic heading hierarchy. Notification dialog uses the common wrapping header and nonshrinking 44px close target rather than obsolete entry-only styling.
- First migration check: `node --test --test-reporter=spec tests/entry-glass-client.test.mjs tests/entry-glass-polish.test.mjs tests/platform-glass.test.mjs` — exit 1, 18 tests, 17 PASS / 1 FAIL / 0 SKIP, duration 629 ms. Failure: selected folder cascade lacks `var(--fm-font-sans)` under retained shared-font assertion. Reported to coordinator; assertion was not relaxed after failure. All other migrated checks passed. No production change by this agent.
- Coordinator added shared font to folders-shell.css. Combined recheck: `node --test --test-reporter=spec tests/folder-platform.test.mjs tests/entry-glass-client.test.mjs tests/entry-glass-polish.test.mjs tests/platform-glass.test.mjs` — exit 1, 26 tests, 25 PASS / 1 FAIL / 0 SKIP, duration 928 ms. All 18 legacy migrated checks passed, including shared font. New actual source regression detected by unchanged folder test at line 132: student label in ClassroomView changed from `Compañeros` to mojibake `CompaÃ±eros`; settings label also shows mojibake. Reported to coordinator for source correction. Current verification state FAIL_REGRESION pending source repair; no assertions relaxed.
- Final recheck after other agents corrected encoding: same combined26 command exit 0, 26 PASS / 0 FAIL / 0 SKIP, duration 1348 ms. FASE_TDD: GREEN_PASS for this console scope. All historical failed runs above remain attributed. Legacy migration completed; no source/test assertion relaxation after failures. Live DOM coverage is separately recorded in 2026-10-22-folder-live-verify.md.
