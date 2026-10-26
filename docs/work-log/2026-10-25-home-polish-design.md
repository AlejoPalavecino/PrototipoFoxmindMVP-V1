# Inicio polish — implementation contract ready

- Agent / role: /root/home_polish_design / architect.
- Session or task ID: /root/home_polish_design.
- Date: 2026-10-25.
- Branch / worktree: main / canonical shared checkout.
- Starting commit: 27233bab657683a00782f304000652619acce50c; initial working tree clean.
- Phase/spec: bounded D9 presentation refinement; [Home contract](../../odd/tasks/foxmind-3d-migration.md), [roadmap](../implementation-roadmap.md).
- Status: completed (design only; implementation and visual acceptance pending).

## Request and scope

Approved teacher/student mockups and actual no-membership capture fix the direction. User authorized local main/HMR. Preserve account, seven module contracts, real data, targets, pagination, retries and original ZorroH. No backend/schema/permission changes, fake search, production fixtures, remote publication or runtime restart.

## ESTADO_DISENO: LISTO_PARA_TDD_RED

No critical decision remains. Data/idempotency: read-only presentation; states: existing ready/error/not-applicable and loading; failures: preserve retry and global failure; concurrency: useHome generations/identity guards unchanged; permissions: server projection unchanged; GRASP: pure presentation helpers and existing public barrels.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

- One worker owns source presentation listed below; test_runner alone owns tests; coordinator owns roadmap/memory/delivery. Shared main is explicitly authorized; no worktree switch. Preserve concurrent work and separate records.
- Reference priority overrides taste-skill's default dashboard bans on illustrated greetings and pastel tiles. Reuse supplied artwork and local `Fredoka Auth`; no new direction draw, font fetch or auth selector changes.
- Existing personal agenda remains usable with no classrooms, including a compact honest empty state. Applicable empty queues remain visible for active participation; none must not manufacture a role.

## CONTRATOS_Y_PLAN_POR_SLICE

1. Functional presentation gate, after meaningful RED: add `home-presentation.ts` using core barrel types. Exact signature: `shouldShowHomeModule(participation: Participation, name: HomeModuleName, page: HomeModules[HomeModuleName]): boolean`.
   Rules: not-applicable=false; error=true; populated ready=true; ready-empty + none + name!==agenda=false; other ready=true. Archived rows remain visible. Never infer participation from queue length.
2. Pure dates in the same helper: `homeGreetingDate(generatedAt: string, timeZone: string): string`; `homeAgendaDate(item: AgendaItem, timeZone: string): { weekday: string; day: string; dateTime: string }`.
   Greeting uses generatedAt in response timeZone, long Spanish weekday/day/month. Agenda all-day uses item.date as a calendar date without UTC drift; timed rows derive day/weekday from startAt in response timeZone. Keep original-zone hint and full existing details. No invented due date.
3. One worker exact ownership: `apps/classrooms-ui/{Home.tsx,HomeModule.tsx,HomeRow.tsx,HomeShortcuts.tsx,home-presentation.ts,foxmind-home.css}`; optional cohesive `HomeAgendaDate.tsx` and `foxmind-home-{shell,rows,shortcuts}.css` leaves imported from foxmind-home.css. Existing home-labels only if a date helper belongs there instead; do not duplicate helpers.
   No edits to use-home, API/core, Classrooms/ClassroomsApp, classrooms-screen, AppNavbar, auth-polish, shared tokens or their behavior. CSS can reach existing shell only via `.fm3d-theme:has(.entry-home)` and `.entry-home` selectors.
4. Frame: desktop sidebar 232px at x16; content left x260 at 1536px; right gutter 12–16px. Remove current centered 1440px Home cap. Two columns `minmax(0,1.66fr) minmax(0,1fr)` with 16px gap (reference 780+16+468=1264). Keep one responsive content edge.
5. Hero is first child of left stack, never full-width above columns; miniagenda begins at the same top edge in right stack (~y87 at reference size). Hero height ~206px; artwork right, greeting left; no opaque full-width text panel or separated image seam. Dynamic name may wrap, never clip.
6. Left: greeting, unobtrusive freshness/refresh and setup, relevant pending/review, queries/materials, shortcuts/tools. Right: agenda with actual Abrir Agenda in its header, feedback, classrooms. All modules retain existing order within their role and complete row details.
7. None: same left greeting plus one first-use/history panel with existing Create/Join; right personal agenda; show setup drafts/invitations and populated archived classrooms. Omit only ready-empty nonagenda shelves via gate. Errors stay visible and retryable. Avoid repeated onboarding CTA groups.
8. Typography/color: Fredoka Auth headings 600–700 (greeting ~48–54px, module ~28–30px, rows ~21–23px), Segoe UI body ~18px; navy #080b30, muted blue #405fc2, orange action, pale subject chips; white rounded panels on pale canvas. Scope Home and its existing nav only.
9. Rows: left imagery ~136×100px desktop, clear title/chip/details, trailing real action; compact queries and classrooms; agenda uses semantic `<time dateTime>` day tile (~84×88px), not classroom artwork. Review totals remain correctly labeled activities versus attempts. All targets unchanged.
10. Shortcuts/tools sit inside left column; teacher tools lead for a teacher, student general shortcuts lead for study. Keep real teacher room select and all existing handlers. Do not introduce global search; any future Buscar aulas is a real Mis aulas link, never a fake input.
11. At <=1023px preserve existing drawer; stack columns when either is <340px; at 390px use one column, 16px gutters, 44px targets, readable metadata and no horizontal overflow. Reduced motion and image fallback remain intact.
12. Leaves <200 lines, functions <40 lines, semantic commits <=400 changed lines; split cohesive CSS instead of compressed rules or an override pile. No CSS-only visibility gate hiding errors by accident.

## CRITERIOS_DE_TEST_DOT

- test_runner RED first for gate: none empty omitted, archived populated retained, none agenda retained, every module error retained/retry clickable, active study/teach/mixed applicable empty retained, not-applicable omitted. Existing `tests/p9-home-client.test.mjs:39` expects Material reciente for none/empty; reopen that expectation explicitly while preserving privacy/history assertions.
- Date proof: generatedAt crossing midnight in Buenos Aires; timed agenda display-zone day; all-day calendar date stable in UTC-negative and positive zones. No RED mirror tests for CSS/markup styling.
- Existing focused Home client/lifecycle/targets suites, strict web types and isolated production web build; no DB integration added because no persistence/API changes. Do not restart dev52171/API52170.
- ego(lite), own QA Space: controlled intercepted network fixtures for none/study/teach/mixed; empty active, archived/setup, partial error/retry and pagination. No real-user login or retained data creation. Inspect/capture 1536 or1440, 768,390; verify exact content/targets, header/grid alignment, fonts loaded, keyboard/focus, labels, overflow and reduced motion. Inspect other route/auth to prove scoped styles.

## Verification and handoff

Viewed all three exact clipboard images; read actual Home/widgets/hook, core/public barrels, shell/navbar/screen and local font registration; Git baseline and roadmap reconciled. Engram current_project/context/home search succeeded. Source reads had explicit missing-path/glob diagnostics, corrected with actual rg paths. Record check: 52 lines, both relative links resolve, `git diff --check` exit0; concurrent root record preserved. No implementation/runtime test executed by this design agent; only this attributed record written. No commit created. Next: test_runner observes functional RED, sole worker implements contract, then independent visual QA/review. Coordinator persists this specification under `slice/home-polish` and reconciles completion; source implementation is still pending.
