# Folder presentation — independent static review

- Agent / role: `/root/folder_review`, reviewer.
- Session or task ID: `/root/folder_review`; host session identity unavailable.
- Date: 2026-10-22, America/Buenos_Aires.
- Branch / worktree: `codex/folder-style-platform`, `foxmind-folders-implementation/ProtipoFoxMind`.
- Starting commit: `0bcb7d48dac76d49aa8e89b3ac76b32b03515425`.
- Phase and detailed task/spec links: [coordinator](2026-10-22-root-folder-implementation.md), [architecture](2026-10-22-folder-architecture.md), [functional spec](../foxmind-v1-functional-spec.md).
- Status: completed (assigned static review only; global DoD and visual acceptance remain pending).

## Request and scope

Review the folder redesign while preserving implemented V1, in read-only source/test/script scope. The coordinator explicitly permits only this own record as a write. No source/test correction, commit, publication, browser session, service/process startup or fixture-secret read is assigned. Other writers are present; their changes were preserved. Applied `caveman-review` and `work-unit-commits` to defects and delivery boundaries.

## Work performed

Read repository/web AGENTS, roadmap, work-record protocol, architecture and folder worker/coordinator records. Inspected tracked production/test diff and new AccountStory, selected folder CSS, folder-platform tests and disposable preview script. Reviewed existing component semantics and selected stylesheet cascade. API clients, backend/domain, migrations and environment configuration have no candidate diff; no new environment variable or schema change is introduced by these edits.

Existing handler bodies, mutations, CSRF/session ownership, role/archive permission branches, confirmation dialogs, field names and classroom navigation survive the diff. Plan native details retain mounted forms and equivalent busy disabling; Library keeps file review/publication controls outside its collapsed selector. Source inspection alone does not prove keyboard behavior or actual server authorization.

Three existing style/client test files migrate only obsolete glass/theme or mutually exclusive Home assertions. Contrast checks, checkbox/radio sizing, dialog focus/scroll/layout protections, account/client raw-credential and current-route contracts remain; no test suppression or relaxed functional assertion was found. New eight-test suite covers composition and selected semantics, with source-only tab checks explicitly limited rather than treated as permission proof.

## Findings and coordinator corrections

Reported these defects promptly; reviewer did not author corrections. Re-read the coordinator's changes and confirmed the fixes in source:

1. Old higher-specificity academic-control selectors overrode folder tab borders/background/padding and classroom panel border/shadow. `folders-academic.css` now uses `.p5-main .p5-tabs button` and `.p5-app:not(.entry-home) .p5-surface.folder-panel`, including the narrow-width overrides. Runtime geometry still needs visual proof.
2. Wizard completed-step glyph had become the literal mojibake `âœ“`; the source now uses the JavaScript string escape `\u2713`.
3. EntryIcon returns a masked empty span, but selected CSS initially lacked its paint background and mask geometry after glass removal. `folders-shell.css` now restores inline-block, currentColor background, mask size/repeat/position, and forced-colors paint.
4. Mis Aulas' Estudio/Enseño headings lacked `folder-tab`, so the two panels had no external folder label. Both headings now include that class.

No unresolved actionable source defect remains from this static review: `LGTM_SIN_HALLAZGOS`, scoped to inspected current source only.

## Verification

- `git status --short`, `git diff --stat`, `git diff`, `git diff --numstat`, `git ls-files --others --exclude-standard apps/shared-ui scripts tests`: observed base and candidate inventory; existing unrelated/generated work preserved.
- `git branch --show-current` and `git rev-parse HEAD`: branch/base above, no new commit during review.
- `git diff --check`: exit 0; Git emitted only the existing Home LF/CRLF conversion warning.
- PowerShell strict `[Text.UTF8Encoding]::new($false, $true)` decode over 24 explicitly enumerated changed/new source, CSS, test and script paths: all PASS. This is byte validity, not a general visual or translation proof.
- Targeted `rg -n`/`Get-Content` re-reads confirmed all four coordinator corrections described above.
- Own-record structural check: all three relative Markdown links resolve; `git diff --check -- docs/work-log/2026-10-22-folder-review.md` exited 0.
- `git diff --name-only -- .env.example prisma src/core/domain apps/api apps/web/src/lib apps/classrooms-ui/api.ts`: empty, exit 0.
- Tests, build, browser, Docker, API/SQL/email journeys and cleanup were not executed by this reviewer, per assignment. Coordinator-reported 8 folder PASS / 18 migrated-style PASS / full regression exit 0 were context only, not independently observed reviewer results.
- One exploratory PowerShell command used an unsupported brace path list and failed before execution; reissued explicit paths. One `rg` filename glob was rejected by Windows and replaced with explicit file paths. Neither is a product failure.

## Delivery notes

New `folders-controls.css` contains 211 content lines, above the new-file 200-line guideline; it preserves copied existing safeguards. Prefer a coherent later split if needed, never compressed code or removal of safeguards to fit a budget. Existing long state-owner files were already above the guideline and were not generally refactored here.

`apps/web/next-env.d.ts` currently contains generated `.next/dev/types/` imports from preview. Coordinator should reconcile generated build output before staging. Candidate authored/new assets/docs exceed a single 400-line work unit; reviewable delivery boundaries remain coordinator-owned and no commit is approved by this record.

Disposable preview script delegates owned services to existing integration runtime and uses ignored `.test-artifacts`; no broad filesystem deletion or retained-data target is introduced. Cleanup was inspected, not executed or certified. Ignored browser-fixture contents and all secrets were left unread.

## Commits and outcomes

No source/test/script edits, Git commit, merge, push, PR, deployment, secret read or Engram mutation by reviewer. Only this attributed record was written. Shared roadmap and global phase status remain coordinator-owned.

## Handoff

First unfinished action: coordinator/test runner completes actual desktop/mobile visual and interaction proof, particularly final cascade, long labels, selected tabs, keyboard disclosures, upload states, menus/dialogs, and narrow account/security forms. Re-run proportionate focused checks after coordinator fixes, reconcile generated files, then assess full DoD and work-unit commits. This static review does not grant global acceptance or publication authorization.

## Final-delta re-read — additional scoped assignment

Coordinator requested a final source-only review of later typography, field/mobile sizing, mask navigation, raster covers, search toolbar, classroom-created receipt and preview retry/stop-file support. Source is frozen under coordinator ownership; no source/test/browser/service/secret operation by reviewer. Coordinator reports independent quiz/assignment/file/private-correction/publication/student-result/progress journeys and 24 equivalent states plus 320/390 mobile captures without page overflow; these are attributed coordinator inputs, not independently observed by this reviewer.

Observed source: cover catalog remains the same three keys and maps to three existing local PNGs with the same accessible parent name; fixed 160px room artwork and mobile hidden room decoration avoid intrinsic-height expansion. Search keeps its label, type, controlled value, change handler and unchanged filter. New account field sizing has explicit mobile overrides. EntryIcon paint and mobile menu targets remain present. Preview 429 retry is bounded to one retry and rebinds fresh CSRF; stop file is checked only inside ignored owned artifacts, and normal stdin/signal/stop-file exit returns to the existing cleanup owner. None of this proves cleanup execution. `Get-FileHash` confirms both control stylesheets are currently byte-identical SHA256 `31250f7a50e598f17045b0811a49ae8ace1d42fe310b89d305d200e870ed7174`; planned rename/removal has not yet been observed. `git diff --check` exits 0 and the explicit API/domain/migration/env diff remains empty. No new test/build run by reviewer.

Additional real defect, reported promptly to coordinator:

`[MEDIA] apps/classrooms-ui/Classrooms.tsx:160 : stale sharedCode can falsely show Aula creada when joining a different classroom after creation; showPresentation clears classroomId but retains sharedCode, and enterCode sets a new classroomId without clearing it : clear sharedCode when leaving the created view and/or before confirming code admission.`

Concrete source path: successful onPublished stores sharedCode; leaveView calls showPresentation; user opens code-join and confirms; the new classroomId plus old sharedCode meets the new receipt predicate and also forwards that old code through initialCode. This supersedes the earlier no-unresolved-finding statement only for this new delta. Await coordinator correction and targeted re-read before closing this finding; no authorization for commit/publication is implied.

### Final-delta finding closed after coordinator correction

Coordinator added `setSharedCode(null)` to both showPresentation and successful enterCode, before opening the admitted classroom. Targeted source re-read confirms both resets and `git diff --check -- apps/classrooms-ui/Classrooms.tsx docs/work-log/2026-10-22-folder-review.md` exits 0. The identified stale-code sequence is closed in source. Coordinator reports strict TypeScript exit 0; reviewer did not run it. Final scoped static verdict: `LGTM_SIN_HALLAZGOS`. No general review round, runtime acceptance, commit or publication was added. Byte-identical control stylesheet rename/removal remains a coordinator delivery action not yet observed here.
