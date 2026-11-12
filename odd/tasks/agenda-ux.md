# Agenda — complete UI/UX polish
Objective: complete the authorized Agenda polish for both roles; branch `codex/agenda-complete-polish`, base `c702360a3502fdb47592416ee3c4c212d3f7277e`.
Delivery: auto-chain, verified-main slices per explicit commit/push-to-main request; no PR or deployment. Runner: Node Agenda tests, typecheck/lint, local build and Ego Lite.

## Specs

- S1: «Quiero que vayamos trabajando y puliendo cada una de las pantallas, flujos, UI y UX para que los usuarios sientan una app web solida, rápida, funcional e intuitiva.»
- S2: «Dale vamos con agenda»; «Tengo configurado ego lite tambien para ocupar para inspeccionar quizas de mejor manera la UI/UX»; «Levantalo e interactua vos mismo».
- S3: «Bien resolve todo lo que hayas encontrado sobre agenda, mejora la UI y UX tanto para el docente y el alumno, verifica que ambos el mismo diseño.»
- S4: «Para la UI dale un plus a sus colores, formas de motras la información, animaciónes, etc.»
- S5: «Cuando termines con agenda, realiza los commits y pushea a main todo.»

## Tasks

- TASK-001 | historical daily selection/navigation | DONE | route: previous coordinator | evidence: 59 tests and Ego Lite recorded in docs/verification/agenda-ux.json; published b942b7ba387e707c09b1fada0c95e0fb7d929ef7.
- TASK-002 | historical balanced form | DONE | route: previous coordinator | evidence: previously approved flow; subsequent tablet finding explicitly remains in TASK-006; commit b942b7ba387e707c09b1fada0c95e0fb7d929ef7.
- TASK-003 | historical verification/documentation | DONE | route: previous coordinator | evidence: historical local checks, not current-candidate acceptance; commit b942b7ba387e707c09b1fada0c95e0fb7d929ef7.
- TASK-004 | historical compact daily cards | DONE | route: previous coordinator | evidence: 16 tests and earlier screenshots; commit b942b7ba387e707c09b1fada0c95e0fb7d929ef7.
- TASK-005 | S3-S4 | DONE | route: bounded design writer (context backstop) | evidence: system sync, 3 self-contained artboards, manifest/token/contrast checks PASS; chosen 01-calm-focus.html; commit: pending design slices.
- TASK-006 | S1-S4 | IN_PROGRESS | route: bounded implementation writer (context backstop) | outcome: all corroborated Agenda findings corrected and both roles share visual components; include prior monthly fix and regression checks; commit: pending.
- TASK-007 | S2-S4 | PENDING | route: bounded browser verification (context backstop), coordinator reconciles | outcome: compare real synthetic teacher/student flows, desktop/mobile, motion, focus and layout; commit: pending.
- TASK-008 | S5 | PENDING | route: coordinator | outcome: final docs/evidence, reviewable work-unit commits, integrate and push main, verify remote; commit: pending.

## Log

L1 — Original request: «Quiero que vayamos trabajando y puliendo cada una de las pantallas, flujos, UI y UX para que los usuarios sientan una app web solida, rápida, funcional e intuitiva.»

L2 — Human selected Agenda, browser and startup: «Dale vamos con agenda»; «Tengo configurado ego lite tambien para ocupar para inspeccionar quizas de mejor manera la UI/UX»; «Levantalo e interactua vos mismo». Later explicit permission to reclaim Ego Lite space 5: «Si te autorizo».

L3 — Current request, verbatim: «Bien resolve todo lo que hayas encontrado sobre agenda, mejora la UI y UX tanto para el docente y el alumno, verifica que ambos el mismo diseño. Para la UI dale un plus a sus colores, formas de motras la información, animaciónes, etc. Cuando termines con agenda, realiza los commits y pushea a main todo.»

L4 — Previous task document reconciliation: original TASK-001–004 accepted daily selection with desktop side panel/mobile sheet, stable selected date across Month/Week/Day, six monthly rows, approved compact cards, and explicit create/edit with current validation/repetition. Earlier approvals «Si apruebo» and «Si me gusta» supported that completed work, not new permissions. Subsequent publication authorized historical commit b942b7b; six visual findings were retained in docs/work-log/2026-11-12-root-agenda-publication.md. Their DONE entries are preserved as historical evidence, not a claim of exhaustive quality. No parser exists at the formerly cited scripts/taskboard.py in this checkout; do not fabricate a taskboard result.

L5 — Verified monthly correction already present, uncommitted: 86px desktop/64px mobile cells match all six rows, mobile 8px event points visible. 23 tests, build, docs and five-width real DOM checks PASS; exact evidence and failures in docs/work-log/2026-11-12-root-agenda-month-polish.md. Screenshot capture failed once without retry. No native review verdict; ASSESS failed on untracked-scope declaration. Preserve this correction and include it in the authorized delivery.

L6 — Exploration by gentle-ai-explore task mwdz88vh-4-ks5d mapped remaining tablet action imbalance, compact weekly heading/capitalization, possible historical Day nested-card/minheight issue (not yet corroborated), and detail actions/long-title pressure. Agenda uses one visual composition across roles; authenticated parity remains to verify. Do not infer a current bug from historical screenshots: reproduce and either fix or record not reproduced. Current scope is Agenda-only presentation, existing event operations, no new product capability, permissions, providers, retained-data changes or dependency changes. Gemini local runtime remains configured; no generation authorized or needed.

L7 — Large classification: this full visual iteration, two-role evidence and separate publication slices need durable recovery beyond original prompt plus diff. Context backstop requires bounded units, not delegation by file count. Forecast: production/test/doc polish about 250–350 authored lines plus standalone design-source sync/artboards; passive design artifacts get their own reviewable slice rather than a giant mixed implementation. Strategy auto-chain with verified main as requested destination; no PR creation. Keep a running count and exact commit evidence. Existing uncommitted files all attributed to this Agenda session. Default remote ref origin/HEAD resolves to origin/main; branch created before implementation. No source writes for the new scope yet.

L8 — TASK-005 completed by writer mwdzcx8h-5-qqco: design/system.md and system.html synced from actual brand/component sources; 3 static directions under design/agenda-polish/; 23 named design tokens and 22 color values. Structural/manifest/token checks PASS; calculated contrast ink >=11.92:1, muted >=5.14:1, white/orange5.25:1. Not browser acceptance or role verification. Canvas opened; coordinator chose 01-calm-focus.html as the low-risk extension, 02/03 remain alternatives. gentle_design implement returned production handoff; TASK-006 now implements that artboard while retaining real modal contracts and full event fields. Initial native ASSESS remains unavailable on untracked scope; no review verdict claimed. Design artifacts total600 lines and will be split into source-reference and artboard commits. Remote fetch confirmed main equal to baseline (0/0 ahead/behind).
