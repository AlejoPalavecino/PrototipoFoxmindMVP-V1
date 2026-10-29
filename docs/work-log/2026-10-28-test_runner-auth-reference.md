# Auth reference verification — completed

- Agent / role: test_runner.
- Session or task ID: `/root/test_runner`.
- Date: 2026-10-28.
- Branch / worktree: `codex/inicio-reference-astra`; isolated foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: `95c7cb26407ef6bfc77d5faa1ee9c3caf917dfda`.
- Phase/task: selected login/register references; [coordinator](2026-10-28-root-auth-reference.md).
- Status: completed — bounded synthetic UI verification.

## Request and scope

Prepare meaningful test-first coverage only where behavior changes, preserve authentication contracts and verify layout against both supplied references in synthetic fixtures. No product/backend/secret/real-account/data/publication changes. Own tests, fixture helpers, temporary evidence and this record; coordinator owns shared roadmap.

## Work performed

Inspected actual branch/HEAD, existing account-screen/navbar/forms/field/client, account regression tests and platform-polish fixture. Password toggle and continuation validation already exist. Current minimal header exposes the brand but no anonymous cross-auth navigation; await architect's final contract before defining RED. Existing fixture returns anonymous sessions for public views and can be adapted without a backend proxy. Dedicated port53193 authorized; existing53191/53192 untouched.

## Verification

Baseline: `node --test --test-concurrency=1 tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/p9-home-client.test.mjs tests/foxmind-3d-flows-account.test.mjs` —18PASS/0FAIL/2 existing opt-in browser SKIP. No CSS implementation-mirror tests planned. Existing earlier entry-glass/folder legacy failures retain prior verified historical evidence; they will not be rewritten to bless this task.

RED: `node --test tests/auth-reference-navigation.test.mjs` —3tests,1PASS/2FAIL. Both anonymous opposite-flow links are absent in the old minimal header; authenticated actions/brand destination already pass. Exact encoded invitation continuation is asserted. Worker notified after RED.

Created isolated fixture with real AccountScreen, application styles/PostCSS, anonymous session and controlled loading/session-error/mutation-error/busy/rate-limit/registration-accepted responses. No upstream or persistence. Fixture strict TypeScript passed; owned Next webpack server53193 became Ready (session64460). Old53191/53192 untouched. Existing password toggle/payload/lock/cooldown are regression behavior, to be checked in the browser rather than claimed as new RED.

## Browser progress

- Header tests now GREEN3/3. Ego Space37/p1 is new for this request; prior finished Spaces35/36 were not reused. `_app.tsx` copied after the worker added the scoped stylesheet; PostCSS was present from fixture creation.
- Synthetic behavior passed: exact invitation continuation through both header links; keyboard show/hide toggles type/aria-pressed, preserves FormData value and triggers zero form submits; registration preserves required field names/autocomplete and quoted international mailbox input; generic202 feedback, focus, password clearing and60s cooldown; cross-navigation resets cooldown. Login401/503 safe alerts focus and clear password. Delayed request disables inputs, eye button and fieldset with aria-busy.
- Additional states passed: initial loading has busy/status and no live form; failed session exposes retry;429 Retry-After60 locks fields/eye and clears password; keyboard order follows email/password/eye/recovery/submit/cross-link. Recovery routes to the unchanged non-reference branch. Evidence in `.test-artifacts/auth-reference/behavior.json` and `states.json`.
- Initial reference-size comparison against both supplied screenshots and14responsive observations completed. No horizontal overflow/clipped headings/buttons; inputs16px/48px; controls44px within fractional-pixel rounding. At1024x768 registration the benefits panel covered the fox ear/forehead; sent bounded P2 correction to worker. Final visual result remains pending that correction and reinspection.
- First capture was unavailable because Ego's window was minimized. Task-level Browser.getWindowForTarget returned no-web-contents and Page.bringToFront did not restore it; coordinator restored only Ego's existing window via Win32. Same Space37 then captured successfully. No new Space or auth access was used to work around it.

## Commits and handoff

Final comparison opened both original references and final screenshots together. Worker corrected the artwork bands and benefits overlay. Sixteen final responsive observations passed at reference sizes,1440×900,1366×768,1024×768,760×700,390×844,320×640 and640×360 for both views. Six bounded rechecks after the last CSS change covered both references,1024×768 and1366×600: no horizontal overflow/clipped labels,48px inputs and reachable submit. The600px-high notebook scrolls vertically rather than compressing fields. Mobile and notebook screenshots were inspected. Compact headings/benefits differ mildly from the reference (P3); no unresolved P0/P1/P2 finding remains in the inspected scope.

The register885px request produced886px in Ego, a documented one-pixel rounding difference.640×360 proves equivalent CSS reflow, not native browser zoom. No real accounts, backend authentication, physical-device/Safari or native-review acceptance is claimed. All images were loaded and fonts ready before final capture.

[Durable evidence and limitations](evidence/2026-10-28-auth-reference/README.md) includes final captures, responsive observations and behavior/state receipts. `design-qa.md` has a new current auth entry; all earlier reports remain. Root independently reported final21PASS/0FAIL/2opt-in SKIP and production build PASS; this agent's observed navigation GREEN remains3PASS. No extra suite was run after visual-only corrections.

Space37 finished once, retaining p1 at the887×884 synthetic sign-in result for the user. Fixture server53193 remains owned by coordinator handoff (exec session64460). No commit by this agent; HEAD remained95c7cb26407ef6bfc77d5faa1ee9c3caf917dfda at handoff. Next: coordinator reconciles review, stages owned files and commits locally under the active authorization.
