# Education experience QA — 2026-10-28

See the [coordinator record](../../2026-10-28-root-education-experience.md) for authorization, runtime, failures and limitations. Actual account content shown here is synthetic demo content; credentials are excluded. Original application graphics were reused unchanged. Evidence captures are WebP.

## Selected captures

- [Desktop Inicio](home-desktop.webp) and [mobile Inicio](home-mobile.webp): final actual authenticated account.
- [Desktop Agenda](agenda-desktop.webp): one upcoming deadline initially visible; disclosure reveals the remaining two.
- [Guided generation](generation-desktop.webp): initial step; document height 1227px, previously 2601px for the full form.
- [Styled native picker](select-picker.webp): Chromium progressive enhancement; Escape closes it. Intermediate viewport capture, not final page geometry.
- [Focused mobile correction](grading-mobile.webp): history hidden, heading focused, original grade unchanged.
- [Teacher tabs overview](teacher-tabs.webp): all eight tabs of the actual Math classroom; initial viewport only, not full-page coverage.
- [AI waiting states](ai-states-fixture.webp): final actual components with synthetic RUNNING/QUEUED states, explicitly labelled and no requests. Not evidence of successful real generation.

## Measurements and actual journeys

[Route metrics](route-metrics.json): five real routes at 320/768/1440px. [Tab metrics](tab-metrics.json): eight teacher tabs at 320/390/1440px. Document scroll width never exceeded viewport width. The route matrix preceded final Agenda disclosure; final observed Agenda height at 1440×1000 is 1026px, replacing its earlier 1470px measurement. Final Home is 1000px at 1440×1000 and 1810px at 390×844. Content remains scrollable where necessary; no content-height clipping.

Actual controls exercised: styled select and Escape; topic choice; AI step next/back preserving state; explicit generation; teacher preview, received-attempt list and grading entry/return; student consultation without starting an attempt; event form without saving; upcoming disclosure. No original event, submission, activity or grade was edited. Two recent failed generation jobs remain: PDF input limit and context-only insufficient information. No third paid retry or successful provider/application claim.

## Reproduce verification

Use the authorized admitted runtime described in the coordinator; do not recreate retained data or print private configuration. Actual browser URL: `http://127.0.0.1:52171/inicio`. Diagnostic scripts/captures are in `.test-artifacts/education-experience-20261028/`. Ego TaskSpace15 used the current production components against the actual account; only the labelled waiting-state fixture used port53191.

Broad command (103 PASS, 0 FAIL, 2 historical optional SKIP; Agenda test was subsequently moved unchanged into education-agenda):

```powershell
node --experimental-transform-types --test --test-reporter=spec tests/education-experience.test.mjs tests/workspace-disclosure.test.mjs tests/home-polish-presentation.test.mjs tests/home-refinement-copy.test.mjs tests/home-miniagenda-reference.test.mjs tests/agenda-polish-presentation.test.mjs tests/foxmind-3d-flows.test.mjs tests/foxmind-3d-flows-collection.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/foxmind-3d-flows-plan.test.mjs tests/foxmind-3d-flows-attempt.test.mjs tests/foxmind-3d-regressions.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-autosave.test.mjs tests/p7-authoring-client.test.mjs tests/p3-web-client.test.mjs tests/agenda-ui.test.mjs tests/activity-ai-ui.test.mjs tests/activity-ai-polling.test.mjs tests/activity-unknown-start.test.mjs tests/activity-review-regressions.test.mjs tests/p8-grading-client.test.mjs tests/p7-history-client.test.mjs
```

The final split-file command `node --test --test-reporter=dot tests/education-agenda.test.mjs tests/education-experience.test.mjs` passed all seven checks. For future broad runs include both education files. Earlier loader/traversal failures are documented in the coordinator. Strict TypeScript, final production build, PostCSS parsing and staged Gitleaks checks passed. No configured lint/boundary checker; no native/independent review or Safari/physical-device/full accessibility acceptance claim.
