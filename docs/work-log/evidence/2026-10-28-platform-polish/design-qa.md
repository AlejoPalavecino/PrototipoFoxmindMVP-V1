# Platform visual polish — integrated-browser acceptance

- Agent/task: /root, coordinator and browser operator; 2026-10-28.
- Branch: codex/foxmind-visual-polish from fa3ce749; isolated candidate53181, baseline53182.
- Status: completed within component-presentation scope.
- Authorization: user approved isolated copy and Codex integrated browser; ego was unavailable. All delegated work in this execution used Astra/high or xhigh.

## What was exercised

The harness imports actual FoxMind components and styles with synthetic clients. It is a presentation fixture, not a production API, authenticated end-to-end session or persistence test. [Fixture contract](../../../../tests/helpers/platform-polish/README.md), [test report](../../2026-10-28-astra-visual-harness.md), [coordinator](../../2026-10-28-root-platform-visual-polish.md).

| Surface | Direct evidence and result |
|---|---|
| Shared navigation | Stable desktop shell;320px drawer visible, Tab focuses Inicio with3px lavender outline; Escape removes dialog and returns focus to menu trigger. `menu-keyboard-320.jpg`. |
| Home | Mixed role at1366x768 and1280x800; greeting stays clear of Foxy, cards/miniagenda preserved. `home-notebook.jpg`, `home-ready-1280.jpg`. Empty tablet viewed; original capture catches entry animation and is not contrast evidence. |
| Classroom collection |1440x900 and390px; cards, subject/role chips, actions and originals preserved. Study filter reduced3to1; fixture card navigation corrected then usable. `aulas-desktop.jpg`, `aulas-mobile.jpg`. |
| Classroom Plan | Student at768x1024 and320x812; actual units/resources/activities and local scrolling tabs, no page-width overflow. Library/Wall tabs inspected. `plan-tablet.jpg`, `plan-ready-320.jpg`. |
| Creation | Duplicate heading removed; mobile fields/status/actions preserved. Continue moved from Datos generales to Plan de estudio, in-memory draft only. `wizard-ready-mobile.jpg`. |
| Learning | Actual authoring desktop/mobile, attempt dialog, grading, AI form and published-result presentation inspected; notices/privacy/disabled actions remain. `authoring-*.jpg`, `attempt-desktop.jpg`, `grading-desktop.jpg`, `generation-desktop.jpg`, `result-ready-desktop.jpg`. |
| Agenda |390px calendar and New event dialog; Escape closes dialog and returns focus. Tablet error retains retry plus calendar and unavailable-deliveries notice. `agenda-dialog-mobile.jpg`, `agenda-error-tablet.jpg`. |
| Account | Sign-in/register mobile, profile ready1440and390, settings390, recovery/verification/reset390; no credentials entered or writes submitted. `profile-ready-*.jpg`, `settings-ready-mobile.jpg`, `recovery-ready-*.jpg`, `verify-ready-mobile.jpg`, `reset-ready-mobile.jpg`. |
| Files |390px verified synthetic session: quota, security notice, file picker, disabled upload and refresh visible. `files-ready-mobile.jpg`. No uploaded bytes/iframe preview/scan claim. |

`browser-observations.json` preserves sampled dimensions and headings. No observed ready capture exceeds its viewport width; scrollbar-reduced scrollWidth is normal. This is a sampled layout result, not every state at every width. Plan tablet fullPage includes trailing blank canvas from the harness/capture; screenshot is retained without image editing.

## Comparison and corrections

Original collection source rendered separately at1366; `before-aulas-desktop.jpg` compared with candidate collection. Original live auth notebook captured as `before-signin-notebook.jpg`. No all-screens-before comparison is claimed. User-provided references remain design guidance, not test fixtures.

Visual feedback corrected the Home greeting width/type, Plan heading specificity, duplicate Wizard title and empty legacy auth folder lips. Final capture/review/build followed these edits. All original image assets and original composition remain; no generated replacement images.

## Evidence limitations and intermediate states

Early snapshots can precede hydration and show loading/default fixture roles. `profile-loading-mobile.jpg`, `files-mobile.jpg`, `recovery-mobile.jpg` and short initial `.txt` snapshots are historical intermediate evidence; use the `ready` captures for accepted states. `wizard-desktop.jpg` predates removal of the duplicate heading. Some non-ready Home screenshots catch entry opacity animation. No intermediate screenshot is reclassified as a ready pass.

Mobile recovery/reset reported one zero-naturalWidth image in the raw metric: the responsive-hidden lazy security illustration. Desktop ready inspection confirmed `/foxmind-3d/scenes/security.webp` loaded at576px natural width. No visible missing-image placeholder was observed.

Browser logs retain earlier hooks errors with canonical dependency paths from the stopped stale-cache runtime (last inspected error03:41:10UTC); subsequent ready navigation/captures rendered successfully. This is not a clean-console claim for the whole session. The fixture's Files auth mismatch was repaired without changing actual auth/no-referrer policy.

No live native200%zoom, reduced-motion emulation, Safari/physical-device, full assistive-technology, LCP/INP or comprehensive contrast audit was performed. Reviewers inspected reduced-motion rules and computed key declared color contrasts. 320px reflow is not labeled native zoom. Full backend account/auth, provider, autosave/submission, retained data and private file upload/scan remain covered only by prior work, not newly certified here.

## Checks and disposition

Final production `npm run web:build` exit0 after all product deltas; focused46PASS/0FAIL/2historical opt-inSKIP and harness strict typesPASS. Blind dual review plus bounded delta review both0findings. Presentation accepted for local delivery; no known blocking visual regression remains from these changes. Local preview stays on53181 with synthetic data, while original user runtime52171 remains intact.

The saved final-build.txt preserves build text with trailing whitespace and blank EOF normalized for Git; the original output remains in ignored .test-artifacts/platform-polish-final-build.log. No result or diagnostic was removed.
