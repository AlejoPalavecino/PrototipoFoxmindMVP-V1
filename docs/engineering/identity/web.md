# Local account web

The P3 web is a Next.js Pages Router app in `apps/web`, with React/TypeScript, Tailwind CSS and customized shadcn-style native button/input/label primitives. It provides the account UI; later [file web integration](../files/web.md), [classroom web integration](../classrooms/web.md) and [Inicio](../home/home.md) are documented separately and already present on main.

## Run locally

Install the pinned root dependencies using the repository's normal dependency installation, then build:

```powershell
node node_modules/next/dist/bin/next build apps/web
```

Start the existing Nest API using the documented isolated/local account configuration. In its terminal set `API_PORT=3001` when the web uses3000; keep backend `APP_ORIGIN=http://127.0.0.1:3000`. The two listeners need distinct ports. Set the web process's **server-only** `FOXMIND_API_ORIGIN` to that API's exact origin (for example, `http://127.0.0.1:3001` when the API actually listens there), then start the web:

```powershell
$env:FOXMIND_API_ORIGIN = 'http://127.0.0.1:3001'
node node_modules/next/dist/bin/next dev apps/web --hostname 127.0.0.1 --port 3000
```

Use the exact browser origin configured as the backend's `APP_ORIGIN`, for example `http://127.0.0.1:3000`; `localhost` is a different origin. Set the trusted email frontend origin to the same browser origin. No environment files or production credentials are needed for the isolated test fixture.

For a prebuilt app, replace `dev` with `start`. The API origin must be configured when the web server runs, not exposed through a public environment variable. There is no fallback destination. HTTPS origins are allowed; plain HTTP is accepted only for explicit loopback destinations.

## Account routes

| Route | Behavior |
|---|---|
| `/` or `/sign-in` | Sign in; verified accounts without an explicit destination continue to `/inicio`, while permitted explicit destinations and invitation flows are preserved; unverified accounts continue to verification. |
| `/register` | First/last name, broad-format email and password; generic accepted response, no automatic login. |
| `/verify-email` | Explicit confirmation when opened from an email link; signed-in unverified users can resend, refresh state or sign out. |
| `/forgot-password` | Generic request response without account-existence disclosure. |
| `/recover-password` | Explicit token/new-password confirmation; success returns to sign-in with prior sessions revoked by Nest. |
| `/profile` | Verified profile read/name edit, immutable email, password change and logout. |

Names and passwords retain their raw whitespace and Unicode spelling. Validation counts code points, not UTF-16 units; names allow at most 80 code points and new passwords require 16–128. Email uses a text field with email input mode/autocomplete so browsers do not reject accepted quoted or international mailboxes. The server remains authoritative for mailbox syntax and lowercase-domain policy.

## Transport and tokens

The catch-all `/api/v1` proxy permits only the twelve documented account method/path pairs, rejects queries and unexpected operations, and forwards only cookie, Origin, CSRF and body-media headers. It never synthesizes a trusted browser Origin from Host or forwarded headers. Nest is the sole owner of authentication, authorization, origin enforcement and rate limiting. The proxy returns Set-Cookie and Retry-After and applies no-store/nosniff. Bodies are limited to 16 KiB; body reads and backend fetches have 10-second deadlines. Rejected stream cancellation is handled while preserving the original HTTP error; a client abort does not leave an unhandled rejection. Redirects and infrastructure failures receive sanitized service-unavailable responses.

Before each mutation, the client reads the current session and, if authenticated, a fresh CSRF binding. It refreshes again after success, including identifier rotation. A failed refresh after a committed mutation does not falsely report that the mutation failed; the next action reacquires state before sending. No bearer tokens or persistent browser session storage are used.

The first synchronous document-head script removes verification/recovery fragments before Next's resource tags. Same-document hash navigation recaptures and clears a new proof, then emits a data-free event so only the matching account view re-arms explicit confirmation. A pending proof cannot cross verification/recovery purposes. A single-use closure retains the token in memory, then hands it to the mounted account screen. No GET, prefetch or render consumes it at the backend: only the explicit confirmation button issues a POST. Reloading the cleaned URL loses the token; the UI directs the user to reopen the original email or request a new link. Account pages are rendered dynamically with no-store and no-referrer. Fonts, styles and scripts are local, with no third-party assets or analytics.

Next/React resource hints are hoisted above normal head children. `TokenSafeHead` preserves Next's generated head through server-side static serialization and emits it after a trusted static capture-script prefix, so the capture remains physically first in the actual response. The rendered-document regression must stay enabled when upgrading these frameworks. Navigating away from a proof page discards its in-memory proof; verification and recovery never share a retained proof. Form cooldowns/notices reset when the view changes so a successful registration does not prevent sign-in.

## Verification and limits

```powershell
node --test tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs
node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit
```

The actual Next-navigation and rendered-head regressions are explicit subtests in the P5 integration journey. Its wrapper builds the real application and provides the origin:

```powershell
npm run test:p5:integration
```

Those two checks use the real rendered Next app; the navigation case controls account transport and is explicitly separate from real-backend acceptance. They no longer silently skip in the fast client suite: that file contains only pure checks, while P5 always registers the browser subtests. The original writer's14-check result, strict TypeScript exit0 and production build remain historical evidence; see the [five-check closure record](../../work-log/2026-10-30-root-five-historical-checks.md) for the current execution.

Focused tests verify method/path/query/body boundaries, trusted destination configuration, header/cookie forwarding, sanitized failures, synchronous one-time token capture, fresh CSRF sequencing, Unicode counts and generic rate-limit handling. These checks do not substitute for the coordinator's real browser → proxy → Nest → PostgreSQL → captured-email journey and session-revocation proof.

Profile layout follows the supplied profile image's pale background, rounded top navigation, orange identity, white form surface and quiet blue-gray fields. A textual FoxMind wordmark and initials are used because no standalone approved fox/avatar assets exist. No global role, avatar upload, fake classroom home or extra settings are introduced. Responsive layout stacks names/actions at narrow widths, keeps 44+ px touch targets and visible keyboard focus, and announces status/errors and cooldowns accessibly.

## Accepted local P3 checkpoint

[Independent full verification](../../work-log/2026-10-17-p3-verify-final.md): actual API/Next builds0, real browser10PASS with SQL/captured mail/restart/reuse/expiry/revocation, live web16PASS, strict types0, owned resource cleanup0. Coordinator inspected settled320/375/1280px forms with visible keyboard focus. Earlier failures remain attributed. P4/P5 were outside that P3 proof; their later acceptance is recorded in the [main roadmap](../../implementation-roadmap.md). No production deployment is claimed.
