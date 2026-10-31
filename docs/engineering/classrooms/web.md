# Classrooms in the production web application

The existing P5 classroom UI now mounts at `/mis-aulas` in the actual Next.js application. It uses P3 identity and CSRF and the accepted P4 private-file API. The isolated preview remains a separate fixture host; its account selector is not imported into the product.

## Entry and invitation flow

1. Open `/mis-aulas`, or follow **Mis Aulas** from the account navigation.
2. Anonymous sessions go to sign-in; unverified sessions go to email verification. No classroom requests or fixture identities substitute for that gate.
3. A verified account sees its own teaching/studying lists, drafts and actionable invitations. The existing wizard, classroom settings, membership/history, codes and archive UI remain unchanged in structure.

An email destination `/mis-aulas?invitacion=<uuid>` selects only a pending invitation actually returned for the current verified recipient. **Aceptar invitación** is still an explicit action; opening the link, logging in or verifying an account never enrolls anyone. Missing, expired, used and other-account invitations receive a generic explanatory notice without disclosing private classroom data.

Account continuation accepts only `/mis-aulas` or that exact single UUID query. No arbitrary destination, fragment, duplicate query or external URL is accepted. A bounded local destination can be remembered in tab-scoped session storage for 30 minutes while the person reopens a verification email in the same tab. It contains no session, password, proof token or authorization. Other tabs can always reach their pending invitations through **Mis Aulas**.

The classroom navigation exposes **Mi perfil** and the real **Cerrar sesión** mutation. During draft editing those actions are hidden until **Mis Aulas / Guardar y salir** flushes the acknowledged autosave, avoiding client navigation that could bypass a pending save. Server-side authorization remains authoritative after the initial UI gate, and expired-session/unverified responses return to the appropriate account screen.

## Transport and files

`pages/api/v1/classrooms/[[...path]].ts` delegates to a dedicated Node HTTP transport. It accepts only the documented P5 route/method combinations and exact JSON field shapes; identifiers must be UUIDs. Queries, encoded/traversal paths, unsupported encoding, GET bodies and undeclared operations are rejected before forwarding. `FOXMIND_API_ORIGIN` must be a bare HTTPS origin, or HTTP on an explicit loopback host. Client headers cannot select a different upstream.

Classroom JSON is capped at 512 KiB, matching P5's body bound rather than P3's smaller account limit. The proxy additionally checks the existing curriculum shape: at most 100 units, 100 topics per unit and 500 topics total. The backend still owns scalar validation, revision conflicts, authorization, transaction policy and publication requirements. Responses are bounded to 2 MiB JSON. Body reads have a 10-second deadline and the upstream exchange a 30-second deadline; disconnects cancel upstream work. Redirects, malformed/oversized/truncated responses and transport failures are sanitized. Responses are non-cacheable and preserve safe cookie, request-ID and retry metadata.

The reusable classroom client keeps its original root-relative default for the preview. The production client independently prefixes both requests and generated file links with `/api/v1`; wrapping only `fetch` would not fix download/preview links. Every mutation reacquires the real `/api/v1/auth/csrf` binding. File metadata, binary upload, status and content continue through the unchanged P4 `/api/v1/files` routes, including ready/pending/rejected states and quota errors. The UI never treats an upload as approved solely because bytes were sent.

## UI composition and checking

`apps/classrooms-ui/Classrooms.tsx` is the CSS-free full UI. The existing `ClassroomsApp.tsx` preview entry imports styles and re-exports it. Production imports the CSS-free module and loads scoped styles only from Next's `_app.tsx`. Scoped P5 selectors are unlayered so P3's unlayered reset cannot override them; the existing palette/layout/components are retained.

Run the web regressions and strict TypeScript check from the repository root:

```powershell
node --test --test-concurrency=1 tests/p5-web-proxy.test.mjs tests/p5-web-client.test.mjs tests/p5-ui-client.test.mjs tests/p3-web-proxy.test.mjs tests/p3-web-client.test.mjs
node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit
```

Browser-only cases are explicit subtests of `tests/p5-integration.test.mjs`. Run `npm run test:p5:integration` to prepare the actual built Next application and disposable services; no manual `FOXMIND_WEB_TEST_ORIGIN` opt-in is needed. The pure client files above no longer contain browser skips. Their route-controlled UI checks remain separate from the same journey's real identity/API/SQL/file/email/persistence proof. The mobile menu is exercised at320px before restoring the320/375/1280layout checks. See the [five-check closure record](../../work-log/2026-10-30-root-five-historical-checks.md), historical [worker record](../../work-log/2026-10-18-p5-web-integration.md) and [integration task](../../../odd/tasks/p5-integration.md).

The narrow roster/history regression also checks readability, not only absence of page overflow: at 320/375px the membership text column must remain at least160px wide, the sample name uses at most two lines, and action controls appear below the membership text. At1280px controls remain alongside it. The mobile-only grid keeps the original avatar/text/actions and desktop structure; it prevents a wide summary control from squeezing dates/reasons into near-vertical text.

Current whole-feature acceptance is recorded in [P5 independent verification](../../work-log/2026-10-18-p5-verify-final.md), including one bounded international-recipient correction and targeted recheck. Writer-only evidence above is retained with its original scope. Publication is a separate coordinator action.
