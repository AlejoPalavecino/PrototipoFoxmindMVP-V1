# Folder tab silhouette — design ready

- Agent / role: architect, `/root/tab_shape_design`.
- Session or task ID: `/root/tab_shape_design`; independent session ID unavailable.
- Date: 2026-10-23, America/Buenos_Aires.
- Branch / worktree: `codex/folder-tab-fidelity`, `C:/Users/alejo/.codex/worktrees/foxmind-folders-implementation/ProtipoFoxMind`.
- Starting commit: `ed06f885bfbf08725024013a7a45c9a3a723cfc7`.
- Phase / task: bounded visual correction to the accepted folder theme; [coordinator scope](2026-10-23-root-folder-tabs.md), [theme](../folder-theme.md), [roadmap](../implementation-roadmap.md).
- Status: completed, design task only; implementation and visual acceptance remain pending.

ESTADO_DISENO: LISTO_PARA_TDD_RED

The existing HTML and shared CSS are sufficient. Correct the silhouette once, preserve contextual colors and real headings/buttons, and verify the actual rendered result. The state above means DoR is satisfied; a cosmetic change does not require a synthetic CSS-declaration test or a backend test cycle.

## Request and inspected evidence

The coordinator requested every folder tab to follow the supplied crop: thin continuous dark outline, a small rounded shoulder on the left, a raised flat top and an inclined right edge meeting the panel. Preserve content, navigation, semantic markup, selectable text and mobile width 320px. Use native interface geometry, with no rasterized component, new dependency or new domain/API contract.

Inspected the supplied `codex-clipboard-284c7450-1a5e-424a-8e97-e591261277a2.png` through `view_image`, the three shared folder stylesheets, design tokens, relevant functional-spec section 13, the theme guide, roadmap, work-record protocol and coordinator record. The crop is a visual reference, not runtime acceptance evidence.

At initial inspection the checkout was still `main` at the starting commit; before this record it was observed on `codex/folder-tab-fidelity`. The coordinator record was the sole observed untracked file. No previous changes were reverted or staged.

## Scope and selectors

| Surface | Shared contract / existing placement |
|---|---|
| All folder headings | `.folder-tab` in [folders-shell.css](../../apps/shared-ui/folders-shell.css), including direct and nested headings; `.folder-panel` owns the white panel and outline |
| Sign-in, registration, verification and recovery | `.entry-page .surface > .folder-tab`, including the existing 900px and 700px placement overrides in [folders-account.css](../../apps/shared-ui/folders-account.css) |
| Profile | `.entry-profile .profile-details > .folder-tab`, `.entry-profile .password-section > .folder-tab` |
| Inicio, Mis Aulas, pending/news | `.p5-app .folder-tab`, `.p5-classroom-group.folder-panel > .folder-tab`, `.folder-pending > .folder-tab`, `.p9-home-news > .folder-tab` in [folders-academic.css](../../apps/shared-ui/folders-academic.css) |
| Wizard and classroom section heading | `.p5-surface.folder-panel > .folder-tab`, `.p5-surface.folder-panel > .p5-section-head .folder-tab`; these share the same geometry despite different nesting |
| Related classroom navigation tabs | `.p5-main .p5-tabs button`, active `[aria-current='page']` and `.tone-mint` variants: reconcile their selected mockups, preserve separate hit areas and horizontal scrolling |
| Global navigation | `.fm-nav-links a`, including active/hover/focus states; retain current routes, hit areas and responsive mobile-menu replacement |

The coordinator confirmed that the selected 24 mockups also show inclined ends on both global and classroom navigation tabs. Include those selectors in the same visual correction while retaining their distinct bar layout. No route, label or new navigation action follows from this geometry correction.

## Decision and reversible assumptions

| Decision | Options / reliability | Recommendation |
|---|---|---|
| D1: outline construction | A: compose multiple skewed/clipped CSS pieces, with extra joins to align. B: native SVG outline painted as a three-section or nine-slice frame, preserving fixed-width left/right caps and stretching the flat center. | B for the exact asymmetric shoulder and diagonal: one coherent outline is easier to keep continuous than several overlapping borders. CSS pseudo-element caps remain acceptable if live comparison proves their joins. |
| D2: source of truth | A: per-screen shapes. B: one shared shape and contextual placement variables. | B in shared CSS; retain existing yellow/mint/coral tones and adjust only necessary context offsets. |
| D3: proof | A: tests asserting CSS text. B: actual screenshots and navigation/focus/reflow checks. | B; a declaration assertion cannot establish continuous borders, clipping or reference fidelity. |

No critical business decision is open. Minor reversible assumptions: retain the existing type/icon scale; adapt the reference to long labels rather than truncating them; maintain current palette rather than extracting new colors from the crop. The coordinator selected a native frame with left/right caps 32px, source height 58px and source stroke 2, with an extensible center. Verify its rendered outline at the panel join against the current thin panel border.

### Six-dimension DoR audit

- Data / idempotency: no inputs, payloads, persistence or duplicate-operation behavior changes.
- State: preserve active/hover/focus/disabled presentation and existing `aria-current`; decoration adds no state.
- Failure: text must remain readable if decoration is unavailable, and wrapping must not expose a gap at the panel join.
- Concurrency: coordinator alone edits shared CSS; this architect owns only this work record.
- Permissions: existing links, handlers, roles and hidden/visible UI rules remain unchanged.
- GRASP: one presentation concern in the existing shared UI layer, consumed through `folders.css`; no new domain entity, port, service or API schema.

## Minimal implementation contract and slice plan

1. In `folders-shell.css`, replace the rounded-rectangle treatment for `.folder-tab` with one responsive decorative frame. Keep the real text/icon elements and their order. A pseudo-element carrying `border-image` is suitable: fixed-width SVG caps contain the shoulder/diagonal; the flat middle stretches. Use the coordinator-selected 32px caps / 58px source height / stroke 2 as the starting geometry, with transparent exterior and a clean open join to the panel. Reserve enough inline padding to keep text/icons away from the caps. Decorative layers use `pointer-events: none` and cannot cover focus rings.
2. Keep geometry separate from placement and tone. Suggested internal CSS properties are `--folder-tab-frame`, `--folder-tab-fill`, `--folder-tab-left-cap` and `--folder-tab-right-cap`; these are implementation details, not an exported product contract. SVG data/file images do not inherit the host's CSS custom properties or `currentColor`: encode the existing tone colors explicitly in frame variants, or apply color through a separately matching native mask. Do not assume host variables resolve inside a data-URI SVG.
3. Retain a readable normal CSS border/background fallback. Use existing broadly supported CSS/SVG capabilities; no dependency on `shape()`, `corner-shape`, anchor positioning or another new API. Under forced colors, a simple system-color border is acceptable if the colored SVG frame is suppressed. The fallback may be simpler than the intended silhouette but must preserve text and controls.
4. Reconcile account/profile/academic offsets only after rendering the shared silhouette. Its lower outline and the front panel must meet without a gap, short vertical stub or doubled line. Ensure the direct-child and nested `.p5-section-head` heading both meet their panel. Do not clip the panel overflow just to hide a faulty join.
5. Include `.p5-tabs button` and `.fm-nav-links a` in this same correction, sharing geometric values while retaining their distinct navigation layouts, active colors and scroll/mobile-menu behavior. A selected navigation button must remain visibly selected and keyboard reachable after horizontal scroll.

Expected production edit surface: the three shared CSS files, optionally a small native SVG frame asset if an external source is clearer than a CSS data URI. No TSX or backend change should be necessary. Keep the change within one unit of at most 400 changed lines; an asset is geometry only, without embedded text, scripts or external resources. No blanket refactor to split pre-existing files is justified by this correction.

## Team strategy and handoff

The coordinator owns the implementation in the current isolated worktree and the shared roadmap. Other agents must not edit the shared styles concurrently. This architect owns only this record. A verifier may use a separate record and inspect the stable candidate without changing the CSS. No contract micro-PR, migration, extra worktree or stacked PR is needed for this bounded presentation change.

First unfinished action: implement the shared silhouette, then reconcile its placements and prove representative rendered account/profile/home/classroom/wizard contexts before local commit. Native review/publication consent remains coordinator-owned. This record grants no push, PR, deployment or retained-data operation.

## CRITERIOS_DE_TEST_DOT

Use `ego(lite)` in a dedicated task Space. Compare screenshot crops against the supplied crop, retaining a full viewport capture for context. Fresh visual evidence must belong to the actual candidate; historical folder verification is not proof for this change.

| Coverage | Observable acceptance |
|---|---|
| Registration desktop | Left shoulder, flat top, rounded top transitions and right diagonal visibly match the crop's shape; thin outline is continuous at the panel join, with no doubled line, spike or colored leak |
| Profile desktop/mobile | Yellow Datos personales and mint Seguridad both use the same silhouette; original labels/icons and fields remain readable |
| Inicio / Mis Aulas | Enseño, Estudio, Pendientes and Novedades all inherit the geometry; mint/coral/yellow remain contextual |
| Classroom and wizard | Both direct and nested section headers align with their panel; long headings such as activity/result titles and Revisá tu aula remain readable without touching a cap |
| Widths 320, 390 and representative desktop | No document horizontal overflow from tab decoration, no clipped text/icon, and no tab exceeding its panel; long labels wrap with an intact outline rather than being cut off |
| Desktop 200% zoom / larger text | Text remains selectable and readable; caps and panel join remain coherent at the reflowed size |
| Native interactions | Tab through navigation and one account form; focus remains visible, button/link hit areas work, active classroom state updates and narrow classroom tabs still scroll horizontally |
| Global navigation | Inclined tab ends are visible at desktop; active/hover/focus treatments remain correct, links reach their existing destinations and the compact mobile-menu alternative remains usable |
| Forced colors / fallback | Heading content and outline remain discernible, and focus is retained if the SVG frame is suppressed |

Run proportionate existing build/style/type checks for the actual edited surface and `git diff --check`. Backend unit/integration Docker `_test` suites are not required for an unchanged CSS-only behavior boundary. Do not add CSS-source-string tests or manufacture backend RED for this cosmetic change.

## Observed verification and outcome

Observed read-only commands succeeded: `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, targeted `rg -n` selectors/consumers, and file reads. Starting HEAD and the current branch were reconciled as recorded above. Reference pixels were actually inspected with `view_image`. This task changed only its own design record.

Documentation structural verification: a PowerShell check of every local Markdown link and the required task/status/DoT fields passed (exit 0). `git diff --no-index --check -- NUL docs/work-log/2026-10-23-tab-shape-design.md` returned 1 for the new-file comparison and emitted only the repository's LF-to-CRLF advisory, with no whitespace-error report. A separate whitespace/conflict-marker check passed (exit 0). No application build, runtime browser verification or implementation acceptance was performed by this architect. Those checks remain pending for the coordinator/verifier. The coordinator reported its current ego capture timed out; that is an unavailable runtime check, not a pass or a design blocker. No commit, remote operation or memory write was made by this task.
