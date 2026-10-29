# Crear aula — verified reference and synthetic flow

Final result: passed, 2026-10-29. Real Wizard and shared navigation, with typed in-memory ports only. [Coordinator](../../2026-10-28-root-wizard-reference.md), [QA continuation](../../2026-10-29-wizard_qa_finish.md), [independent review](../../2026-10-29-wizard_review_finish.md).

## Reference comparison

| Step | User source | Final desktop | Final 320px |
| --- | --- | --- | --- |
| General data | [Source](step-1-reference.png) | [Desktop](step-1-desktop-final.png) | [Mobile](step-1-320-final.png) |
| Study plan | [Source](step-2-reference.png) | [Desktop](step-2-desktop-final.png) | [Mobile](step-2-320-final.png) |
| Units/topics | [Source](step-3-reference.png) | [Desktop](step-3-desktop-final.png) | [Mobile](step-3-320-final.png) |
| Final review | [Source](step-4-reference.png) | [Desktop](step-4-desktop-final.png) | [Mobile](step-4-320-final.png) |

Sources are1672×941. Desktop requested1672×941/DPR1; browser CSS height rounds to942 while screenshots preserve941 pixels. No resampling. QA opened all four full source/render pairs, four focused control comparisons and both mobile boards after fonts, images and finite animation settled. Root independently opened final desktop units/review. Mobile has no supplied reference:320/390×844 checks assess reflow and usability, not pixel matching.

[Final layout measurements](final-layout.json) contain12 states: four steps at1672/390/320px, with `scroll=client` and no clipped block labels. Desktop primary-action bottoms are915.55/888.80/928.75/921.05px. Mobile inputs remain16px/44px and buttons at least44px. Desktop unit fields32px match the compact reference. Seven existing WebP covers and branding are reused; generated ambient variants total6,614bytes.

## Behavior proof

[Compact receipts](qa-receipts.json) preserve missing/approved/pending/rejected file gates, upload/save/publication busy and error states, explicit publication retry, single-file drop, rejection of multiple drops and save-and-exit. Prior native navigation proof confirms proposal edits survive Plan→Units without applying, invalid collapsed units reopen and focus, and review edits preserve payload without requests. Keyboard footer focus is visible at320px; long names/topics remain usable. The long-label journey collected329 runtime/console events with0 errors; this is not a whole-session console assertion.

Reproduce the local fixture with `node tests/helpers/wizard-reference/harness.mjs`, then `node node_modules/next/dist/bin/next dev .test-artifacts/wizard-reference/apps/web --hostname 127.0.0.1 --port 53195`. Open `/wizard?mode=prepared` for normal preview; `mode=proposal` shows the editable suggestion state used for final captures. Other fixture modes cover errors/busy states. No production loaders, accounts, database or provider are invoked by this fixture.

## Corrections and scope

Initial READY editor identity lost unapplied edits; stable tree identity corrected it. Initial icon padding, sticky footer, desktop centering/density and mobile filename compression were corrected and recaptured. Final visual review has no P0/P1/P2 finding. Minor P3 differences remain in standard icons, supported copy and scrollbar gutter. Earlier failed measurements and attribution remain in the work records and design-QA history; intermediate images/composites are retained under ignored `.test-artifacts/wizard-reference/history/` instead of multiplying tracked proof.

The existing file-only contract requires approved PDF/DOCX. Pasted-plan text, invented file size/time, drag ordering and automatic suggestion application were not added. No authenticated backend E2E, real upload/provider/publication, physical-device/Safari, native review or deployment is claimed. Final unit/build evidence belongs to the coordinator record.
