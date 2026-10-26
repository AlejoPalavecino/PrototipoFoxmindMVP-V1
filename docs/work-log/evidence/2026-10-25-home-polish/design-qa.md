# Inicio reference matching — independent visual QA

- final result: passed
- Agent: /root/home_polish_test, test runner; persisted by /root from its returned report. Reviewer /root/home_polish_review independently inspected final source and nine captures.
- Date: 2026-10-25; main starting27233bab657683a00782f304000652619acce50c.
- Targets: exact attached [teacher](references/teacher.png) and [student](references/student.png) references. User's current-state screenshot is contextual evidence, not the target and not copied into this public test record.

## Proof boundary

QA uses actual Home, AppNavbar, application wrappers and application CSS through source junctions in an isolated Next test harness. Only HomeClient/HomeResponse and action receivers use typed synthetic fixtures. This is real rendered production-component evidence; fixture=true and authenticatedE2E=false. No real account, retained data, login, registration, classroom enrollment or API authorization test was performed. The live52171app/API52170 were neither stopped nor reconfigured.

Owned harness53271 and ego Space3 qa-home-polish produced baseline and thirteen state/viewport captures; both were closed. After the first closure, root requested a bounded teacher-order adjustment. A new owned Space4 qa-home-polish-teach-order and harness run captured only that delta and rechecked three teacher targets, then closed. Both Spaces finished once; the user's original browser and live runtime remained intact.

## Accepted visual evidence

- [Teacher final order1536](final-teach-order-1536.png): latest teacher acceptance, supersedes pre-order final-teach-1536. Tools y811.475 before materials y1260.375; first three tools visible near the viewport bottom. Hero and agenda start y86, content x260, gap16.
- [Student1920](final-study-1920.png), [mixed1536](final-mixed-1536.png), [none1536](final-none-1536.png), [archived1536](final-archived-1536.png), [partial error1536](final-error-1536.png).
- [Tablet768](final-teach-768.png), [student390](final-study-390.png), [mixed320](final-mixed-320.png), [none390](final-none-390.png), plus ready-empty teach/study/mixed in final-dimensions.json.

Approved mock and teacher render were opened together at matching1536×1024; student1920/mobile were additionally inspected. Native CDP screenshot dimensions and role/viewport metadata are preserved. Stable final sweep enabled reduced motion to avoid transient entrance-opacity frames. Thirteen fixtures have scrollWidth===clientWidth, Fredoka ready and44px Home controls (one floating-point43.9999). Other viewport states are responsive acceptance rather than fictional mobile source mocks.

No actionable P0/P1/P2 remains. P3: Spanish date capitalizes De Octubre through CSS. Original ZorroH, existing artwork and real fixture counts/content intentionally differ from the generated mock's approximate logo/data. No pixel-identical or comprehensive WCAG/performance/device claim.

## Behavior, state and build verification

RED: node --test --test-reporter=dot tests/home-polish-presentation.test.mjs observed3ENOENT failures before home-presentation existed. GREEN:4PASS for the role×seven-module visibility matrix, personal agenda, populated archived rows, recoverable errors, UTC-midnight greeting date, all-day calendar date and timed display-zone date. Added preservation check exercises all seven retry callbacks. Existing p9-home-client expectation for an empty Material reciente shelf under none was reopened; escaped identity/history/Tus aulas and privacy/role assertions stay intact.

Independent focused Home/client/lifecycle suite:15PASS. Worker broader five-file suite:22PASS/0FAIL/0SKIP; final teacher-order helper+p9 subset6PASS. These overlap and are not summed as unique tests. Strict test-harness TypeScript passed after fixing a fixture union access and explicit ES2023 target; these fixture corrections did not change product logic. Product web TypeScript passed separately. Root final isolated production Next build exit0 within180s (2.3s TypeScript,504ms compile); live .next was not overwritten.

[Interaction proof](interaction-proof.json) records fourteen checks: actual Buscar aulas→onClassrooms, create/join, agenda, recoverable retry, pagination append/return focus, exact review target, mobile drawer/Escape, three contextual teacher tools and published feedback. [Teacher delta](teacher-order-proof.json) repeats only those three targets after the final DOM reorder. [Detail proof](detail-proof.json) observes320×812, reduced motion true, animation0s, overflow0 and captured errors[]. [Readiness](readiness-proof.json) records no failed images or external API requests and explicitly fixture-only scope. No API or endpoint policy was altered to obtain this proof.

Styles are scoped to Home and its existing private shell. Auth and other product source remain untouched; independent source review found0new issues. The only new behavior is the tested omission of ready-empty nonagenda shelves for none; applicable active-role empty states, errors, populated archived rows and all existing destinations remain accessible.

## Historical failures and handoff

Baseline native capture showed full-width hero x259.93/y80/width1248.88, agenda y340.6 and Trebuchet fallback. Initial post-change sweep captured transient animation opacity/yoffset; final stable reduced-motion captures replace those transient observations. Earlier pre-order teacher image remains historical, not the final teacher-order proof. Native capture used actual browser pixels, not PDF/HTML facsimiles.

Reviewer /root/home_polish_review, read-only, inspected final diff, file/function limits, test updates and nine views including latest teacher; LGTM_SIN_HALLAZGOS,0findings. Its own checks: git diff --check PASS; no API/core/auth/env/schema changes. It did not replay runtime tests, author source, commit or write memory. Root persists this attribution and owns local delivery. Runtime sessions for all agents were unavailable for memory attribution, so no Engram write was fabricated.
