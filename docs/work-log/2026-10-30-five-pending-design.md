# Five historical skips — bounded executable design

- Agent / role: architect, `/root/five_pending_design`.
- Session or task ID: `/root/five_pending_design`; host Engram identity unavailable.
- Date: 2026-10-30, America/Buenos_Aires.
- Branch / worktree: `codex/audit-remediation`, `C:/Users/alejo/.codex/worktrees/foxmind-audit-remediation/ProtipoFoxMind`.
- Starting commit: `fd47adf2fe62c0435d596d3075ca699b52ce8f12`.
- Phase and task: historical omissions following [audit remediation](../../odd/tasks/audit-remediation.md), coordinated by [current record](2026-10-30-root-five-historical-checks.md).
- Status: completed for design and handoff; implementation and acceptance are pending other agents.

## Request and scope

Define an executable closure of five historical skips, preserving account cooldown, early verification-token capture/privacy, invitation authorization and explicit acceptance, history layout at 320/375/1280px, and student-summary visibility/keyboard/no-recentering behavior. Minimal harness/metadata change; synthetic owned resources only. This agent owns only this design record, not product, helpers, tests, manifests, roadmap or memory writes.

## Work performed

Read project continuity rules, roadmap checkpoint, work-record protocol, current coordinator scope, affected tests, existing preview and complete-suite routing/runtime. Applied `sdd-ambiguity-gate`, `clean-architecture` and `team-docs-strategy`. Existing unrelated coordinator record is preserved. Inspected P3/P5 web specifications and the [historical summary investigation](2026-10-28-student-button-scroll.md). No implementation or functional execution was performed by this agent.

## ESTADO_DISENO: LISTO_PARA_TDD_RED

No new business ambiguity remains. The five invariants already exist in tests/specifications. The cause of the omissions is execution placement and a non-executable manual placeholder. Existing P5 integration already starts the actual production Next server and spawns the P3/P5 client files with its origin; moving their four browser cases into P5 makes each an explicit reported subtest and removes the duplicate FAST registration.

### MATRIZ_DE_DECISION_Y_STACK

| ID | Option A | Option B | Decision and reliability rationale |
| --- | --- | --- | --- |
| D1 | Four explicit sibling subtests in existing `p5-integration.test.mjs` | New multi-file wrapper or plain assertion helper | A, confirmed with coordinator. Reuses the owned runtime, makes cases visible in parent TAP and avoids broadening wrapper-command validation. Plain helper was rejected because the test-runner role may only write test-pattern files. |
| D2 | Importable existing Vite resource preview plus its real `ClassroomView` | New global fixture service or manual Ego-only global | A. Own loopback server and memory state, with explicit cleanup; no new infrastructure or implicit setup prerequisite. |
| D3 | Keep the exact legacy geometry/CSRF/head-order assertions and adapt only proven current UI selectors | Relax metrics or remove obsolete assertions to get green | A. A changed label/navigation structure may require a selector adaptation supported by rendered DOM, without reducing the behavior checked. |

The installed TypeScript/Next/React/Playwright/Vite stack is retained. No stack selection, package install, library upgrade or benchmark is needed. No shared domain contract or database schema changes are warranted for a test-placement/fixture change.

### DoR audit across six dimensions

- Data/idempotency: synthetic fixed fixture identifiers and isolated browser contexts; no retained account, token or roster data. Invitation acceptance is counted exactly once.
- States: anonymous to sign-in; authenticated/unverified to verification; verified to selected pending invitation; acceptance only after the explicit action. Registration cooldown must clear on changing account view.
- Failures: missing fixture exports, runtime readiness, assertions and cleanup must fail visibly. No fallback skip, source-render substitute or successful empty TAP.
- Concurrency: defer an in-memory removal, then update the roster while staying in Alumnos. Do not remount the component or reset its one-time reveal state.
- Permissions/visibility: no invitation accept or CSRF issuance before explicit acceptance; fragment removed by the physical first head script; no private upstream/configuration/provider access.
- GRASP: keep production unchanged unless a real observed failure warrants a separately designed fix. Existing P5 owns its server/browser lifecycle; the resource preview owns only its synthetic component server and state.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

All actors share this worktree and must preserve others' edits. This architect owns only this record. Test runner owns all assertion/test files. Worker owns executable fixture helpers and route metadata, and must not edit tests. Coordinator owns the roadmap, current delivery record and any verification-guide correction. No new worktree is necessary because edit surfaces are disjoint; execute actual checks in the coordinator's task-owned mirror using the private full-toolchain and an owned regular generated directory.

Reversible assumptions: use the original 894x486 summary viewport, 320/375/1280 history widths, existing P5 owned resources and existing component CSS/shell. Keep all API 30s, Next 180s, integration 330s and child 360s policies; do not add larger timeouts. Existing P5 test file already exceeds the preferred source-file size; keep this bounded test extraction there to avoid new command grammar or empty helper-test entrypoints. Delivery units remain at most 400 authored changed lines and may be separated by the coordinator.

## CONTRATOS_Y_PLAN_POR_SLICE

### Slice 1 — four explicit browser regressions; owner: test runner

- `tests/p3-web-client.test.mjs`: retain all four pure client tests; extract the two origin-gated browser cases exactly once.
- `tests/p5-web-client.test.mjs`: retain all eight pure client tests; extract the two origin-gated browser cases exactly once.
- `tests/p5-integration.test.mjs`: register and await four `t.test(name, async () => ...)` siblings in the existing parent after its last shared-journey check and before browser cleanup. They use lexical `origin` and the existing `browser`, each with an isolated fresh page/context and its own `finally` cleanup. Do not put them behind the shared `check` skip flag. Remove the old nested subprocess that reruns both client files and its now-unused spawn import.
- Preserve the four original names: registration cooldown/navigation; early token head; session/invitation gates and explicit acceptance; history text/action geometry. No env gate remains for these cases and no assertion-owning helper is added.
- The token head is a real HTTP document-order contract: preserve no-store/no-referrer, exact title and first script/link ordering. Browser fragment/explicit-confirmation proof can be linked to existing P3 coverage or strengthened locally, without presenting response inspection as visual acceptance.

### Slice 2 — executable summary fixture; helper owner: worker, test owner: test runner

`tests/audit-resource-preview.mjs` exposes the following local helper, preserving its direct CLI preview mode:

```ts
export async function withAuditResourcePreview<T>(
  run: (runtime: { origin: string }) => Promise<T>,
): Promise<T>;
```

Importing the module must not allocate a server/cache or hang. Invocation allocates its own Vite cache under `mkdtemp`, HTTP listener on `127.0.0.1:0`, accepts root URLs with `?scenario=summary`, passes its origin and closes the HTTP server, Vite and cache in `finally`, attempting every cleanup and surfacing errors. It must not require a global URL, running developer service, provider, database or credentials. Keep the existing `PREVIEW <origin>` CLI and shutdown handling available.

`tests/audit-resource-preview.jsx` keeps the default audit scenario intact and supports a summary scenario with the real `ClassroomView`, current production CSS, existing `AppNavbar`/classroom shell and a `[data-qa-fixture="true"]` marker. Add only these explicit memory controls:

```ts
window.auditControl.deferRemoval(): void;
window.auditFixture.removalPending: boolean;
window.auditControl.releaseRemoval(): void;
```

`deferRemoval` arms the synthetic member-removal POST. When that real UI action reaches the in-memory API, set `removalPending=true` and await release. `releaseRemoval` requires an actual pending operation, resolves it and makes the next members read return exactly two synthetic members; the count change models a concurrent roster refresh. The component then follows its existing removal/reload path. Keep the same mounted `ClassroomView` throughout: do not call `auditControl.refresh`, change its key or inspect/mutate React fibers. Expose neither business mutation endpoints nor additional product globals.

`tests/student-summary-scroll.test.mjs` becomes a normal Node test using this helper and Chromium. Preserve the old geometry/hit testing, maximum 30 Tabs, focused-control hit testing, deferred removal, two summary buttons, no-busy condition and zero matching `scrollIntoView` calls after refresh. The spy must delegate to the original method. Allow the completed React effect to settle before the final count; record a real nonzero pre-release scroll position to guard against vacuous no-scroll evidence. No `globalThis.qaFixtureUrl`, `taskSpace` dependency or conditional skip remains.

### Slice 3 — routing and evidence; metadata owner: worker, documentation owner: coordinator

- `scripts/complete-suite-routes.json`: move only `tests/student-summary-scroll.test.mjs` from FAST to owned-browser. P3/P5 clients stay FAST, P5 integration stays owned-browser.
- `scripts/complete-suite-inventory.json`: no membership/exclusion change is needed. Expected totals stay 305 executable files, 51 exclusions and 23 routes; route composition becomes FAST180 and owned-browser42. DB65/services8/exact wrappers are unchanged.
- `scripts/run-complete-suite.mjs`, `scripts/run-ci-suite.mjs` and `scripts/ci-suites.mjs`: no runtime or validator change required; preserve clean-environment and fail-fast semantics.
- Coordinator records the new executions separately from historical `1548 PASS / 0 FAIL / 5 SKIP`; four cases may already have run inside old P5 child output, so do not infer a new aggregate by adding five to old totals. Preserve old failure/skip evidence. Update current instructions that still require opt-in origin only after implementation is verified.

## CRITERIOS_DE_TEST_DOT

- Cooldown: broad mailbox registration issues exactly one request, shows the unchanged cooldown, navigates to sign-in with enabled action/no cooldown; no waiting out or reducing the 60s rule.
- Token: actual production document retains private-cache/referrer headers and the capture script physically precedes every generated script/link. Existing browser proof of fragment clearing and explicit confirmation remains active.
- Invitation: anonymous/unverified gates preserve the exact continuation, verified recipient sees the selected pending invitation, accepts/CSRF remain zero before action and exactly one afterward, with the exact CSRF binding. Preserve navigation/account-control checks using rendered-current UI evidence.
- History: real DOM at 320/375/1280, no horizontal overflow, text width at least 160px, name height at most two lines, actions below text within the original 1px tolerance on narrow widths and beside text on desktop.
- Summary: real DOM at 894x486; after scroll and entering Alumnos its first action is fully in viewport and center-hit reachable; keyboard reaches it within 30 Tabs and remains unobscured. A delayed roster mutation/reload produces two summary controls and zero recentering calls without remounting. Native screenshots/Ego capture can supplement, never replace, these assertions.
- RED is observed before helper implementation, identifying the missing export/fixture contract or actual failing behavior honestly. The four extracted regressions can already pass because production behavior exists; do not deliberately break product to fabricate a regression RED.
- GREEN requires all five named leaf cases actually executed, 0 FAIL / 0 SKIP / 0 cancelled / 0 todo / no unexpected NOTRUN, with resource cleanup and no leftover task-owned process/server/container. No assertion removed or metric/deadline loosened.

## Minimal reruns and DoD

1. Test-runner RED for the new executable summary contract; pure P3/P5 baseline can run without server allocation.
2. Worker helper/route implementation, then `node scripts/run-complete-suite.mjs --check` and appropriate inventory/runner tests. Observed classification must match the exact files above.
3. Fresh existing API/Next prerequisites in an owned mirror, then complete `tests/p5-integration.test.mjs` and `tests/student-summary-scroll.test.mjs` through the existing bounded `runSuite`/runner environment. No name filter is acceptance. Preserve raw TAP including all four sibling names and the summary name.
4. Run complete FAST180 with the official clean environment to prove its former omissions are gone and pure coverage remains. A two-file owned-browser execution is an affected subset, not a fresh complete browser42 claim.
5. Independently rerun/verify the two changed browser entrypoints and review diff, protected hashes, cleanup and evidence. Broader owned groups need reruns only if product/shared-runtime/dependency changes affect them; otherwise carry previous evidence explicitly by unchanged sources and dependency graph. DB/services/wrappers cannot be relabeled freshly executed.
6. Keep the four P9 protected files byte-for-byte unchanged; no installation/generation through original dependency junctions. Parent's existing publication authorization governs later integration; this design does not authorize deployment or retained/private operations.

## Verification

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`: observed branch and commit above; only the coordinator's new work record was initially untracked.
- Source reads and bounded `rg -n` searches identify four origin-gated cases in P3/P5 FAST files and one manual Ego placeholder in `student-summary-scroll.test.mjs`.
- No Engram writes: host identity is unavailable and parent explicitly prohibits them.
- Some exploratory reads used guessed roster filenames/PowerShell wildcard paths that did not exist; those commands returned missing-path errors and supplied no evidence. Correct concrete paths were then read. No functional PASS is inferred from inspection.
- During handoff, observed test-runner changes in the four owned test files match the selected interfaces. They are attributed to test runner; this agent did not edit them or claim their execution results.
- Coordinator reported test-runner RED: summary fails for the absent `withAuditResourcePreview` export, 1 FAIL / 0 SKIP; the two pure client files pass 12 / 0 / 0. These are reported results, not executions by this architect. Worker is enabled for fixture GREEN under the interfaces above.
- Local PowerShell structural check of this record passed: all three Markdown link targets resolve and no trailing whitespace. Functional tests were not needed for this architect's documentation-only change; the executable proof remains assigned above.

## Commits and outcomes

No commit created by this design-only agent. The design is ready, and all implementation checks remain assigned to the test runner/worker/coordinator.

## Handoff

First unfinished task: worker implements only the existing preview's exported lifecycle/summary controls and route move after the reported RED. Test runner then executes the full P5 and summary files without a name filter. Coordinator reconciles independent evidence and current skip status before any completed-delivery claim. No user decision is pending.
