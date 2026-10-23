# Folder theme visual QA

final result: passed (bounded local implementation review)

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
