# Approved sign-in and registration polish — coordinator

- Agent / role: /root, orchestrator; runtime identity unavailable, no attributed memory writes.
- Date: 2026-10-25, America/Buenos_Aires.
- Branch / starting commit: main / dfe2b849fa50e876bb37df3cce1f79464a7ba58b.
- Scope: implement the two recently approved ImageGen sign-in/create-account mockups directly on current main, keeping the user's local app running for live feedback. This request authorizes local edits and commits, not new push/deployment or retained account/data changes.
- Status: in_progress.

## Reference and implementation contract

Selected visual references are exec-934a4da3-2565-4bf7-a1b9-afec7a8162eb.png (sign-in) and exec-fbc547de-c6db-4211-9b5a-612609ef1752.png (registration), in the current conversation's generated-image directory. These are two companion screens, not alternative choices. Use original ZorroH logo rather than the generated logo approximation, and existing auth WebP artwork. Preserve current auth fields, validation, sessions, cooldown, verification, next destinations and other account screens. No role selector or social sign-in. Desktop split scene/form; small screens prioritize form, maintain keyboard access and reduced motion.

## Bootstrap attribution

Read-only explorer /root/auth_polish_explorer observed clean main at dfe2b849, local listeners52171web/52170API and GET sign-in/register/readiness200. Existing other-chat local startup and test-account provisioning records were read for topology only; their prior account/data authorization is not reused. Main-local-start record is the current runtime source; do not stop/restart services or read private configuration. Explorer read Engram project/context/search but no writes; older51920preview is historical, not current. Explorer's remote tracking description was internally inconsistent; root will use actual Git refs when publishing is requested, which is outside this task. No product/data/ref mutation by explorer.

## Ownership and verification plan

Architect: bounded design/DoR record. Worker: auth presentation components/styles only after contract. Test runner: applicable existing tests and browser QA in dedicated ego Space; new tests only for meaningful behavior changes, not CSS/implementation mirrors. Root: shared documentation/commits. Reviewer: final scoped diff/accessibility/regression audit. Keep all unrelated work and current local runtime intact; build separately if needed, do not replace its development assets while it runs.

First unfinished action: finish visual contract and live baseline, then implement and compare both pages at desktop/mobile widths against the exact approved references. Completion requires observed applicable checks and an honest visual QA record, not build-only acceptance.

## Implemented and independently checked

Worker /root/auth_polish_worker implemented the scoped polished variant in account components, AccountStory, one CSS leaf and its import, with locally served Fredoka WOFF2/OFL. Existing auth scene and original SVG brand are reused. Form handlers/fields/session/next/cooldown/validation and other account views are preserved. [Architect contract and baseline diagnosis](2026-10-25-auth-polish-design.md), [worker record](2026-10-25-auth-polish-worker.md), [native visual QA](evidence/2026-10-25-auth-polish/design-qa.md) retain ownership and failed iterations.

The worker's two-strike circuit stopped and reverted its candidate on a legacy test-loader failure. Architect independently reproduced all3legacy failures on unchanged HEADdfe2b84 (1PASS/3FAIL: old navbar/Home expectations and unresolved directory import); this is baseline failure, never PASS. Exact candidate was recovered with apply/reverse checks and CSS/font/license SHA equality. No test was weakened or edited. Fresh focused test command in QA yields16PASS/0FAIL/2existing opt-inSKIP. Static TypeScript passed. New presentation did not need implementation-mirroring CSS tests or a new DB fixture.

Isolated production build copied only public source/config/package files (excluding .env/node_modules/build output) and linked existing dependencies. Final Next build exit0 within180s (7.46s command wall), with TypeScript3.8s/compile682ms and inherited multiple-lockfile-root advisory. It did not overwrite live .next. Final CSS/Story bytes were synchronized before that build. Root restored Next's generated next-env.d.ts dev-path drift to HEAD; it is not part of product delivery. No API/schema change.

Tester /root/auth_polish_test independently used ego Space2 and native captures at1536×1024/390×844/320×844, tested keyboard, local eye controls, nonmutating empty-submit alerts, next link preservation and neighboring guarded routes. Full report persisted by root because tester's role cannot author documentation. Final result passed with P3 typography/book-tip/2px vertical differences explicit; no pixel-identical, physical-device or complete-state coverage claim. Reviewer /root/auth_polish_review inspected final code, original assets/license and accepted six views, with0new product findings. Reviewer caught one mislabeled1905×867desktop-error screenshot; root renamed it and corrected its attribution rather than claiming mobile-error proof. Reviewer did not edit source or run runtime tests.

## Live development preview

The user's52171preview was production-only, with no HMR. To satisfy live-edit intent, root prepared an ignored sibling of the admitted existing launcher, changing only its Next child start→dev and child NODE_ENV→development; existing configuration/ports/API/data policies remain. Original web PID34968/parent22604 and port identity were verified; stopping only that Next child triggered the launcher's graceful API closure. Original unified session93468 was unavailable to this chat, so no fake stdin-control success was claimed. Initial dev launch67235failed web-readiness with production NODE_ENV; corrected launch15534/supervisor42496 became ready and stays running. Original key file unchanged, no DB migration/seed/restore/account mutation/provider request. No private configuration values were inspected or logged by this task. User retains the same52171URL; dedicated QA Space finished once, without closing the user's original browser Space. Runtime launcher is ignored operational state, not product source.

## Current handoff

Implementation and independent visual/source/build acceptance complete; next action is bounded local commits and structural checks. No push/deployment requested. Native evidence/approved-reference copies and [actual dimensions/hashes](evidence/2026-10-25-auth-polish/manifest.json) are saved with the project; no flattened screenshot is used as a runtime UI. Historical failed captures/experiments remain distinct from accepted-* images.

Local preparatory commit37f330f contains the30KB WOFF2, OFL and architect contract (160authored lines, plus binary). Upstream OFL had one trailing space; normalized whitespace without changing any non-whitespace license character, then rechecked the complete commit diff. No licensing terms or font bytes changed. The first local-only commit was amended before any publication to include this hygiene correction; its obsolete identity is not a delivered checkpoint.
