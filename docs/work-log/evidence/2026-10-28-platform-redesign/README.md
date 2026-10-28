# Platform redesign QA — 2026-10-28

Sole-agent implementation and observed component-fixture proof. All displayed names/content are synthetic. Source assets are reused unchanged. This is not authenticated end-to-end acceptance.

## Selected captures

- [Desktop Inicio](home-desktop.png), [mobile Inicio](home-mobile.png), [tablet Inicio](home-tablet.png).
- [Desktop classroom](classroom-desktop.png), [mobile student classroom](classroom-mobile.png).
- [Mobile registration](register-mobile.png), [mobile recovery](recovery-mobile.png), [wizard review](wizard-mobile.png).
- [Desktop scenario overview](overview-desktop.png), [mobile scenario overview](overview-mobile.png), [classroom tabs overview](overview-tabs.png).

Overview contact sheets cover intermediate matrix captures; standalone registration/recovery/tablet/wizard captures supersede their earlier sizing. All seven non-Plan tabs were visited; Plan was the initial view. Mobile tab overflow is deliberate local horizontal navigation, not document overflow.

## Observed coverage

| Surface | Scenarios / interaction |
|---|---|
| Inicio | Mixed, first use, recoverable error, loading; primary actions and resource disclosure |
| Mis aulas | Populated, empty, membership filter, unmatched search, Join dialog |
| Classroom | Teacher, student, archived; all tabs; shared topic selection, collapsed management |
| Academic work | Activity authoring/generation and questionnaire attempt layouts; no provider/submission writes |
| Agenda | Populated/empty month, mobile event form; save persistence not claimed |
| Wizard | All four steps with synthetic approved plan; missing-file validation; no publication |
| Account/files | Login, registration, profile, settings, recovery, verification, token recovery, private-file layout |

34 matrix observations (17 scenarios × 320/1440px) and 7 tablet observations (768px) had document width equal to viewport. 390/1366px were inspected additionally. Structural geometry does not certify every nested item or accessibility requirement. Screenshots were inspected, including the contact sheets; no physical device, Safari, native zoom or Core Web Vitals claim.

## Reproduce

Run `node tests/helpers/platform-polish/harness.mjs . platform-redesign-preview`, then `node node_modules/next/dist/bin/next dev .test-artifacts/platform-redesign-preview/apps/web --webpack --hostname 127.0.0.1 --port 53191`. Preview routes include `/inicio?mode=mixed`, `/mis-aulas`, `/classroom?mode=student`, `/agenda`, `/wizard?mode=prepared`, `/sign-in`, `/register`, `/profile` and `/settings`. Runtime uses synthetic fixtures and disables real publication/uploads/providers. It is not the production server.

Focused command (observed 69 PASS / 0 FAIL / 2 optional SKIP):

```powershell
node --test --test-reporter=spec tests/workspace-disclosure.test.mjs tests/home-polish-presentation.test.mjs tests/home-refinement-copy.test.mjs tests/home-miniagenda-reference.test.mjs tests/agenda-polish-presentation.test.mjs tests/foxmind-3d-flows.test.mjs tests/foxmind-3d-flows-collection.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/foxmind-3d-flows-plan.test.mjs tests/foxmind-3d-flows-attempt.test.mjs tests/foxmind-3d-regressions.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-autosave.test.mjs tests/p7-authoring-client.test.mjs tests/p3-web-client.test.mjs tests/agenda-ui.test.mjs
```

Typecheck, final production web build and whitespace checks passed. Repository has no configured lint command/boundary checker. New disclosures and mobile selection have meaningful regression checks. Account-navigation cooldown and actual token-document opt-in tests remain SKIP; no fabricated success. See the [coordinator record](../../2026-10-28-root-platform-redesign.md) for failures, attribution and handoff.
