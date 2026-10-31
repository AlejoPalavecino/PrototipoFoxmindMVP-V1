# FoxMind visual QA

## Cómo usar este historial visual

Esta página conserva pasadas fechadas y sus límites. Un «Current», «passed» o «blocked» de abajo pertenece a su candidato; no reemplaza el [estado actual del producto](docs/implementation-roadmap.md#estado-actual). Las capturas sintéticas no prueban por sí solas una operación autenticada, accesibilidad universal ni despliegue.

| Necesidad | Entrada |
|---|---|
| Consultar el sistema visual vigente | [Diseño y direcciones](docs/design/README.md) |
| Encontrar familias o exploraciones | [Catálogo de diseño](docs/design/INDEX.md) |
| Comprender qué acredita cada prueba | [Catálogo de verificación](docs/verification/README.md) |
| Buscar coordinación, pruebas o entrega | [Registros por unidad y fecha](docs/work-log/INDEX.md) |

Los encabezados y resultados siguientes se conservan sin reetiquetar una ejecución antigua por cambios posteriores.

## Agenda and new event reference — 2026-10-29

final result: passed for bounded synthetic reference comparison and event flow. [Evidence and scope](docs/work-log/evidence/2026-10-29-agenda-reference/README.md), [coordinator](docs/work-log/2026-10-29-root-agenda-reference.md). QA inspected reference-sized desktop,1200/1366 and six mobile mode states; corrected top alignment, toolbar overlap and condensed notebook chips. The new event dialog inherits the warm visual language and keeps existing categories, timezone, recurrence and private-event semantics. Month day selection retains the grid. Synthetic create/edit, invalid focus, timezone and navigation passed; 48 focused tests, strict types and isolated build passed. Form has no separate user reference; real private details and October fixture differ from the November mock. No authenticated backend, physical-device/Safari or real event mutation is claimed.

## Classroom interior — visual-only follow-up, 2026-10-29

final result: passed for the user-requested single visual pass, with differences noted. User excluded adding missing functionality. QA `/root/final_visual_qa` inspected eight desktop tabs at1672×941 and16 mobile views at320/390, with no horizontal document overflow; measured visible buttons were at least39px, not a general44px accessibility claim. Existing search, filters and topic selection worked in synthetic fixture. Typography, icons, buttons, card density, progress and student/history hierarchy were adjusted. Remaining differences include original hero art, unsupported content and controls, and wall posts naturally taller due to existing responses/actions; no pixel-perfect claim. Final screenshots were inspected in memory; the durable images below show the earlier version. Coordinator/independent review observed11 focused PASS and types; isolated build PASS. No authenticated backend E2E or real-data mutation. [Work record](docs/work-log/2026-10-29-root-interior-fidelity.md).

## Classroom interior fidelity follow-up — 2026-10-29

final result: blocked — exact match to the eight selected references is not yet verified.

Rebuilt each screen's structure with a populated synthetic Literatura fixture and generated WebP banner. [Eight current desktop captures](docs/work-log/evidence/2026-10-29-interior-fidelity/) document actual renders; the tester compared source/render at1672×941 and checked all tabs at320/390. Plan, library, wall, activities, progress, roster and settings were compacted and rechecked; local library filters and deep-link reset were exercised. User references include favorites, media types, roster filters and historical event kinds that current product contracts do not supply. History dates/timeline, progress columns and several decorative details still differ; no exact fidelity claim. The tester reports no mobile horizontal overflow in16 checked states. Focused11PASS, TypeScript and isolated build PASS; independent source review returned no findings. No authenticated backend/provider acceptance. Keep previous reports as history, not as evidence that this new exact-match request passed.

## Classroom interior references — 2026-10-29

Final result: passed for inspected synthetic states; populated history and durable screenshot evidence unavailable. Eight desktop tabs and eight tabs at320/390px were inspected by `/root/classroom_tests`, with no horizontal document overflow. Desktop header, tabs, breadcrumb, plan contrast, wall width, progress hierarchy and student/code layout were corrected and rechecked. The invitation dialog fits320px; student, archived, empty, error and loading states were observed. Screenshots were inspected in memory only. Real data, authenticated E2E, real submission/provider and physical devices were not tested. Existing supported features/data determine the differences from mock-only favorites, reactions, cover upload and fictional history events. [Coordinator record](docs/work-log/2026-10-29-root-classroom-interior-reference.md).

## Current Crear aula reference — final, 2026-10-29

final result: passed — bounded synthetic four-step verification.

[Reference, final screenshots and receipts](docs/work-log/evidence/2026-10-28-wizard-reference/README.md), [QA continuation](docs/work-log/2026-10-29-wizard_qa_finish.md), [independent review](docs/work-log/2026-10-29-wizard_review_finish.md). All four final source/render comparisons, focused controls and320/390 boards were inspected. Centered1046px form, compact desktop units/review, cream/orange surfaces, seven cover choices and ambient WebP follow the references. Initial icon overlap, sticky footer, desktop density and compressed mobile filename are corrected.

Final12 viewport states have no horizontal overflow or clipped block labels. Desktop primary actions end at915.55/888.80/928.75/921.05px within the942px CSS viewport. Mobile controls remain44px with16px input text; keyboard focus/actions are reachable through normal scrolling. Synthetic file/drop/save/extraction/review/publication busy and error flows passed. Proposal edits persist across steps without application; collapsed invalid units reopen and focus. Long-name journey collected329 runtime/console events with0 errors.

No unresolved P0/P1/P2. Standard iconography, supported copy and scrollbar gutter remain minor P3 differences. File-only approval and explicit suggestion replacement/publication contracts are preserved; no pasted-plan field or invented metadata. Final focused17PASS, strict types and production build PASS are coordinator evidence. No authenticated backend E2E, real provider/publication, native review or physical-device/Safari claim. The initial blocked report below remains history.

## Historical Crear aula reference — initial continuation, 2026-10-29

final result: blocked

Bounded synthetic four-step continuation by `/root/wizard_qa_finish`. Sources: `docs/work-log/evidence/2026-10-28-wizard-reference/step-{1..4}-reference.png`, each1672×941. Render source: real Wizard with in-memory ports at `http://127.0.0.1:53195/wizard?mode=proposal`. Desktop-v2 captures each1672×941, requested CSS1672×941/DPR1; Ego reports CSS height942 from rounding. No resampling required. Combined `compare-step-{1..4}-v2.png` source-left/render-right opened for all four states. Mobile has no supplied reference: 320/390×844 screenshots assess reflow and usability, not pixel matching.

**Findings**

- [P2] Desktop composition/density displaces the final controls below the supplied frame. Reference form starts nearx414/y195 and all step actions remain visible; rendered formx253/y230, width1000, bottoms1032/1001/1212/1144. Step3 cuts the second unit despite fewer topics. Evidence: four v2 comparisons and `desktop-v2.json`. Fix: center the main region and scope inherited margins/line heights/padding to the wizard while preserving accessible controls and full content.
- [P2] At320px the file card compresses the filename/status into a narrow vertical strip. Evidence: `step-2-320-v2.png` and `mobile-320-board-v2.png`. Fix: give the file text a useful flex basis and wrap its replacement action to the next row.

**Comparison history and fidelity surfaces**

Root identified and corrected initial icon/text padding and sticky footer overlap; v2 rendered visible inputs have44px left padding and footer static. Fixture navbar initially failed to select the private shell; QA changed fixture-only routing props, preserving production navigation. V2 compares Segoe UI hierarchy/weights, warm cream/brown/orange tokens, real WebP category imagery and generated ambient background, and supported wizard copy. Remaining composition findings above block visual acceptance. Intentional content constraints: file approval replaces fabricated size/time metadata; no unsupported pasted-plan field; editable suggestion counts, explicit replacement semantics and fixed-timezone copy remain truthful. Existing brand/category assets and standard library icons are reused as authorized; source's illustrative file-upload artwork is represented by its standard upload icon.

**Interactions and checks**

Nine bounded synthetic cases passed: missing-plan gate; approved picker/save-before-extraction; pending and rejected gates; upload busy; save busy; save error/no exit/publication; publish busy; publish error/explicit retry. Prior navigation receipt proves proposal retention, invalid collapsed-field reopening/focus, and review edits without mutation/publication. Eight mobile state checks have no horizontal overflow or clipped block labels; inputs16px and buttons≥44px. Long names/topics and keyboard input focus passed. Final mobile keyboard screenshot `keyboard-footer-mobile-final.png` shows visible focus and reachable publication action above the fixed navigation. Round17's misleading `keyboard-footer-focus-320.png` filename records a desktop-reset viewport; it is historical, superseded by round18's explicit320×844 capture. Runtime/console collection for the long-label journey:329 events,0 errors (`keyboard-long-console.json`); not a full-session console claim.

**Implementation Checklist**

- Correct the two P2 findings, recapture affected desktop/mobile states and compare source/render again.
- Save focused source/render crops and final findings; keep the preview open for inspection.
- No backend E2E, real publication/provider, physical-device/Safari, broad regression rerun or deployment is claimed. Source17PASS/types/build are earlier coordinator evidence, not rerun by this QA continuation.

## Current Mis aulas reference — 2026-10-28

final result: passed — bounded synthetic collection verification.

[Reference, final screenshots and behavior receipts](docs/work-log/evidence/2026-10-28-classrooms-reference/README.md), [agent record and execution incident](docs/work-log/2026-10-28-test_runner-classrooms-reference.md). The warm panoramic hero, horizontal cards and collection toolbar follow the selected screenshot while retaining actual role counts, academic year, archive state and invitations/drafts. Unsupported percentages, rosters and schedules were omitted.

Seven final layout/viewport checks passed at1784/1440/1024/768/390/320px, including320px list; earlier long-name,24-room, archived, loading/error/empty/busy cases passed. Desktop density, tablet artwork overlap and mobile list sizing were corrected. Teacher search and advanced filters preserve global counts; view changes produce no requests. Synthetic create/join/invitation/draft/classroom flows and keyboard focus passed. Independent review found clear-filter focus falling to BODY; final live recheck confirms focus returns to Más filtros. Focused13PASS/0FAIL after correction. This is frontend fixture evidence, not real backend authentication or data-mutation acceptance. An accidental disposable database suite ran during initial baseline selection; the linked record preserves it and excludes it from acceptance. Previous reports remain below.

## Current auth references — 2026-10-28

final result: passed

Bounded synthetic login/register verification. Fidelity surfaces reviewed: existing local Fredoka display type and readable body text; 53/47 split, gutters, control sizing and mobile reflow; warm cream, brown and orange colors; distinct sharp WebP illustrations with final full-bleed framing; and copy adapted to supported account behavior. Compact story text/benefits remain a P3 difference from the references.

[Reference comparison, final screenshots and state receipts](docs/work-log/evidence/2026-10-28-auth-reference/README.md), [agent record](docs/work-log/2026-10-28-test_runner-auth-reference.md). Both supplied references were inspected together with final renders. Cream split cards, orange actions and fox illustrations follow the selected direction while existing authentication contracts remain. Initial artwork bands and benefits overlay were corrected; remaining compact typography/benefit density is P3.

Both flows passed16 responsive states and six final reference/notebook rechecks, including1366×600,390px and320px. Inputs remain16px/48px, controls meet44px targets, no horizontal overflow or clipped labels was observed, and keyboard navigation reaches controls through vertical scrolling. Next-preserving navigation, password toggle without submission, busy/error/cooldown states, password clearing and recovery passed in real components with synthetic responses. New navigation tests progressed RED to GREEN3PASS; coordinator reported final21PASS/2existing opt-in SKIP and production buildPASS. No real authentication/backend, native review, physical-device/Safari or native zoom claim. Prior QA history remains below.

## Current Inicio reference — 2026-10-28

final result: passed

Bounded Home presentation contract, using synthetic real-component fixtures. [Reference comparison, responsive captures, interaction proof and limitations](docs/work-log/evidence/2026-10-28-inicio-reference/README.md), [agent record](docs/work-log/2026-10-28-test_runner-inicio-reference.md).

The supplied warm FoxMind reference now guides Inicio: illustrated hero, pastel shortcuts, classroom cards, learning/teaching groups and agenda/activity rail. The final 1784×882 comparison and 320px mobile were inspected after hero/target/density corrections. Five viewport checks fit; four keyboard callbacks, focus, partial-error retries, role states and pagination/return passed. Exact activity counts replace unsupported progress percentages and achievements. The final focused suite passed37; seven unrelated legacy visual-test failures were reproduced at the starting commit and preserved. This is not authenticated backend E2E, native review or physical-device/Safari acceptance.

The historical reports below retain their original scope and findings.

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
