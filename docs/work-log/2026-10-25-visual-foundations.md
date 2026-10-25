# FoxMind 3D D1 visual foundations — implemented, integration pending

- Agent / role: visual_foundations / slice worker
- Session or task ID: /root/visual_foundations
- Date: 2026-10-25
- Branch / worktree: codex/foxmind-3d-migration / canonical checkout
- Starting commit: eecb769151b12abb5ae9e1f15839b54c772e446f
- Phase and detailed task/spec links: D1; ../../odd/tasks/foxmind-3d-migration.md; ../design/foxmind-3d/foundations.md
- Status: in_progress

## Request and scope

Production asset copies, scoped tokens and reusable Brand/Illustration/Icon presentation components only. No AppNavbar, pages, behavior, tests, API/core, roadmap, commits or publication. Other agents own contracts/tests and must be preserved.

## Work performed

Read roadmap/work-record protocol, AGENTS and web AGENTS, design foundations/manifests, implementation plan and S0-UI contract. Inspected HEAD/branch/dirty tree. Viewed both approved screenshots. Read bundled Next16.4.2 Pages Router CSS/images/custom App guides and their linked shared source. Consulted Context7 React documentation for img/event props; exact19.3.0 query unavailable, official React docs successful. Existing React19.3.1 retained. Applying clean-architecture and taste skill component exception: explicit approved warm3D brand remains authoritative.

## Verification

- PASS: node node_modules/typescript/bin/tsc --noEmit --skipLibCheck --strict --target ES2022 --module esnext --moduleResolution bundler --jsx react-jsx --lib dom,esnext apps/shared-ui/index.ts (exit0, silent).
- PASS: node C:/Users/alejo/.codex/skills/taste-skill/scripts/lint.mjs apps/shared-ui/FoxmindBrand.tsx apps/shared-ui/FoxmindIllustration.tsx apps/shared-ui/FoxmindIcon.tsx (exit0; 0FAIL/0WARN). Repository has no ESLint/stylelint command; this is the available scoped source linter, not a claim of whole-repository lint.
- PASS: inline Node/sharp check of all51 WebP SHA-256, exact bytes and dimensions against asset/brand manifests. Compared every public asset byte-for-byte with assets/:100 exact copies, no masters/sources/evidence/references.
- PASS: inline WCAG luminance check: ink/orange5.91, muted/canvas6.00, link/white6.86, danger/white6.54, success/white7.16 (all>=4.5).
- PASS: git diff --check exit0; unrelated concurrent Classrooms.tsx CRLF warning retained, file not owned or edited here.
- No slice test runner invoked: pure decoration stage explicitly excludes CSS mirror tests. No functional GREEN claim; RED/GREEN for behavior remains with coordinator/test_runner. No existing test file changed.
- Live rendering/viewport/keyboard/reduced-motion/image-blocked verification pending consumer integration, explicitly not certified here.
- Initial combined PowerShell generation command had a parser error from shell brace expansion; no command executed. Reran a corrected generation command successfully. No repeated test/compiler error or circuit breaker.

## Commits and outcomes

No commit authorized for this worker.

## Handoff

Import apps/shared-ui/foxmind-3d.css exactly once from pages/_app.tsx after current presentation styles; opt layout into .fm3d-theme. Existing styles/pages are unchanged until that owner integrates. Brand/Illustration/Icon exported via apps/shared-ui/index.ts. Do not replace original logo with screenshot head. FoxmindBrand({variant?:horizontal|mark|inverse,className?,decorative?}); FoxmindIllustration({name:IllustrationKey,className?,priority?,sizes?}); FoxmindIcon({name:IconKey,className?}). Exact16 names in illustrationCatalog,42 iconNames in registry. Icon/link button owners retain accessible text. Illustration always alt empty, brand exposes FoxMind once (decorative=true when enclosing element already names brand). Failed images preserve slot and outer HTML actions; failed brand also renders FoxMind text. Only measured initial LCP consumers should use priority; custom sizes required for full-width hero.

Shell/accounts/Agenda next: implement their RED-backed behavior with current APIs and reuse these decorators; no generated images or mock data are necessary. Validate actual mounted results at320/390/768/1024/1440px, blocked images and reduced motion. No registry chooses classroom covers by name; legacy mapping/persisted covers remain next owner contract. No shared roadmap phase completion inferred.


## Exact changed-file inventory

| Path | Lines |
|---|---:|
| apps/shared-ui/foxmind-3d-graphics.css | 43 |
| apps/shared-ui/foxmind-3d-tokens.css | 40 |
| apps/shared-ui/foxmind-3d.css | 3 |
| apps/shared-ui/foxmind-assets.ts | 56 |
| apps/shared-ui/FoxmindBrand.tsx | 23 |
| apps/shared-ui/FoxmindIcon.tsx | 11 |
| apps/shared-ui/FoxmindIllustration.tsx | 27 |
| apps/shared-ui/index.ts | 6 |
| apps/shared-ui/raster-catalog.ts | 69 |
| apps/web/public/foxmind-3d/brand/favicon.svg | 1 |
| apps/web/public/foxmind-3d/brand/logo-horizontal-inverse.svg | 1 |
| apps/web/public/foxmind-3d/brand/logo-horizontal.svg | 1 |
| apps/web/public/foxmind-3d/brand/logo-stacked.svg | 1 |
| apps/web/public/foxmind-3d/brand/mark.svg | 1 |
| apps/web/public/foxmind-3d/brand/wordmark.svg | 1 |
| apps/web/public/foxmind-3d/brand/zorroh-128.webp | binary |
| apps/web/public/foxmind-3d/brand/zorroh-256.webp | binary |
| apps/web/public/foxmind-3d/brand/zorroh-512.webp | binary |
| apps/web/public/foxmind-3d/covers/biology-320.webp | binary |
| apps/web/public/foxmind-3d/covers/biology-640.webp | binary |
| apps/web/public/foxmind-3d/covers/biology.webp | binary |
| apps/web/public/foxmind-3d/covers/creative-320.webp | binary |
| apps/web/public/foxmind-3d/covers/creative-640.webp | binary |
| apps/web/public/foxmind-3d/covers/creative.webp | binary |
| apps/web/public/foxmind-3d/covers/general-320.webp | binary |
| apps/web/public/foxmind-3d/covers/general-640.webp | binary |
| apps/web/public/foxmind-3d/covers/general.webp | binary |
| apps/web/public/foxmind-3d/covers/literature-320.webp | binary |
| apps/web/public/foxmind-3d/covers/literature-640.webp | binary |
| apps/web/public/foxmind-3d/covers/literature.webp | binary |
| apps/web/public/foxmind-3d/covers/math-320.webp | binary |
| apps/web/public/foxmind-3d/covers/math-640.webp | binary |
| apps/web/public/foxmind-3d/covers/math.webp | binary |
| apps/web/public/foxmind-3d/covers/science-320.webp | binary |
| apps/web/public/foxmind-3d/covers/science-640.webp | binary |
| apps/web/public/foxmind-3d/covers/science.webp | binary |
| apps/web/public/foxmind-3d/covers/society-320.webp | binary |
| apps/web/public/foxmind-3d/covers/society-640.webp | binary |
| apps/web/public/foxmind-3d/covers/society.webp | binary |
| apps/web/public/foxmind-3d/hero/welcome-learn-480.webp | binary |
| apps/web/public/foxmind-3d/hero/welcome-learn-960.webp | binary |
| apps/web/public/foxmind-3d/hero/welcome-learn.webp | binary |
| apps/web/public/foxmind-3d/hero/welcome-teach-480.webp | binary |
| apps/web/public/foxmind-3d/hero/welcome-teach-960.webp | binary |
| apps/web/public/foxmind-3d/hero/welcome-teach.webp | binary |
| apps/web/public/foxmind-3d/icons/archive.svg | 1 |
| apps/web/public/foxmind-3d/icons/arrow-left.svg | 1 |
| apps/web/public/foxmind-3d/icons/arrow-right.svg | 1 |
| apps/web/public/foxmind-3d/icons/attach.svg | 1 |
| apps/web/public/foxmind-3d/icons/bell.svg | 1 |
| apps/web/public/foxmind-3d/icons/book.svg | 1 |
| apps/web/public/foxmind-3d/icons/calendar.svg | 1 |
| apps/web/public/foxmind-3d/icons/chat.svg | 1 |
| apps/web/public/foxmind-3d/icons/check.svg | 1 |
| apps/web/public/foxmind-3d/icons/chevron-down.svg | 1 |
| apps/web/public/foxmind-3d/icons/chevron-right.svg | 1 |
| apps/web/public/foxmind-3d/icons/clipboard.svg | 1 |
| apps/web/public/foxmind-3d/icons/clock.svg | 1 |
| apps/web/public/foxmind-3d/icons/close.svg | 1 |
| apps/web/public/foxmind-3d/icons/copy.svg | 1 |
| apps/web/public/foxmind-3d/icons/download.svg | 1 |
| apps/web/public/foxmind-3d/icons/edit.svg | 1 |
| apps/web/public/foxmind-3d/icons/eye-off.svg | 1 |
| apps/web/public/foxmind-3d/icons/eye.svg | 1 |
| apps/web/public/foxmind-3d/icons/file.svg | 1 |
| apps/web/public/foxmind-3d/icons/filter.svg | 1 |
| apps/web/public/foxmind-3d/icons/folder.svg | 1 |
| apps/web/public/foxmind-3d/icons/help.svg | 1 |
| apps/web/public/foxmind-3d/icons/home.svg | 1 |
| apps/web/public/foxmind-3d/icons/link.svg | 1 |
| apps/web/public/foxmind-3d/icons/lock.svg | 1 |
| apps/web/public/foxmind-3d/icons/logout.svg | 1 |
| apps/web/public/foxmind-3d/icons/menu.svg | 1 |
| apps/web/public/foxmind-3d/icons/minus.svg | 1 |
| apps/web/public/foxmind-3d/icons/more.svg | 1 |
| apps/web/public/foxmind-3d/icons/plus.svg | 1 |
| apps/web/public/foxmind-3d/icons/profile.svg | 1 |
| apps/web/public/foxmind-3d/icons/progress.svg | 1 |
| apps/web/public/foxmind-3d/icons/refresh.svg | 1 |
| apps/web/public/foxmind-3d/icons/search.svg | 1 |
| apps/web/public/foxmind-3d/icons/settings.svg | 1 |
| apps/web/public/foxmind-3d/icons/shield.svg | 1 |
| apps/web/public/foxmind-3d/icons/spark.svg | 1 |
| apps/web/public/foxmind-3d/icons/sprite.svg | 44 |
| apps/web/public/foxmind-3d/icons/trash.svg | 1 |
| apps/web/public/foxmind-3d/icons/upload.svg | 1 |
| apps/web/public/foxmind-3d/icons/users.svg | 1 |
| apps/web/public/foxmind-3d/icons/warning.svg | 1 |
| apps/web/public/foxmind-3d/scenes/agenda-320.webp | binary |
| apps/web/public/foxmind-3d/scenes/agenda-640.webp | binary |
| apps/web/public/foxmind-3d/scenes/agenda.webp | binary |
| apps/web/public/foxmind-3d/scenes/auth-320.webp | binary |
| apps/web/public/foxmind-3d/scenes/auth-640.webp | binary |
| apps/web/public/foxmind-3d/scenes/auth.webp | binary |
| apps/web/public/foxmind-3d/scenes/profile-320.webp | binary |
| apps/web/public/foxmind-3d/scenes/profile-640.webp | binary |
| apps/web/public/foxmind-3d/scenes/profile.webp | binary |
| apps/web/public/foxmind-3d/scenes/security-320.webp | binary |
| apps/web/public/foxmind-3d/scenes/security-640.webp | binary |
| apps/web/public/foxmind-3d/scenes/security.webp | binary |
| apps/web/public/foxmind-3d/states/empty-160.webp | binary |
| apps/web/public/foxmind-3d/states/empty-320.webp | binary |
| apps/web/public/foxmind-3d/states/empty.webp | binary |
| apps/web/public/foxmind-3d/states/success-160.webp | binary |
| apps/web/public/foxmind-3d/states/success-320.webp | binary |
| apps/web/public/foxmind-3d/states/success.webp | binary |
| apps/web/public/foxmind-3d/states/unavailable-160.webp | binary |
| apps/web/public/foxmind-3d/states/unavailable-320.webp | binary |
| apps/web/public/foxmind-3d/states/unavailable.webp | binary |

## Expanded assignment D2/D8 — in progress

Coordinator /root authorized presentation of shell/accounts/Agenda in this task, preserving existing behavior until RED authorization. Actual accounts live in apps/web/src/components/account-screen.tsx; no apps/accounts-ui module exists. This worker now owns _app CSS integration, account-screen/account-navbar, shared shell/account presentation and agenda-ui. Other workers own classrooms-ui (except Home) and Home backend/UI. First new behavior remains /settings/account split/drawer, explicitly waiting for RED. New scope does not authorize commits/publication.

### D2/D8 presentation checkpoint

Observed web project `tsc --noEmit --project apps/web/tsconfig.json --incremental false`: PASS silent exit0 after integration. Scoped taste lint AccountStory/Upcoming PASS0FAIL0WARN. Imported new theme entry in _app after legacy and imported classrooms CSS from its worker; no legacy sheet removed. Added scoped controls/account/Agenda sheets plus dormant fm3d-shell/drawer styles awaiting RED. AccountStory uses auth/security scenes; verification uses neutral auth decoration (never success image to imply verification); profile art only renders beside verified profile. Upcoming empty remains actual text, now shared empty illustration. AppNavbar keeps old behavior with original Brand substituted. _document token-safe head untouched. Awaiting /root/visual_tests RED and coordinator authorization for shell/settings/account split. Browser guide read; no new Space/runtime created because coordinator/test_runner owns shared goal browser proof.


## Expanded assignment final handoff — D2/D8 implementation ready, independent browser proof pending

Coordinator authorized GREEN after observed RED settings allowlist and Agenda parser ENOENT; test_runner owns tests. Implemented original-brand sidebar/native dialog, keyboard Escape/native focus containment and openDialog focus restoration; route completion focuses main heading. Anonymous/unverified shell never receives private destinations; private shell follows verified classroom links. AppNavbar signatures preserved, optional currentPath added for settings/profile selection. Drawer trigger Abrir menú de navegación; dialog Menú de navegación; close Cerrar menú de navegación. No fake search. Original CSS retained for rollback; _app imports new shared/classrooms/Home/Agenda entries and theme scope. _document untouched, preserving token-safe head ordering.

Created /settings with existing account no-store server props. Split profile personal fields from settings password/logout, using original mutation/cooldown/CSRF/session handlers. AccountField named re-export preserved. Auth forms structurally extracted without changing token/proof/credential rules. AccountScreen reduced from original300+lines to192; inherited session/controller body still exceeds40lines and remains explicit review debt rather than claiming full small-function conformance. All newly extracted visual functions are short.

ClassroomsScreen wires memoized createWebHomeClient(fetch,requireAccount), subjectId=user.id, key=user.id; classrooms owner supplies corresponding App props. Private Home action navigates using event/date (owned by classrooms worker). Agenda parser accepts exactly event UUID/date real-calendar pair, rejects arrays/extras/invalid dates, never adds query continuation to auth allowlist. AgendaEventRequest optional prop passes parsed target; hook GET-authorizes event before selecting day/focusing current event card and ignores stale/unmounted responses. Query includes no names/notes. Denied target displays generic error; actual Agenda list/mutations/zone/recurrence/DST remain owners.

### Observed verification after expanded GREEN

- PASS: node --test --test-reporter=dot tests/foxmind-3d-flows-account.test.mjs tests/foxmind-3d-flows-agenda.test.mjs —3tests.
- PASS: node --test --test-reporter=dot --test-name-pattern='D2 settings' tests/foxmind-3d-flows.test.mjs —1selected test.
- PASS: node --test --test-reporter=dot tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs —16dots, exit0.
- PASS: node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json --incremental false —exit0 after Agenda/Home integration.
- PASS: taste lint6files (AppNavbar/NavbarParts/account field/profile/settings/flow forms) —0FAIL0WARN.
- Corrected one initial compilation error caused by a CRLF-sensitive insertion at wrong marker; next isolated and whole-web type checks passed. Concurrent Classrooms/Home missing-prop diagnostic belonged to other owner and disappeared after their integration. No same error failed twice after correction; circuit breaker not activated.
- Corrected mixed CRLF whitespace from text extraction after one git diff --check failure; scoped diff check then exit0 with line-ending normalization warnings only. No other-owner file reverted.
- Pending independent live browser proof: shell focus trap/restore and navigation, all account paths and settings mutations, Agenda query authorization/focus/error/stale response; 320/390/768/1024/1440px,200%zoom,reduced-motion,blocked-art. This worker opened no Space/runtime, per coordinator reserve for visual_tests. No screenshot acceptance, build or full82flow claim.

### Expanded exact source inventory

| Path | Lines |
|---|---:|
| apps/shared-ui/AppNavbar.tsx | 35 |
| apps/shared-ui/NavbarParts.tsx | 32 |
| apps/shared-ui/AccountStory.tsx | 31 |
| apps/shared-ui/foxmind-3d-controls.css | 52 |
| apps/shared-ui/foxmind-3d-account.css | 52 |
| apps/shared-ui/foxmind-3d-shell.css | 86 |
| apps/shared-ui/foxmind-3d-tokens.css | 48 |
| apps/shared-ui/foxmind-3d-graphics.css | 44 |
| apps/shared-ui/foxmind-3d.css | 6 |
| apps/agenda-ui/Agenda.tsx | 47 |
| apps/agenda-ui/Upcoming.tsx | 24 |
| apps/agenda-ui/index.ts | 17 |
| apps/agenda-ui/useAgendaEventTarget.ts | 25 |
| apps/agenda-ui/foxmind-agenda.css | 55 |
| apps/web/pages/_app.tsx | 24 |
| apps/web/pages/settings.tsx | 3 |
| apps/web/src/components/account-screen.tsx | 192 |
| apps/web/src/components/account-field.tsx | 23 |
| apps/web/src/components/account-profile.tsx | 31 |
| apps/web/src/components/account-settings.tsx | 27 |
| apps/web/src/components/account-flow-forms.tsx | 87 |
| apps/web/src/components/account-view.ts | 10 |
| apps/web/src/components/account-navbar.tsx | 29 |
| apps/web/src/components/agenda-screen.tsx | 55 |
| apps/web/src/components/classrooms-screen.tsx | 63 |
| apps/web/src/lib/classroom-client.ts | 39 |
| apps/web/src/lib/agenda-target.ts | 13 |

Next exact action: coordinator schedules independent review against this tree and visual_tests owned live runtime/Space. Reopen only findings; no commits/push/deployment performed or inferred. Available to reactivate for fixes.

## Visual fidelity follow-up — in progress

Coordinator requested global presentation polish against real Ego export .test-artifacts/foxmind-3d-home-screen-export.png and approved references07/08/04/05/06. Scope only shared shell/frame; Home owner handles hero/thumbnail, classroom owner loading banner. Observed causal frame issue: private theme padding(sidebar+24) plus legacy p5-app32px and main24px margin compounds the left gutter to about312CSSpx at1440. Utilities are currently inside fixed sidebar rather than top-right. Will remove compounded gutters under fm3d-theme and place existing notification owner plus actual account avatar into a desktop utility strip. No new search/policies, no duplicate notification mount. Browser Space remains visual_tests-owned.

### Global fidelity follow-up handoff

Changed only AppNavbar.tsx and foxmind-3d-shell.css in this round. The desktop frame now uses a responsive208–232pxsidebar and a single12pxcontent gutter: analytical CSS content-start is245.44px at1440 and259.94px at1536 (rather than prior compounded312px at1440). Scoped overrides remove legacy p5-app horizontal32px and centered main24px/maximum width; anonymous layout and legacy CSS are retained. Actual pixel positions still require real capture.

The existing notifications instance is moved with CSS to a72pxdesktop utility strip at top-right, with a real /profile avatar using account initials and accessible name. No fake search and no second notifications query. Sidebar retains Settings/Profile low in layout; redundant old account/logout block is hidden only in desktop sidebar, retaining drawer/session actions. Native dialog markup/openDialog/Escape unchanged. At520px and below logo128px and avatar40px keep three real tools within320px. Brand asset optimization deferred in favor of requested frame fidelity; approved original mark remains intact.

Observed checks: web project tsc noEmit incrementalfalse PASSexit0; taste lint AppNavbar0FAIL0WARN; scoped gitdiffcheckPASS (LF normalization warning only); account2+Agenda parser1 testsPASS. Read actual Ego export and all five specified references. Pending runner-owned live recapture including320px header fit, notification dialog positioning and mobile focus, plus requested real PDF/visual evidence; no D10 acceptance claimed. New AppNavbar38lines, shell CSS129lines (exact count may change with later owner edits).

## Profile/settings fidelity Group2 follow-up — in progress

Read Group2 profile PNG and rendered settings PDF using bundled Poppler (PDF2pages,1080x750pt). Observed clipped yellow folder headings and duplicate contour frames; source identifies legacy folders-tabs.css ::before/::after, which were not removed by changing card borders alone. Profile art was absent in captured pixels while settings scene was present; source still used lazy/async, but no network timing evidence proves a specific load race. Will replace account folder markup with plain new card classes, move account identity into right summary/art panel, and use eager/synchronous decode for the one visible page-specific scene. Scoped entry-page anchor override currently also colors sidebar links orange; narrow to main content. Independent new-build Group4 PDF remains required. Read pdf skill for read-only render; no PDF authored.

### Group2 account polish handoff — implementation verified, new pixels pending

Removed folder-panel/folder-tab classes entirely from profile/security/session cards, so legacy folder ::before/::after cannot paint the retained yellow tab or doubled frame. New fm3d-account-card has thin border/radius20/padding24 and ordinary headings. Shared account grid is explicit2fr/1fr; confirmed account summary moved into new AccountArtwork beside page-specific full Foxy scene. Settings account/email/profile link now lives in that right panel instead of a third left card. Mobile still prioritizes the existing form column. Profile art retains contain sizing and full original illustration; no artwork regeneration/crop/logo changes.

Priority is applied only to the mounted profile/security scene. Shared Illustration decodes sync when priority=true, preserving async lazy behavior by default. Settings PDF already showed its Foxy while profile PNG did not; a specific lazy/decode race remains unproved, so this is a loading precaution pending actual next-build pixels rather than a root-cause claim. Narrowed .entry-page main anchor color override so sidebar inactive links inherit normal ink, only aria-current keeps selection.

Observed checks: webtsc noEmit incrementalfalsePASS; accountsplit2testsPASS; taste3componentlint0FAIL0WARN; scoped diffcheckPASS (existing LF normalization warning only). Ran pdfinfo and rendered settingsPDFpage1withPoppler; PDF2pages,1080x750pt. Derived read-only image .test-artifacts/foxmind-3d-settings-worker-view.png inspected; original PDF untouched. Read actualprofilePNG, both05/06referenceimages and productionprofile scene. No browser/build/Group4 capture claimed. No behavior/test/session/guard/token/mutation changes.

| Path | Lines |
|---|---:|
| apps/web/src/components/account-profile.tsx | 30 |
| apps/web/src/components/account-settings.tsx | 24 |
| apps/web/src/components/account-artwork.tsx | 18 |
| apps/web/src/components/account-screen.tsx | 193 |
| apps/shared-ui/FoxmindIllustration.tsx | 27 |
| apps/shared-ui/foxmind-3d-account.css | 76 |
| apps/shared-ui/foxmind-3d-controls.css | 52 |

Next exact action: coordinator NextbuildGroup4 and runner-owned real profile/settings exports; verify cards have no folder frame, full Foxy visible, sidebar inactive ink/current orange,2column desktop and320pxforms. Group3 QA remains evidence of its earlier built tree. No final acceptance/D10 asserted.

## Agenda final presentation polish — in progress

Read actual Group2 Agenda1440PNG: three duplicated folder frames/overlapping colored headings are visible, and calendar rows collapse near44–50px. Source cause is retained folder-panel/folder-tab pseudoelements, plus shared controls min-height specificity overriding lower-specificity agenda day sizing. Scope only Agenda presentation: own card classes, explicit calendar rows, existing aria-pressed selection preserved, current date labeled using view timezone, optional single approved scene at right footer. No range/DST/write/target/focus behavior changes. Group4 newbuild/PDF remains acceptance gate.

### Agenda presentation final handoff — frozen for Group4 build

Replaced folder-panel/folder-tab markup in all three Agenda panels with fm3d-agenda-card and ordinary visible h2. This removes the actual selector trigger for inherited pseudo tabs/duplicate frames without deleting any legacy sheet. Calendar day sizing now has stronger scoped specificity than shared button44px controls, plus explicit grid min rows76px desktop/64px phone. Month/day/upcoming remain two-column desktop with existing one-column mobile flow; no root gutter change. Dates align to shared grid borders. Actual current local day is annotated aria-current=date and visible ring; selected day retains aria-pressed and filled/bordered styling, with date labels including hoy. Actual timezone calculation uses existing dateAt; no date range/clock policy/recurrence/write logic changed.

A single approved scenes/agenda illustration follows the actual Upcoming content on desktop, replacing duplicate empty mascot decoration; mobile hides secondary scene and keeps text/list/actions. No generated artwork or data. Event focus/edit/open handlers,93day policies,DST and readonly checks untouched.

Observed checks: webtsc noEmit incrementalfalsePASS; node --test --test-reporter=dot tests/agenda-ui.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-color-view.test.mjs tests/foxmind-3d-flows-agenda.test.mjs PASS15tests; taste lint3Agenda componentfiles0FAIL0WARN; scoped gitdiffcheckPASS. No tests edited. Final panel height/pixels remain unverified until new build/export; no claim that the earlier screenshot changed.

| Path | Lines |
|---|---:|
| apps/agenda-ui/AgendaMonth.tsx | 34 |
| apps/agenda-ui/AgendaDay.tsx | 34 |
| apps/agenda-ui/Upcoming.tsx | 25 |
| apps/agenda-ui/foxmind-agenda.css | 67 |

Next exact action: coordinator freezes source for Group4 Nextbuild and visual_tests real Agenda/profile/settings exports; inspect panel headings,cell height,hoy versus selection and320px overflow/focus. This worker stops edits pending explicit review findings.

## Final L1 load entrance — in progress, separate from prior audited candidate

Coordinator explicitly requested the original soft-entry detail as a reversible CSS-only unit after the prior bounded review. Scope exactly foxmind-3d-controls.css plus this record; no prior audited subject is relabeled. Real selectors confirmed: fm-home-greeting/fm-home-columns, fm3-classroom-grid, fm3d-account-card, agenda-layout. Existing token motion180ms and Home reduced-motion !important are preserved; this isolated entrance uses160ms as requested. PostCSS8.5.23 is installed; official Context7 parse/traversal documentation consulted. No runtime services/browser/test files involved.

### Final L1 entrance completed — exact unreviewed decorative delta

Only12lines appended to apps/shared-ui/foxmind-3d-controls.css (64total), with the entire pre-existing staged CSS prefix byte-identical. Named fm3d-enter moves4px vertically and fades opacity.72→1 over160ms ease-out; no stagger/delay/fill-mode/persistent hidden state. Real top-level visual blocks use :is(.fm-home-greeting,.fm-home-columns,.fm3-classroom-grid,.fm3d-account-card,.agenda-layout); nested cards are not double-animated by their selected ancestors. Default styles remain visible before/after animation. No dimensions/margins/position properties animate, so layout itself remains unchanged. No focus/DOM/order/guard logic touched; no flashing/repeated animation. A transform creates a transient stacking context for160ms, but selected blocks do not contain the shell/native modal owners.

Animation applies exclusively inside prefers-reduced-motion:no-preference. An explicit later prefers-reduced-motion:reduce rule assigns animation:none to the same selector; existing Home reduce!important remains stronger and consistent. Unknown/unsupported preference gets no animation. Existing token180ms remains unchanged; this standalone entry uses160ms per task. No wider source cleanup or audit-subject claim.

Observed: PostCSS8.5.23 parse of entire CSS PASS. Custom one-shot AST lint PASS: exact160ms/ease-out, only opacity/transform keyframes, no opacity0, required preference gate/override, added-line budget<=20, unchanged staged prefix. git diff --check scopedPASS with line-ending normalization warning only; git diff --numstat shows12insertions0deletions. No CSS-mirror tests added/run, no TS/build/service/browser work required for this decorative-only delta. These checks validate syntax/constraints, not fresh pixel acceptance; captures made after180ms should settle to unchanged final styles but no new capture was claimed.

Rollback: remove exactly the final12line fm3d-enter keyframes and the two new media blocks; retain all earlier shared CSS and the separately reviewed candidate. Coordinator must describe this CSS delta separately from the prior bounded review. Worker scope completed; no commit/publication performed.
