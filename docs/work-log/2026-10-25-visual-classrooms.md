# FoxMind 3D D3–D7 — presentation in progress

- Agent / role: slice_worker, classroom presentation owner
- Session or task ID: /root/visual_classrooms
- Date: 2026-10-25
- Branch / worktree: codex/foxmind-3d-migration, shared checkout
- Starting commit: eecb769151b12abb5ae9e1f15839b54c772e446f
- Phase: [D3–D7](../../odd/tasks/foxmind-3d-migration.md)
- Status: in_progress

## Request and scope

Implement classroom presentation from 08-classrooms and 03-classroom references, preserving real actions and all existing authorization and persistence. Own apps/classrooms-ui except Home, Home helpers, tests. No commits/publication, backend, shared UI or roadmap writes. Other workers own foundations, Home/data and independent tests; their work remains intact.

## Work performed

Read roadmap, protocol, migration task, foundations, implementation plan, assets and D3–D7 flow documents; inspected both WebP references and supplied PNGs. Applied design-taste-frontend app-screen guidance with explicit reference art direction retained. React 19.3 documentation consulted in Context7 before component extraction.

Implemented responsive 3:2 classroom cards, separate study/teach groups only when present, shared responsive illustrations and fallback, compact classroom header, ordinary entry Plan and reference tab order, plain surfaces/forms instead of folders. Seven new selectable covers preserve a selected historical legacy key without silently rewriting it. Wizard, invitations, enrollment, archive controls and all existing forms remain real.

PlanWorkspace selects NEXT then PENDING then first, displays units/topics and actual authorized material/activity lists in two columns. Selection only reads; explicit activity opening uses the existing student session/start policy. Multitema activity matching, approved/nondeleted material gating, protected file URLs, abort/error/no-stale-data and retry are preserved.

Home integration passes subjectId/homeClient and onAction; ordinary Home no longer fans out legacy lists/drafts/invitations. Targets open real Plan/Muro/activity/result/Library/history; authoring/upload open controls without creating/publishing automatically. Unpublished filtering requires explicit gradePublished=false and excludes drafts/published/unknown states. Backend enrichment belongs to visual_home. TP targets and card clicks share openActivitySession; quiz/evaluation consultation never starts an attempt.

Question subtypes allow 30 each; the combined total is checked before generation POST, including regeneration. Existing assignment limit remains 20. Added visible combined counter.

### Coverage and paths

- D3: CLASS-01..14 and PEOPLE-01..04: Classrooms.tsx, ClassroomCollection.tsx, ClassroomHeader.tsx, ClassroomView.tsx, Wizard.tsx, components.tsx; cards/membership/wizard and intact member/settings dialogs. CLASS-07/08 persistence operations unchanged.
- D4: PLAN-01..05: Plan.tsx, PlanWorkspace.tsx, use-plan-workspace.ts; LIB-01..04: Library.tsx; WALL-01..04 and NAV-02/CLASS-15: inherited Wall/Notifications controls restyled through CSS. LIB-05 external files page remains outside this agent's ownership and is not claimed as changed.
- D5: ACT-01..07, AI-01..05: Activities.tsx, ActivityGenerationForm.tsx, use-activity-generation.ts and CSS for actual authoring/proposal/extraction forms. New counting guard followed RED.
- D6: SUB-01..08: AttemptHistory.tsx, open-activity-session.ts and CSS for actual session/questionnaire/practical/history controls; no timing/locks/submission policy changes.
- D7: GRADE-01..05, PROG-01..03: CSS for current GradingEditor/PublishedResult/PublishedGradeCorrection/Progress, preserving separate measures and publication actions.
- D9 adapter: classroom-home-target.ts, Classrooms.tsx, ClassroomView.tsx, Activities.tsx, Library.tsx, AttemptHistory.tsx and api.ts optional gradePublished compatibility field.
- CSS entry: foxmind-classrooms.css imports foxmind-classroom-cards.css, foxmind-classroom-workspace.css and foxmind-classroom-learning.css. ClassroomsApp.tsx is the standalone preview CSS entry. Production _app import belongs to visual_foundations.

All new files are below 200 lines and new functions below 40 lines. Legacy large containers were not broadly refactored during the presentation migration. No test files modified.

## Verification

- Observed coordinator/test_runner RED before default Plan, question limits, PlanWorkspace, Home targets/history filtering and TP explicit target behavior. No RED tests were edited here.
- `node --test --test-reporter=dot tests/foxmind-3d-flows-attempt.test.mjs tests/foxmind-3d-flows-targets.test.mjs tests/foxmind-3d-flows-plan.test.mjs tests/foxmind-3d-flows.test.mjs`: exit 0, 22 groups.
- `npx tsc --noEmit -p apps/classrooms-ui/tsconfig.json`: exit 0.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: exit 0 after final adapter/helper changes.
- Focused existing clients across P5/P6/P7/P8 plus activity/classroom AI UI/polling: 30 groups passed; after final TP helper change, affected P7 and AI subset rerun with 19 groups passing.
- `git diff --check -- apps/classrooms-ui`: exit 0; Git only warns about LF/CRLF normalization in shared working files.
- No configured linter script/config found; linter unavailable, not represented as PASS.
- Preserved integration failures: first types check failed new core cover union owned by visual_home; initial p6-wall-client import failed new HomeError parameter property in strip-only Node. Owner corrected both; subsequent types and all three wall-client tests passed. Early flows run still failed settings/backend cover while their owners implemented; final flows nine groups passed.
- Real-browser evidence belongs to independent test_runner; no visual verification claimed here.

## Commits and outcomes

None requested.

## Handoff

Implementation is GREEN under observed component/client/type checks. First unfinished task: independent real-browser QA at 320/390/768/1440 using production CSS with real synthetic classroom/Plan/member/authoring/attempt/grading states; no fake screenshot proof. Coordinator reconciles full 82-ID acceptance and roadmap; this record does not mark D3–D7 or the whole migration accepted. No commits requested/performed.

Home/Shared UI interfaces agreed: Home receives subjectId/homeClient from wrapper, calls onAction(HomeTarget); private events navigate exact `/agenda?event=<encoded-id>&date=<encoded-date>`. Shared FoxmindIllustration and classroomCoverAsset are reused; production CSS imports already coordinated with visual_foundations. No pending behavior waiting for RED within this agent's implemented scope.

## Follow-up — legacy Home loading banner

Coordinator reactivated /root/visual_classrooms for a narrow Classrooms.tsx correction. Inspected `.test-artifacts/foxmind-3d-home-screen-export.png`: ready Home still has the permanent `Cargando tus aulas…` banner. The ordinary Home effect intentionally skips legacy `load`, so legacy data stays null while the branch incorrectly treats null as its loading state. The branch also offered a legacy fanout retry and passed obsolete data/transport callbacks to Home. All other component surfaces remained frozen for this follow-up.

After test_runner observed functional RED in `tests/foxmind-3d-flows-loading.test.mjs` (permanent banner alongside Home), removed the banner and obsolete api/data/onEnter/onOpenTarget props. Home owns loading/error/retry through its hook. Contextual mutation errors have dismiss only; they cannot invoke legacy list fanout. Navigating to Home also skips legacy load and clears previous view errors. Account cleanup remains the existing user-id key in the wrapper; legacy classroom data is no longer passed into Home, and no second permission or data source was introduced.

Observed `node --test --test-reporter=dot tests/foxmind-3d-flows-loading.test.mjs tests/foxmind-3d-flows-targets.test.mjs tests/foxmind-3d-flows-attempt.test.mjs tests/foxmind-3d-flows-plan.test.mjs tests/foxmind-3d-flows.test.mjs`: exit 0, 23 groups. `npx tsc --noEmit -p apps/classrooms-ui/tsconfig.json`: exit 0. `git diff --check -- apps/classrooms-ui/Classrooms.tsx`: exit 0 (LF/CRLF advisory only). No tests modified. First next action: coordinator/test_runner re-export the ready Home in the real browser to prove banner removal in pixels; no new browser PASS claimed here.

## Follow-up — unified Mis aulas collection

Coordinator reactivated /root/visual_classrooms to match reference 08: one grid, default Todas, real study/teach filters and compact real metadata. Inspected `.test-artifacts/foxmind-3d-mis-aulas-1440-screen-export.png`; separate role sections leave most of the viewport unused and push the second classroom below the fold. Ownership is ClassroomCollection, a pure collection-filter helper, own card CSS and only necessary header/search layout in Classrooms.tsx. Waiting for runner RED on pure filter and component behavior; no production edit made before RED. No changes to enrollment/roles/database or create/join handlers.

Runner observed helper RED (three ENOENT failures), then UI RED (Todas button absent) before the corresponding implementation. Added collection-filter.ts: stable study-then-teach Map order, teacher DTO replacement at an existing duplicate ID position, no mutation, role filtering on actual DTO role. Search trims, applies Unicode NFKC normalization and lowercase over name/subject/division. Counts derive from deduplicated authorized loaded rows before search; no server query or permission change. UI now defaults Todas, uses aria-pressed buttons, and filters one 3/2/1-column grid. Search with no matches cannot claim no memberships. Moved the original controlled search into the collection toolbar; create/join handlers untouched. Metadata is two real paragraphs (subject/division/year; teacher), no invented current unit or activity count, with CTA aligned at card bottom.

Coordinator additionally authorized same-stage Plan header polish after inspecting `.test-artifacts/foxmind-3d-plan-1440-screen-export.png`: Cover now accepts optional priority, used only by ClassroomHeader, so shared Illustration applies eager/synchronous decoding above fold while list discovery stays lazy. Header artwork uses the approved whole cover at right with CSS fade into cream and no framed-thumbnail border; no new generated artwork. Ordinary Plan surface drops inherited folder-panel class, avoiding its yellow shadow/frame, while existing inner PlanWorkspace panels/actions remain intact. No service changed.

Observed collection tests five groups PASS. Full focused loading/targets/attempt/Plan/collection/core flow suite: 28 groups PASS. Types aulas and web PASS; web types repeated after header polish. Diff check PASS. No linter configured. Changed follow-up paths/line counts: ClassroomCollection.tsx 60, collection-filter.ts 19, foxmind-classroom-cards.css 46, Classrooms.tsx 388; header polish components.tsx 87, ClassroomHeader.tsx 16, ClassroomView.tsx 645, foxmind-classroom-workspace.css 81. Only previously existing containers exceed 200 lines; new helper/functions remain below limits. Tests unchanged.

First next action: Group 4 fresh-build real-browser Mis aulas/Plan captures and role/search interactions at 1440/390/320 by test_runner, after shared shell polish. This agent viewed existing export PNG pixels only; it did not execute browser QA or claim a new screenshot. If verification exports through PDF/print, retain the print/decode limitations and distinguish it from a viewport screenshot in independent evidence. Full 82-flow acceptance belongs to coordinator, not this component handoff.

## Follow-up — final CSS cascade corrections

Coordinator assigned only foxmind-classroom-workspace.css and foxmind-classroom-cards.css plus this record. Classrooms.tsx and all functional files belong to concurrent jd_fix_agent and remain untouched here. Viewed Group 4 Plan and decoded Mis aulas PNG exports: inherited row-reverse/space-between shifts header text right over the art; inherited label grid places search icon above input. Scope is presentation cascade normalization for both Home/classroom entry styles, no behavior and no style-mirror tests. Group 5 independent real export remains required after this delta is frozen.

Corrected header selector to cover both entry-home and ordinary classroom roots, with explicit row/nowrap/flex-start alignment and reset grid placement. Heading is anchored left with zero inherited margins and 58% width at desktop; art remains absolute right 49%, and matching responsive selector specificity preserves 66%/100% heading widths. Search label now has module/root/main-specific row flex layout, fixed 52px frame, flex-none 22px icon and flexible min-width-zero input. Accessible labels, counts, query handlers and state are unchanged.

Observed `npx tsc --noEmit -p apps/web/tsconfig.json`: exit 0. `git diff --check -- apps/classrooms-ui/foxmind-classroom-workspace.css apps/classrooms-ui/foxmind-classroom-cards.css`: exit 0, LF/CRLF advisory only. Delta is 8 replacement lines in workspace CSS (81 total) and 3 in cards CSS (46 total). No configured linter; no functional or mirrored-style tests added for this CSS-only delta. Production scope frozen at these two CSS paths. Next action: immutable candidate rejudgment and independent Group 5 browser/PDF export, explicitly preserving print/decode limitations. No new pixel PASS claimed here.
