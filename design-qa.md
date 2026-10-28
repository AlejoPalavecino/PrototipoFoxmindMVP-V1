# FoxMind visual QA

## Current sky learning direction — 2026-10-28

final result: passed — bounded visual adaptation on `codex/foxmind-ux-redesign`; local only.

The user selected the attached Lingora dashboard as the platform-wide concept, superseding the earlier warm/green direction. App-owned content, excluding the tablet bezel, is the reference. The implementation retains FoxMind branding and real educational data: pale sky canvas, light sidebar, blue primary actions, navy rounded headings, pastel shortcuts, illustrated greeting and supporting agenda column. [Side-by-side comparison and captures](docs/work-log/evidence/2026-10-28-sky-reference/README.md), [coordinator](docs/work-log/2026-10-28-root-sky-reference.md).

The source crop (1130×787) and actual Inicio (1440×1000) were normalized to equal displayed size and inspected together. Deliberate differences: existing fox/cover imagery, three real navigation destinations, pending/review work and personal agenda replace the reference's language courses, virtual currency, leaderboard and daily-goal data. No unsupported product features were invented. The reference has no mobile state; mobile uses the same art direction with bottom navigation, full-width tasks and an independently positioned decorative illustration.

### Observed scope

- Real authenticated Inicio, Mis aulas, Agenda, Perfil and Configuración at 1440/768/390/320px; eight teacher sections at 1440/390/320px; six student sections at 390px. All 50 document-width observations fit their viewport. Main-route images loaded successfully.
- Actual hero navigation, native styled picker/Escape, AI setup and grading entry/return. No activity, grade, event or account changes saved.
- Controlled actual-component fixtures: sign-in/register forms, classroom creation and labelled RUNNING/QUEUED AI waiting screens at desktop/mobile. Fixture captures are not real provider or publication proof.
- Focused functional checks: 22 PASS, 0 FAIL, 0 SKIP; strict web types and isolated production build PASS. Existing external-lockfile warnings remain advisory. No configured lint command or independent/native review is claimed.

### Corrections and limits

Initial captures exposed orange task actions and a mobile hero crop behind text. Scoped selectors now unify blue actions; mobile artwork sits below the text with the existing fox retained. Heading weights, wizard selection and hover colors were aligned. Refresh metadata moved below the task list. Final source/render comparison, mobile 320px, native picker, auth and wizard captures were opened after correction. An early auth capture contained a loading state; final evidence waits for actual fields.

The dev CSS import cache initially served earlier content, including after a restart. Updating the stylesheet entry invalidated that cache; the final browser reports the new WebP and blue task-action color. Minimized-window screenshot failure was resolved by restoring the owned browser window. One student-tab attempt encountered a development reload; the actual classroom was reopened before the successful six-section check.

No unresolved P0/P1/P2 visual issue remains in the inspected states. This is not complete production, accessibility, physical-device or Safari acceptance. Earlier successful-real-AI/application and submission/grading-persistence gaps remain as recorded in the educational-experience handoff. Historical evidence below retains its original scope.

## Historical folder theme visual QA

final result: passed (2026-10-24 bounded folder-tab correction; integrated into local main)

## Current verified correction — 2026-10-24

Local main now contains the exact verified candidate `a6fe079`; [integration proof](docs/work-log/2026-10-24-root-tabs-main-integration.md). The preparation/verification text below remains historical; its no-main-integration statement is superseded only for local integration. No push or deployment.

The selected shoulder/flat-top/sloped-edge folder shape is verified on `codex/folder-tabs-ready`, based on main `b00b6fb`. Registration, profile, Inicio, Mis aulas, Agenda, classroom sections and wizard headings were inspected in real Ego screenshots at desktop/390/320. Fresh final shared-tone, fallback, long-label, forced-color and wizard-spacing captures pass. Mobile account/header and wizard/stepper occlusions were corrected; the SVG-suppressed fallback remains readable and current global navigation stays distinguishable under forced colors.

[Independent live proof](docs/work-log/2026-10-24-tabs-live-verify.md), [final review](docs/work-log/2026-10-24-tabs-final-review.md), [selected original PNGs](docs/work-log/evidence/2026-10-24-folder-tabs/README.md) and [coordinator/handoff](docs/work-log/2026-10-24-root-folder-tabs-ready.md) retain failures and scope. Actual200percent native browser zoom was unavailable; equivalent744x500/DPR2reflow was verified. Wizard proof covers steps1/2; no new AI/upload journey or physical-device/Safari acceptance. No main integration, push or deployment.

## Historical correction preparation — 2026-10-23
The user rejected the previous rectangular folder tabs and selected references/folder-tab-user-selected.png inside the retained mockup package. The previous full-platform acceptance below is historical and does not prove this requested silhouette. Current target: rounded left shoulder, raised flat top, inclined right edge and continuous front/back folder outline for every panel tab and related navigation. Existing content/flows remain.

Ego Space1 is the same preview surface. Page.captureScreenshot, native screenshot and fromSurface:false each timed out even with document.visibilityState visible; restoring/bringing forward the window and the user's confirmation did not resolve capture. No fabricated screenshot or new visual PASS is claimed. Implementation can progress independently; alternate browser permission is pending under the user's Ego-only project rule. Current correction record: docs/work-log/2026-10-23-root-folder-tabs.md.

## Historical full-platform review — 2026-10-22

## Targets and evidence
The selected visual truth is `docs/design/foxmind-platform-mockups/screens/01-login.png` through `24-mi-perfil.png`. All24 desktop states were captured from the real owned V1 fixture at http://127.0.0.1:57492 in Ego Lite Space1, pagep1. Desktop viewport1487×1058, device scale1. Source dimensions differ by at most one pixel; comparison composites preserve original pixels without density resampling. Evidence is local under `.test-artifacts/folders/final-*` and `compare-<reference-name>.png`; credentials are excluded from version control.

Independent visual review [A](docs/work-log/2026-10-22-folder-visual-verify-a.md) covers01–12 plus login/registration/wizard320px. [B](docs/work-log/2026-10-22-folder-visual-verify-b.md) covers13–24 plus student320/390, profile320, teacher configuration320 and quiz-result320. Each comparison was opened as an image. Root additionally inspected focused auth controls, folder headings, profile and published-result dialog. This is visible-region design acceptance, not human design approval or a claim of comprehensive accessibility conformance.

## Corrections and recapture history
Initial native screenshots failed while Ego was minimized. Restoring its owned target through Target.getTargets, Browser.getWindowForTarget and Browser.setWindowBounds(normal) resolved the blocker. Native screenshot resets emulation to952×405; documented CDP Page.captureScreenshot preserved the requested full viewport. Earlier952px artifacts are exploratory, not matched-viewport evidence. User subsequently returned control explicitly before real delivery/grading validation.

Comparison found folder headings displaced inside panels by existing h2 margins; scoped margins corrected them. Further corrections restore masked-icon paint, teacher/student tab colors, account control proportions,160px cover containment and compact mobile header spacing. Every affected state was recaptured. The old `verify-student-quiz-result-320.png` precedes the header correction: replacement `final-quiz-result-320.png` at320×780 has document clientWidth305/scrollWidth305 and dialog clientWidth256/scrollWidth256, with no horizontal overflow in the opened capture. Student320/390 and account/wizard/configuration mobile captures also fit their visible viewports.

No unresolved P0/P1/P2 finding remains in the reviewed regions. Optional P3: registration step badges could separate their number/text more clearly. Content below individual viewports and every possible data density are outside screenshot-only review.

## Functional evidence
Fresh source/client/proxy/theme suite:101tests,97PASS,0FAIL,4optional origin-dependentSKIP. Strict classroom TypeScript, API build with fresh Prisma generation, and production Next build passed. No native linter is configured. Independent static review re-read corrected findings and returned scoped LGTM.

The [live verifier](docs/work-log/2026-10-22-folder-live-verify.md) exercised8teacher/6student sections, all4wizard steps, real PDF scan/upload, quiz and practical-work delivery, private grades9.50/8.25, explicit publication, student feedback and progress2/2=100%, average8.88. Root subsequently published its own synthetic wizard classroom and inspected the actual success receipt. Fresh final navigation console collection contained0 runtime exceptions/error logs; earlier buffered errors and build/HMR failures remain attributed in the coordinator record.

## Intentional differences and delivery boundary
Synthetic real content differs from illustrative mock data. Existing creation/join entry points, authentication destinations, section defaults, permissions and academic operations remain. Unsupported mock controls or API proposals were not invented. Screen09 is the actual publication receipt within the existing classroom flow. Additional authoring/attempt/grading states inherit the folder system and were exercised live. No remote publication, deployment or retained-data change is included.
