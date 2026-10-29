# Inicio reference — synthetic visual and interaction evidence

Final result: passed for the bounded Home presentation contract. Agent `/root/test_runner`, 2026-10-28; branch `codex/inicio-reference-astra`, starting commit `9fa596c37774353390835eb41c7cb2f8d480644a`. [Agent record](../../2026-10-28-test_runner-inicio-reference.md).

The [user reference](../../../design/inicio-reference/user-reference.png) and [accepted desktop](accepted-mixed-1784.png) were opened together at the same 1784×882 dimensions. The final hero is 245px tall and the two-item agenda approximately 308px, close to the supplied composition. Warm canvas, orange actions, sidebar, pastel shortcuts, illustrated covers, learning/teaching groups and quieter right rail are retained. The final image fade removes the abrupt hero edge; the desktop and [320px mobile](accepted-mixed-320.png) were inspected again after that last CSS correction.

These are real production components rendered by an explicit synthetic fixture on `127.0.0.1:53191`, with in-memory HomeResponse data and callback outputs. The fixture uses the application's `_app.tsx`, styles and PostCSS configuration. No authentication, database, production participant, external provider, delivery or retained-data mutation is represented by these screenshots.

## Observed checks

| Check | Observed result |
|---|---|
| Mixed responsive view | 1784, 1440, 768, 390 and 320px: no document overflow, clipped heading/button text or visible interactive target below 44×44px; all images loaded. |
| Hero adaptation | Decorative artwork below live text on mobile; long name wraps without clipping at 320px. |
| Four shortcuts | Keyboard Enter invokes classrooms/create/agenda/join callbacks; visible solid 2.4px focus outline. Unit tests preserve busy disabling. |
| Role groups | Mixed: both groups; study: learning; teach: teaching; none/archived: neither active-work group. Archived classrooms remain visible. |
| Truthful activity | Exact membership and pending/feedback/review totals; unknown totals omitted, empty state honest, no percentage or fabricated achievement. |
| Recovery | Four partial errors each recover through their own retry; no error retry remains afterward. Seven module retries are also unit-tested. |
| Pagination | Five existing classroom rows → eight unique rows after Cargar más → cursor exhausted; Volver a Inicio restores five summary rows and focus to the classroom expansion control. |
| Loading/reduced motion | Accessible busy/status loading state; reduced-motion media matches and zero running animations observed. |

Observed data: [responsive and action results](final-observations.json), [panel, role groups and loading](panel-and-states.json). The earlier `groups: []` fields in final-observations used an obsolete diagnostic selector; the explicit semantic group assertions in panel-and-states supersede those fields. They do not indicate absent rendered groups.

Additional captures: [1440px](final-mixed-1440.png), [768px](final-mixed-768.png), [390px](final-mixed-390.png), [keyboard focus](final-keyboard-focus.png), [long name](final-long.png), [first use](final-none.png), [archived](final-archived.png), [unknown totals](final-unknown.png), [partial error](final-error.png), [loading](final-loading.png), [panel return](final-panel-return.png). Only the final 320/1784 accepted images include the last illustration-mask correction; all earlier evidence remains attributable to its inspected state.

## Deliberate reference adaptations

- Real destinations replace unsupported search, messages, personal folders, AI and progress shortcuts. No fake badges or global role are introduced.
- Counts replace the reference's unsupported completion ring, delivered count, progress bars and achievements. Published feedback is not interpreted as all delivered work; review counts use submissions needing review rather than activity rows.
- Both current classroom perspectives and all returned rows remain available. Agenda retains real times, all-day labels, original/display timezone and the 90-day window.
- Existing optimized cover art and a newly generated local hero are used; the user screenshot was not cropped into application assets. The Foxy note has general static encouragement, without a fake action.

## Test evidence and preserved failures

Final focused command: `node --test --test-concurrency=1 tests/home-reference-summary.test.mjs tests/home-reference-dashboard.test.mjs tests/workspace-disclosure.test.mjs tests/p9-home-client.test.mjs tests/home-polish-presentation.test.mjs tests/home-refinement-copy.test.mjs tests/home-miniagenda-reference.test.mjs tests/education-experience.test.mjs tests/foxmind-3d-client-lifecycle.test.mjs` — **37 PASS / 0 FAIL / 0 SKIP**. Strict fixture TypeScript passed. Coordinator owns production-build evidence; reviewer independently observed the earlier 32-test focused set.

The separate `entry-glass-client` and `folder-platform` suites have seven pre-existing failures, reproduced against an isolated `git archive 9fa596c` source snapshot using the installed dependencies read-only:

1. Public navbar expects a historical `aria-expanded=false` control.
2. Entry password test's legacy loader cannot resolve the shared-ui directory import.
3. Entry Home test expects the historical `Estudio` section from obsolete props.
4. Folder navbar expects the historical `/folders/foxy-logo.png` asset.
5. Folder account SSR has the same legacy shared-ui loader failure.
6. Folder password test has the same loader failure.
7. Folder Home test expects the historical `Estudio` group from obsolete props.

No assertion in those suites was changed. The initial baseline export omitted web styles and added one setup-only stylesheet failure; adding the exact HEAD styles and rerunning only that check passed. Lifecycle's global-failure assertion remained unchanged and passed all five tests; it was not a first-use shortcut assertion.

## Limits and transient observations

This is component/browser evidence, not authenticated backend E2E, native security review, physical-device, Safari or complete accessibility acceptance. No new unresolved P0/P1/P2 issue was found in this scope.

The first dependency attempt conflicted with the coordinator's already running fixture; coordinator restored it before the 22-test baseline and genuine RED. A regenerated Next config briefly restarted the owned fixture, causing one connection-refused navigation; it was observed ready before continuing. Early captures lacked the application's PostCSS config and are provisional only. `mixed-1784-initial.png` actually captured a 894px window after an emulation reset; it is not reference-size evidence. One 320px provisional capture caught an entrance animation; final captures waited for finite animations and image loading. A final diagnostic used an outdated hero selector after successfully saving the mobile capture; the corrected diagnostic and desktop capture completed in the next round. These preparation failures are preserved, not retroactively marked PASS.

Ego Space35 was reused throughout; p1 login was untouched. P2 is the requested preview result. Coordinator owns final browser-space retention and runtime lifecycle.
