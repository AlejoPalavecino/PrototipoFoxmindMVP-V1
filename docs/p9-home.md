# Inicio: real classroom summaries and safe navigation

`/inicio` is the default destination after ordinary sign-in for an authenticated account with verified email (user-requested change, 2026-10-25). Continuing an existing session or completing email verification also defaults to Inicio. Explicit allowed continuations, including `/mis-aulas` and exact invitations, retain their encoding and validation. Unverified accounts still pass through email verification; Mi perfil remains accessible from account navigation. Other paths, query strings, fragments, arrays and remote URLs remain rejected.

## What users can do

- Reach Inicio and Mis Aulas from verified account navigation and the classroom shell, without a global role switch.
- See their actual current classroom lists under **Enseño** and **Estudio**, including archived read-only indicators. Classroom entry uses the existing server-scoped classroom view.
- Create or join through the existing wizard/code-confirmation flow; inspect their private drafts and pending invitations in Mis Aulas. Seeing an invitation never enrolls an account.
- Open real academic news. Each destination comes from the successful `POST /notifications/:id/open` response, which checks current membership and target permissions. List-item identifiers are not navigation authority.
- Recover from failed refreshes with a visible manual retry. Inicio hides stale classroom cards after a failed list refresh rather than presenting them as fresh success.

## Implementation boundaries

No new API endpoint, schema, dependency, account role or academic email was added. `ClassroomsScreen` retains the accepted P3 session/verification gate. `ClassroomsApp` defaults to the existing Mis Aulas presentation; Inicio is optional. Its wizard navigation restrictions and reduced evaluation header are not replaced.

The warm hero, existing typography and Cover catalog reuse the accepted classroom component grammar. No original standalone fox artwork is available in this checkout. Reference screenshots are not cropped into assets, and replacement fox art is not invented. Visual comparison therefore must retain that explicit asset limitation rather than claim exact screenshot fidelity.

## Own verification

Focused tests: `node --test tests/p9-home-client.test.mjs tests/p5-web-client.test.mjs tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs`.

Actual production Next/browser/API/SQL/scanner/captured-email proof: build API and web with the existing30s/180s budgets, then `node --test --test-isolation=none --test-concurrency=1 tests/p9-home-integration.test.mjs` (test330s, child360s). The test explicitly enables classrooms in `withP4IntegrationRuntime`; default account/file-only runtime is not sufficient.

The actual fixture owns disposable local services and synthetic accounts. It does not use preview identities, substitute API responses, retained databases, production participants or external email delivery. A loading barrier delays forwarding a real request without changing its response. Offline recovery uses actual browser offline transport. Screenshots use an OS-temp directory printed by the test; the coordinator owns cleanup. A real429 permits only one valid bounded `Retry-After` wait and visible retry, never a blind whole-test repeat.

Exact observed outcomes and remaining proof belong to the [T2 worker record](work-log/2026-10-19-p9-t2-home-worker.md). These own checks are not final independent whole-P9 acceptance.

### Own Home proof — all groups observed across bounded runs

The corrected broad journey has six observed actual passes, followed by an unidentified remaining alert after list-only recovery. Those results and failures remain intact. The isolated target subsequently passed three actual groups: Home320/375/1280 keyboard/reflow/reduced-motion, private-draft wizard restrictions and confirmed save, and account navigation320/375/1280 visibility/keyboard. The latest specifically authorized filtered execution then passed the two remaining recovery and ordinary/explicit/revoked login groups without replaying approved bodies. All eleven Home groups now have own evidence across these bounded executions; no single broad-fixture PASS or independent whole-P9 acceptance is claimed.

Executed once under the two-group authorization:

```text
node --test --test-isolation=none --test-concurrency=1 --test-skip-pattern="^(Home320/375/1280 preserves keyboard focus, reflow and reduced motion|private draft wizard retains restricted navigation and confirmed save exit|verified account navigation320/375/1280 stays visible and keyboard reachable)$" tests/p9-home-recovery-integration.test.mjs
```

Preparation did not execute the target. A later explicit single execution authorization was consumed on2026-10-19: the unfiltered isolated command exited1 after12219ms, before any child group or real account/classroom prerequisite, with `P4 Docker network unavailable`. This is environmental preparation unavailable, not application RED. At that point all five groups remained unproven; the first affected P6 navigation was not launched. No API/Next rebuild or broad Home repetition occurred; product bytes and previously successful builds remain unchanged.

That historical Docker failure remains recorded. After the user explicitly restored Docker and authorized one more isolated run, local named-pipe readiness returned Docker29.7.2/exit0 in101ms. The isolated run exited1 after180894ms: three groups passed, recovery failed on one empty other-owner alert matching framework behavior after both owners completed, and login failed because the fixture expected logout200 instead of the accepted204. Process and owned cleanup each reported0failures. No P6, build or actual repeat followed.

Installed Next renders an initially empty `p#__next-route-announcer__[role=alert][aria-live=assertive]` and later announces the document title. Actual diagnostics captured an empty other-owner alert onInicio and `Mi perfil · FoxMind` onprofile, consistent with that source; they did not capture its id, so exact historical node identity is not independently proven. Both fixtures now classify that exact installed framework contract separately, assert each application error owner clear, and retain failures for all other alerts. Diagnostics include id/tag/aria-live/text/owner. Server logout explicitly clears its cookie and returns204; both fixtures now assert204. These are fixture corrections, not product fixes or retroactive PASS.

The latest authorized command above exited0 in49030ms, within unchanged330s test/360s child. Only recovery882ms and ordinary-profile/explicit-Inicio/revocation1209ms executed: native3PASS including the parent,0FAIL/0SKIP. The other three bodies were excluded; the six earlier groups are not in this file. Fresh actual diagnostics positively identified Next's `P#__next-route-announcer__`, `ariaLive=assertive`, emptytext separately from cleared application error owners. Real logout204, rejectedGET401/AUTH_REQUIRED/unchanged domain hash and exact safe sign-in continuation passed. No product fix or rebuild was necessary.

Only after that success, the first affected `node --test --test-isolation=none --test-concurrency=1 tests/p6-mobile-navigation.test.mjs` passed1/exit0 in40428ms under its existing120s test/180s child. Real notification opening and active Muro tab visibility/reflow passed at320/375/1280/320. Both commands reported processcleanup0 and ownedcleanup0; exact-owner resource inventories were empty. These consumed executions are not instructions to repeat them.

A tiny OS-temp native preparation probe confirmed why `--test-name-pattern` is unsafe here: matching the parent runs all five children, while matching only child names runs none. In that synthetic probe, the exact `--test-skip-pattern` above executed the prerequisite marker and only the two selected placeholder bodies; the other three bodies were excluded. No actual integration fixture was executed by the probe. Native totals omit excluded tests rather than counting them as SKIP. No new fixture/helper surface was needed.

Two real verified synthetic accounts, one actual scanned/enrolled classroom, a private draft and one actual notice are prerequisites, not a replay of the six completed acceptance groups. Each selected group uses an independent page after common real setup; failure diagnostics record every available alert's actual identity, text, region and error owner, plus relevant read statuses/failures. Preparation failures remain distinct from application RED.

List recovery requires successful completed JSON bodies for classrooms/drafts/invitations and a settled list action; news has a separate request/error and visible **Reintentar novedades** control. The target deliberately fails both owners under actual browser offline transport, then recovers each through its own real response/body and settled UI. It checks overall alert clearance only after both owners complete, never after list response headers alone. The original fixture now uses the same distinction; historical failures are not retroactively PASS.

All setup uses existing public account/API/classroom helpers and the owned runtime with `{ classrooms:true }`. There are no substituted API responses, SQL-created authority, retained resources or new policy/dependency/source changes. The preparation exception has no meaningful product RED: only fixture assertions and diagnostic coverage were corrected. Syntax and source/locator readback are the complete checks for this preparation step.

Risk: items2,3 (account continuation and shared navigation contracts).
