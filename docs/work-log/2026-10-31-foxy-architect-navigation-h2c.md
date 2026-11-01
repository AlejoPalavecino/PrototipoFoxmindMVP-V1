# Foxy H2C — native document boundaries preserve history

- Agent / role: /root/foxy_architect / architect
- Session / task ID: /root/foxy_architect (H2C browser history design)
- Date: 2026-10-31
- Worktree / branch: C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai / codex/foxy-ai
- Starting commit: 886b7c3, with concurrent UI/runtime/test changes preserved
- Phase: complete text materials and confirmed Library publication; no images/diagrams
- Status: completed (design only; browser behavior remains unverified)
- ESTADO_DISENO: LISTO_PARA_TDD_RED

## Request, inspected evidence and rejected false proof

Inspected provisional foxy-navigation-bridge.test.mjs, package version Next16.4.2, pages/_app.tsx, FoxyScreen/Session/ResourceWorkspace, AccountNavbar and actual actions adapter. The provisional fake has a single address string, no stack/cursor/document identity. It can pass even if implementation overwrites the previous entry or destroys Forward. The test intention is retained; its model must become strong enough to distinguish URL replacement from a canceled traversal.

Pages Router beforePopState runs on an already initiated popstate and delegates the remaining handling to the caller when false. Its public callback has no traversal delta. router.push of the destination creates a new entry; replacing the current popped URL with Foxy overwrites another entry. Neither implements exact Stay/Continue/Forward. Do not use thrown route events, guessed -1/+1 direction, private Next state fields, a sentinel duplicate entry, or a fake passing address test. See the [official Pages Router API](https://nextjs.org/docs/pages/api-reference/functions/use-router).

Context7 was attempted first and returned monthly quota exceeded. Official documentation fallback was read with web tools; no interactive browser session. The Navigation API exposes public entry keys/indices and traversal, but adds feature detection, deferred traversal identity and an unsupported-browser path. It is not required for this bounded delivery. Its possible future optimization is not this design's implementation.

## Decision and trade-off

Use an independent browser Document for Foxy's route and document navigation for every departure. The browser owns native Back/Forward and the unload choice; the application never reconstructs the history cursor. Existing H2 save/discard/stay UI remains for app links. Native Back/Forward uses the browser's generic leave prompt; choosing Stay retains the current document/draft, while Continue leaves it. Saving first is possible by choosing Stay and using the actual editor save.

The cost is a document load at Foxy entry/departure, with one normalization reload if an unexpected SPA entry reaches Foxy. This is a reversible performance trade-off, scoped to Foxy. Ordinary non-Foxy app navigation stays unchanged. This compatibility-first route does not expose unsaved drafts before entry normalization and does not depend on NavigationTiming, __NEXT_DATA__, private router fields or persistent text storage.

This is a browser unload guard, not crash recovery. Browser policy may suppress beforeunload in some circumstances; native mobile process termination cannot be guaranteed. Record this limit, do not claim universal preservation or store private drafts as an unreviewed workaround. [Browser beforeunload behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

## C1 exact contracts — document entry and native bridge

New apps/web/src/lib/foxy-document-boundary.ts stores one nonsecret route pathname per Document in a WeakMap. It does not read/write history or storage.

```ts
captureDocumentEntry(document: object, pathname: string): void;
getDocumentEntryPath(document: object): string | null;
isFoxyDocument(document: object): boolean;
```

capture is idempotent: the first pathname for that Document wins. In pages/_app.tsx, import this module statically and invoke capture at client module startup, before App renders any page; guard typeof window for SSR. Do not capture from FoxyScreen or an effect: that would confuse a later SPA URL with the document's original route. Reading the entry path from a lazy-loaded Foxy module alone is insufficient.

isFoxyDocument accepts the application's canonical /foxy-ai route (allow the normal trailing-slash equivalent); no query text or IDs are stored. Different Document objects have separate captures, even at the same pathname. Unknown capture means loading/error/retry only, never a mounted private editor. Hot-reload behavior must not be mistaken for production lifecycle proof.

New apps/web/src/lib/foxy-navigation-bridge.ts:

```ts
createFoxyNavigationBridge({
  window, // narrow location.assign/replace and add/removeEventListener ports
  shouldBlock: () => boolean,
  hidePresentation: () => void,
  onError?: () => void,
}) => ({
  install: () => void,
  navigate: (href: string) => void,
  replace: (href: string) => void,
  dispose: () => void,
});
```

The former provisional router/actions inputs are unnecessary in this selected mode; do not keep unused dependencies just to preserve an inadequate fake test. navigate is a terminal callback invoked by H2 after its guard approves, not an unguarded UI action. It validates an application-local absolute path again (single slash, no protocol-relative form, backslash or controls) then invokes location.assign. replace validates identically then invokes location.replace for identity redirects or pre-editor document normalization. Invalid values do not navigate; report a generic local error, never raw URLs/exceptions. There is no router.push, beforePopState, history.pushState/replaceState/go, or Navigation API in this bridge.

install is idempotent and installs these owned listeners:

- beforeunload re-reads shouldBlock on every invocation; when true calls preventDefault and sets returnValue to the legacy-compatible empty string. When false, it does neither. It never calls actions, clears drafts or starts a request. Native Stay does not dispose the workspace.
- pagehide synchronously calls hidePresentation, covering a possible back-forward cache snapshot. The H1 hook separately owns workspace disposal on pagehide, described in C2. pagehide occurs after an accepted departure, not after native Stay.
- pageshow with persisted=true requests one native replace of canonical /foxy-ai, while the presentation stays hidden. This re-enters session verification in a fresh document, rather than resuming cached private UI/workers under an old teacher. Initial pageshow persisted=false does nothing. A replace failure leaves private presentation hidden and exposes safe reload/retry, not old snapshots.

dispose removes exactly those listeners and disables all late callbacks/navigation; it does not dispose runtime. All callbacks are document/subject scoped. Neither the bridge nor its tests can claim that calling preventDefault on a synthetic event exercises a native browser prompt.

Location.assign loads a document and preserves the caller as a Back target; replace changes the current entry. These platform operations are the basis for preserving entry order without copying framework state. [assign documentation](https://developer.mozilla.org/en-US/docs/Web/API/Location/assign), [replace documentation](https://developer.mozilla.org/en-US/docs/Web/API/Location/replace).

## C2 composition and lifecycle — before editing, no bypasses

FoxyScreen gates presentation BEFORE mounting FoxyWorkspaceSession/useFoxyWorkspace:

1. If the Document has no startup capture, show only a safe unavailable/retry state. No Foxy client/runtime/editor exists.
2. If its startup path was another route, replace canonical /foxy-ai once and render only entering/loading. No draft exists to lose. The new Document's _app capture is /foxy-ai; no loop and no extra pushed history entry. The replacing document gate remains closed even if the navigation call fails.
3. If started on Foxy, verify the actual account normally, then mount the keyed teacher workspace. Direct loads, reloads and normalized loads use the same authenticated flow. Path is not an authorization claim.

Add an optional onNavigate override to AccountNavbar, applied consistently to main/logo/mobile/profile links and notifications; its default preserves existing router.push elsewhere. In Foxy, it calls the CURRENT registered actions.requestNavigate. A registration is cleared on unmount/identity/subject change before another scope can use it. While the teacher workspace is not bound, block private navigation handlers or use the pre-editor native route deliberately; never fall back around an existing dirty guard.

Session passes bridge.navigate as H2 onNavigate. Existing resource Abrir aula CTA also goes through actions.requestNavigate. Modified/new-tab/PDF links retain normal behavior and do not close this editor. Saved/clean same-Foxy navigation is a no-op rather than a needless reload. All ordinary departures from an active Foxy document must use the native terminal callback, including any future sibling link; an uncovered router.push would break the document-boundary invariant and is a failing test. Identity teardown closes the workspace first, then uses native replace for the sign-in/verification destination without asking the dirty guard.

H1 remains the lifecycle owner: extend its own runtime effect with an owned pagehide listener which immediately sets active=false, clears hook binding and disposes that runtime idempotently. Cleanup removes that listener. It does not send an identity error or a new API mutation. The bridge hides its owned Foxy presentation root synchronously on pagehide; listeners must be established before editable content is enabled. On persisted pageshow the bridge replaces Foxy to obtain a new Document and fresh session. No old runtime/poll timer/queued reply can revive private UI. This is an explicit small lifecycle follow-up, not permission for UI to dispose arbitrary child controllers.

The Foxy route currently keeps conversation/resource selection in controller memory and does not push route history while editing. Hash-only skip-link movement may remain same-document: it does not leave the workspace or lose a draft and therefore needs no synthetic blocking traversal. Do not add query/history navigation for resource state in this cut. If future routing does so, reopen this invariant and design that contract separately.

## C1/C2 RED and integration criteria

1. Startup capture: initial /inicio followed by SPA URL /foxy-ai still reports /inicio; subsequent capture cannot overwrite it. Fresh document /foxy-ai is accepted, even if prior Document had another route. SSR no window access.
2. Screen normalization: unexpected SPA entry invokes native replace once, creates no Foxy clients/runtime/editor and never uses NavigationTiming. Fresh normalized document creates one workspace; unknown capture/error creates none. No normalization during an existing dirty editor.
3. Bridge construction performs zero navigation/listener work. Install/dispose are idempotent. Native beforeunload blocks only live dirty/pending/busy resource/PREPARE/CONFIRM states; acknowledged PREPARING alone does not block. Closing local root clears live guard after H2 approval.
4. App link dirty -> one custom leave and zero assign; Stay retains draft/no assign; successful actual save -> assign once only when latest state clean; explicit informed discard -> root clear then assign once. No direct router push. Navbar notification, logo/mobile/profile and Abrir aula covered, including direct handler invocation.
5. Unsafe targets produce zero navigation. Non-Foxy navbar default remains unchanged. Modified/new-tab preview does not call leave/dispose. Identity closes first, replaces once and cannot be vetoed by an old dirty guard.
6. pagehide owns synchronous presentation hide plus H1 runtime disposal and binding clear. Native Stay triggers neither. persisted pageshow replaces once and never renders an old snapshot or resumes worker/polling. Nonpersisted initial pageshow does nothing; late events after dispose do nothing.
7. Keep an integration history model with entries, cursor and document identity. Normalization replaces exactly the Foxy entry; approved app assign appends exactly one. Neither operation rewrites the preceding Inicio/Mis Aulas entry. This model proves composition only, not the native browser prompt.

The provisional test asserting blocked pop calls actions.requestNavigate is intentionally superseded: native Back in this mode does not synthesize an app navigation action. Preserve the original failure in test_runner's work log; replace that expectation with the selected documented browser contract and stronger model, not with a weaker fake. Source assertions may guard forbidden APIs but cannot substitute for native QA.

## C3 actual ego(lite) QA — required acceptance

Use a dedicated task Space and synthetic teacher/account/API fixtures per the existing scope. Start the real application entry, not only a statically rendered component. Record route address, document identity (an ephemeral QA-only marker), actual editor value, history entry order and observed native dialog handling. Use installed ego-browser guide capabilities; if native dialog acceptance/dismissal is unavailable, mark that exact proof unavailable rather than using a fake modal or claiming PASS.

- Inicio -> ordinary app Foxy entry -> edit resource. Confirm normalized document boundary, one final Foxy entry and no editor before normalization.
- Press actual browser Back after a user edit; choose native Stay. Address remains /foxy-ai, same editor value, same active subject, no API save/publish and no hidden presentation.
- Press Back again; choose native Continue. Actual previous route is the original Inicio/Mis Aulas, without duplicate Foxy or rewritten entry. Press Forward: Foxy returns through fresh verification, no old private snapshot/polling; saved server resources/preparations remain queryable.
- Construct a Forward target with native route navigation, return to Foxy, edit and exercise actual Forward Stay and Continue. Validate address/content/cursor, not only page screenshot. Check browser history-menu multi-entry traversal if supported by the QA surface.
- Exercise app Navbar, notifications and Abrir aula with custom Stay/save/discard; ensure destination native assign only after approval. Type new text while save is in flight: ACK must not navigate away from the newer draft.
- Trigger beforeunload on reload/close with actual interaction; record native browser policy and generic dialog rather than asserting custom wording. Reopen same answer to recover server preparations after a deliberately lost PREPARE/CONFIRM response, without duplicate publication.
- Check cached return and identity change using synthetic sessions: old teacher content stays hidden; re-entry rechecks session and no student can mount the Foxy runtime. Document any browser cache path not exercised.

At minimum run the available target Chromium ego(lite) proof. Other browser/device coverage is an explicit limit unless actually executed. Neither desktop QA nor this design promises protection from OS process termination. Do not broaden into a real provider call, retained data or images/diagrams.

## Ownership, checks and handoff

C1 worker owns only new document-boundary/native-bridge helpers; test_runner owns their tests. C2 assigns _app, Screen/Session/Navbar and H1 lifecycle edits explicitly because these surfaces already have concurrent owners. Preserve their changes and add narrowly. C3 test_runner owns browser proof; reviewer audits all route departures and lifecycle teardown. Coordinator owns phase acceptance/roadmap and final stopping scope.

This architect wrote only this own record and the explicit final SAVE-policy correction in [H2 actions](2026-10-31-foxy-architect-actions-h2.md). No production/test edits or executed behavioral checks. Commands observed: source reads, Git status/HEAD and package search; Context7 unavailable; official web references read. One initial source read used a nonexistent src/pages/_app.tsx path; corrected to actual pages/_app.tsx. No DB, provider, secret or browser execution. PowerShell structural/link check passed for both own records: three local links resolve, no trailing whitespace or zero-width characters. The earlier Engram mem_save hook failure (host session unregistered) remains unavailable and was not bypassed; this repository record is the durable handoff.

First unfinished work: coordinator acceptance of this bounded native-document mode, C1 RED updates preserving provisional failure history, C2 lifecycle and binding RED, then actual Back/Forward/bfcache browser QA. Design readiness is not feature completion. If browser policy/tool limitations prevent proof, keep that acceptance item open and retain the explicit limitation.
