# Inicio reference design — ready for test-first implementation

- Agent / role: architect (design only)
- Session or task ID: `/root/architect`
- Date: 2026-10-28
- Branch / worktree: `codex/inicio-reference-astra`; `C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind`
- Starting commit: `9fa596c37774353390835eb41c7cb2f8d480644a`
- Phase and detailed task/spec links: existing Home presentation; [Home](../p9-home.md), [functional specification](../foxmind-v1-functional-spec.md), [roadmap](../implementation-roadmap.md)
- Status: completed

## Request and scope

Define a bounded presentation contract for Inicio, faithful to the supplied warm illustrated reference, using the existing application and real authorized Home aggregate. Coordinator reports current authorization for an isolated worktree and implementation. No product edits, new API/DB, publication, retained-data access or whole-phase closure are assigned to this agent.

## Work performed

Read AGENTS.md, work-record protocol, relevant roadmap checkpoints, Home documentation, navigation/role/progress specification, Home components/presentation, shared UI barrel and existing Home styles, domain barrel and Home types, the applicable Home module rules in `odd/tasks/foxmind-3d-migration.md`, and platform-polish/home-polish harnesses. Inspected the supplied 1784x882 image through view_image. Actual Git HEAD matches the supplied base; the coordinator's separate untracked work record is preserved.

## Design contract

`ESTADO_DISENO: LISTO_PARA_TDD_RED`. L2: one bounded Home presentation slice; no API, domain, database or permission changes. Existing TypeScript/React stack and HomeResponse v1 remain authoritative.

### Reference translation

The reference is a warm cream canvas, strong orange primary actions, dark readable typography, restrained mint/yellow/blue shortcut surfaces, illustrated hero, wide classroom cover cards, compact work summaries and a quieter right rail. At reference size the hero is approximately 245px tall, the central/aside areas are approximately 1090/407px, and major gaps are 16–26px. Use these as proportional visual targets, not viewport minimums.

1. Hero first: live display name, short welcome eyebrow, existing truthful description and `Ir a mis aulas` callback. Use the coordinator's new WebP scene, with real text over a quiet left region and fox illustration right. Keep meaningful content and action readable at narrow widths; illustration is decorative. The generatedAt date may remain visually quiet; no fake name or notification count.
2. Four compact visible quick links immediately below: `Mis aulas`, `Crear aula`, `Mi Agenda`, `Unirme con código`. These use the existing callbacks, with busy disabling on mutation-entry actions. Do not label a classroom creation shortcut as AI generation, or material navigation as personal folders. Existing teacher tools remain in a separate disclosure below the teaching summary, with explicit active teacher classroom selection and existing create/upload/notice callbacks.
3. `Tus aulas` follows: horizontal illustrated cards using the existing covers. Up to three columns on wide screens, two at intermediate widths, one on small screens. Render all authorized rows returned by the current page (normally up to five); three columns must not silently mean truncating to three rooms. Keep `Estudio`/`Enseño` labels/group distinctions and archived read-only text; no global role switch. The server's count and `nextCursor` remain authoritative. Existing `Ver todas` opens the matching HomeModulePanel, retaining module context and focus restoration, rather than changing into generic navigation.
4. Beneath classrooms, a responsive pair of semantic areas: `Mi aprendizaje` contains pending and feedback; `Mi actividad docente` contains review and queries. Keep each child module's heading, exact items, targets, pagination and recoverable errors. A wrapper is rendered when any child is rendered; do not hide error states merely because participation is none. Materials remains reachable in an explicit lower `Recursos y herramientas` disclosure, automatically open for an error as before. All seven module names remain supported.
5. Right rail: agenda at top, truthful activity summary beneath, short Foxy encouragement card last. Agenda keeps up to three real returned items, date tiles, time, source, original/display timezone, 90-day window and existing navigation callbacks. Do not force two items to imitate the screenshot. Foxy card may contain static general study advice; no fabricated personal achievement or nonfunctional advice button.
6. The screenshot's percent ring, classroom percentage bars, delivered count and achievements have no support in HomeResponse. Use `Tu actividad` with exact applicable available counts: study/teach memberships, pending.totalItems as `actividades por entregar`, feedback.totalItems as `devoluciones disponibles`, and review.totals.needsReview as `entregas por revisar` where applicable. Never treat feedback as all delivered work or review.totalItems as submission count. No percentage, progressbar or numeric zero is synthesized from null/error/not-applicable. For unavailable summaries show an honest short unavailable state and retain the owning module retry; an entirely empty summary may show `Tu actividad aparecerá aquí`.
7. Coordinator confirmed that the latest human reference request authorizes the sidebar for Inicio and supersedes the historical top-bar visual requirement on this screen. Reuse existing AppNavbar and actual destinations/controls, with styling scoped to `.entry-home`; inspect existing sidebar CSS before adding rules. Aim for the reference's approximately 225px sidebar and 64px upper strip at wide sizes, preserving the current compact drawer at narrow sizes. Do not introduce fake global search, Mensajes, Mi progreso, Foxy IA, roles or badge counts. A top strip may use an honest `Ver mis aulas` action instead of a nonfunctional search. Other screens keep their existing shell presentation.

### Preserved behavior and architecture

- HomeResponse and HomeTarget are consumed through `src/core/domain/index.ts`; shared visuals through `apps/shared-ui/index.ts`. No domain copy, fetch from a new endpoint, hook rewrite or contract expansion.
- Presentation-only grouping/summary helpers may live in `home-presentation.ts`; visual subcomponents can be extracted for cohesion. Current `useHome`, identity invalidation, stale-response protection, permission revalidation, refresh, retries, closed reception CTA and panel cursor logic remain intact.
- Loading, aggregate failure, partial module failure, no memberships, archived-only, study, teach and mixed variants retain truthful content. Render escaped user strings, long names, all-day dates and original timezone accurately.
- CSS selectors are Home-scoped, preferably beneath a new `.fm-home--reference` class. Avoid global token/button changes or whole-file reformatting. Existing AppNavbar, Agenda, account and classroom screens must not acquire Home overrides.
- Completion, published grades and teaching-plan progress are separate domain metrics. None is derivable from counts of currently loaded Home rows.

### Exact summary helper contract for RED

Export `homeActivityStats(data: HomeResponse): HomeActivityStat[]` and `HomeActivityStat` from `apps/classrooms-ui/home-presentation.ts`. A stat has `{ key: 'study' | 'teach' | 'pending' | 'feedback' | 'review'; label: string; value: number }`. Return deterministic order: positive study memberships (`Aulas donde estudias`), positive teach memberships (`Aulas donde enseñas`), ready pending with non-null totalItems (`Actividades por entregar`), ready feedback with non-null totalItems (`Devoluciones disponibles`), ready review with totals (`Entregas por revisar`, value totals.needsReview). Exact ready zero is allowed; missing/error/not-applicable/null totals are omitted. Do not derive a stat from items.length, review.totalItems or grade values. Empty output drives a neutral empty card. This helper is a presentation projection, not a new domain metric. `HomeActivitySummary` accepts `{data: HomeResponse}` only; no invented navigation callback is required.

### Ownership

| Owner | Exclusive edit surface |
|---|---|
| UI slice worker | `apps/classrooms-ui/Home.tsx`, `HomeShortcuts.tsx`, `HomeModule.tsx`, `HomeRow.tsx`, `HomeCover.tsx`, `home-presentation.ts`; new `HomeActivitySummary.tsx` and optional `HomeLearningGroups.tsx`; scoped styling in `apps/shared-ui/sky-home.css` and only Home/`.entry-home` selector adjustments in `workspace-home.css` / `warm-polish.css` if cascade cleanup is necessary; own work record. Coordinate another shell CSS leaf with coordinator before edit if necessary. |
| test_runner | New `tests/home-reference-behavior.test.mjs`; necessary focused assertions in existing Home tests; test-only fixtures/harness under `tests/helpers/home-polish/` and `tests/helpers/platform-polish/`; own QA evidence and work record. Do not edit product code. |
| Coordinator | Generated hero WebP assets and required catalog registration in `apps/shared-ui/raster-catalog.ts`; shared roadmap, final docs and Git. Confirmed assets are `inicio-reference-1600.webp`, `inicio-reference-960.webp`, `inicio-reference-480.webp` with natural 3:1 scene ratio; catalog key to confirm with worker. Preserve fox ears and scene composition instead of applying a blind cover crop. |
| Architect | This design/work record only. No product, test, shared roadmap or asset edits. |

Agents are concurrent: do not revert others' edits, and coordinate any file ownership extension before writing. A single worker owns the Home product slice; split CSS/TSX only if exact ownership is agreed. CSS leaf reuse avoids introducing another global import solely for this task.

## DoT and DoD for implementation

Meaningful RED tests target the new behavior, not CSS literal snapshots:

1. Four visible quick links dispatch the correct existing callbacks once; busy behavior persists. Teacher tool targets contain the chosen active teacher classroom id, and no tool is enabled for archived/student rooms. A teacher not present in the current page gets the existing contextual Mis aulas fallback, not a false absence claim.
2. Summary counts use exact aggregate totals even when the visible page contains fewer items; null/error/not-applicable never become zero or percentages. Feedback is labeled as published feedback, review totals distinguish activities from attempts, and no completion/achievement claim is invented.
3. Every applicable pending/review/feedback/agenda/queries/materials/classrooms module remains reachable in its intended group; each error exposes a working retry, and ready-empty/archived-only/mixed variants remain truthful. Actual actions retain the exact HomeTarget. All returned classroom rows remain available; nextCursor expansion still opens/closes the matching panel and restores focus.
4. Retain existing date/all-day/timezone and closed-reception tests; do not rewrite assertions just to bless a new implementation. Copy-only changes may update literal labels only when semantic coverage remains.

Focused check set: `node --test tests/home-reference-behavior.test.mjs tests/p9-home-client.test.mjs tests/home-polish-presentation.test.mjs tests/home-refinement-copy.test.mjs tests/home-miniagenda-reference.test.mjs`, plus existing Home client/panel tests identified by test_runner. Run strict web types and production web build under the existing 180s build budget. No database fixture is necessary for this presentation-only contract; do not execute retained helpers or read credentials.

Visual QA uses ego-browser in a dedicated Space and the explicit isolated platform-polish fixture, marked test-only. Extend Home fixture to three differently illustrated rooms plus a mixed-role work queue, two/three agenda items and truthful counts; it must still support none, archived, study, teach, mixed, loading and partial-error states. Capture comparison at 1784x882 and practical desktop 1440px, plus 768/390/320px. Verify keyboard order/focus, panel return, all four callbacks, real rendered count labels, long text, no horizontal document overflow, readable hero text, 44px interactive targets and reduced motion. Desktop should visibly show hero + quick links + classroom cards and the start of learning/teaching summaries, with agenda and summary in the rail. At narrow widths collapse to one content column without clipping actions; no fixed-height cards hiding long text.

Fixture screenshots prove composition and component interactions only, not authenticated backend E2E. Compare against the supplied reference and document unavoidable semantic adaptations. Check images are local optimized WebP, load successfully, use responsive sizing and preserve meaningful text without image dependence. Reviewer audits whole diff and ownership; coordinator runs staged secret check before local commit. Native verification or publication requires its own active authorization.

## Verification

- Read-only `git status --short` and `git rev-parse HEAD` succeeded.
- Contract/source inspection only; no functional test or product implementation claimed.
- Exploratory Windows wildcard and nonexistent guessed CSS paths were unavailable; the actual `_app.tsx` imports and known Home CSS leaves were read directly. No product failure inferred.
- Relative link/expected-section checks and `git diff --check` passed (exit 0). Functional tests are intentionally not run for this design-only document.

## Commits and outcomes

No commit created by this agent. Completed output is this design contract, not implementation or phase acceptance.

## Handoff

Next: test_runner writes focused RED for the exact summary helper and preserved module/action contract, then the Home worker implements. Coordinator supplies the hero catalog key; Home-only sidebar adaptation is authorized with actual navigation reused. The existing disclosure test may update obsolete toolbar/resources ordering expectations to the new composition while retaining action assertions. No business decision or API dependency blocks the Home presentation slice.
