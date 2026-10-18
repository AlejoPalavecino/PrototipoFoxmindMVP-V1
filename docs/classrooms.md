# Classrooms — isolated P5 implementation

> Historical isolated checkpoint below is preserved. The later authorized P3/P4/P5 integration is now independently accepted; see [current integration](p5-integration.md). Current main publication is tracked there. The old pending candidate review does not override the current off/global native mode or authorize future phases.


P5 is developed on `codex/p5-classrooms`, based on the exact P4 checkpoint `767174bc61f2fc3a80c3937c4a0519b1b90523e0`. P3/P4 source, their working checkouts and previous migrations are untouched. This worktree adds the classrooms module, reusable React UI, one forward migration and owned runtime/test tooling. [Tasks](../odd/tasks/p5-classrooms.md); [coordinator record](work-log/2026-10-16-id-unavailable-p5-classrooms.md).

## Local commands

Use the root's Node24 dependency lock with `npm ci`. No inherited environment file or development database is needed for P5 tests. `node scripts/test-p5.mjs` generates/builds the API afresh, strictly typechecks the UI, bundles the isolated host, runs the focused tests, then runs actual PostgreSQL/S3/ClamAV/captured-SMTP journeys. `--unit-only` explicitly omits the final real-service suite; it still starts owned disposable SQL containers for persistence cases.

`node scripts/build-api.mjs`, then `node scripts/p5-preview.mjs` opens a local fixture at `http://127.0.0.1:3005`. The host prints its random captured inbox URL. Open that address in a browser; the strip above the application changes synthetic test accounts. Each test account can teach and study in different classrooms; these controls select an account, not a global product role.

The preview requires the inherited pinned SeaweedFS/ClamAV images and PostgreSQL17.10/Mailpit1.31.6 images locally. Launch fails rather than silently replacing real services with mocks. It owns random `foxmind-p5-real-*` / `foxmind-p5-mail-*` containers, isolated network and random loopback ports. PostgreSQL/object bytes are disposable fixture data; restarting the preview starts a new fixture, not a persistent development account. No real user data belongs in it. Test service instances demonstrate persisted drafts/reentry on SQL; the preview's disposable lifecycle does not claim production persistence setup.

**Run the preview in an interactive terminal and press Enter to stop and clean up.** For Codex exec use `tty:true`; plain-pipe stdin is closed by this tool host and cannot receive Enter. This Windows tool host can forcefully terminate on Ctrl+C before JavaScript cleanup executes. Interrupted runs required ownership-verified manual cleanup, retained in the record. Normal interactive Enter shutdown subsequently reported inbox/S3/scanner/SQL/network cleanup0 and exit0. Do not rely on Ctrl+C as proof of cleanup. Ownership labels, not a broad name match, govern removal; never remove existing P3/P4 containers or volumes.

## Application integration ports

`ClassroomService` accepts an existing `FileDatabase`, required trusted `authenticate(tx, request, write)` callback, the inherited P4 `FileStore`, a configured bigint classroom quota, two durable 32-byte keys (`signingKey`, `deliveryKey`) and a trusted exact `webOrigin`. Authentication must validate actual P3 session/Origin/CSRF behavior; it runs again under the user lock and must not increment admission counters on each repeat. Session revocation must take the same user lock. No production identity fallback exists. Verified-account state is enforced independently on every classroom read/mutation.

Classroom mutations serialize user → classroom → draft/enrollment/invitation. Publication creates an invisible destination, locks/rechecks source revision, sets the source publication relationship and calls P4's existing `promoteDraftPlan` in that transaction before linking version1 and initial curriculum. Failed file/quota/curriculum operations roll everything back. Repeated publication returns the existing classroom; it does not duplicate a plan or emit another plaintext code. Unused confirmed draft files remain retained under P4 policy.

Install `createClassroomsHandler(service, {admit})` explicitly, or register `ClassroomsModule` providers and install the handler in the approved host. `admit` is mandatory and runs once per HTTP request before body work. The module does not register routes in P3. Adapt file-authentication denials to P4's `FileError` when bridging its port, rather than throwing a different error class that would be sanitized as503. The fixture bridge tests this mapping; it is not final P3 integration. Install the inherited FilesModule/cleanup lifecycle separately when doing real integration.

The reusable `apps/classrooms-ui/ClassroomsApp.tsx` receives a `ClassroomClient` and display name. `createClassroomClient({csrfToken})` consumes the host's actual session/CSRF source and same-origin endpoints. It does not implement login or account verification. `apps/p5-preview` is a loopback-only test host, not the final Next.js shell. Import the source components/styles into the accepted P3 shell during chained integration; source `use client` boundaries remain present. Vite's fixture bundle warns that those directives have no standalone-bundle meaning, which does not verify a Next.js build.

## HTTP surface

All responses are private/no-store. Mutations require JSON; unknown/forged fields, unsupported methods and query strings are rejected. Bounded bodies/timeouts/concurrency guard the optional handler. Server-side authorization remains required even when UI controls are hidden/disabled.

| Route | Operation |
|---|---|
| GET `/classrooms` | Separate `teach` / `study` lists, current memberships only |
| GET/POST `/classrooms/drafts` | List private unfinished drafts / start a draft |
| GET/PATCH `/classrooms/drafts/:id` | Owner-only resume / compare revision and save bounded payload |
| POST `/classrooms/drafts/:id/publish` | Required validation, atomic safe-plan promotion and classroom publication |
| POST `/classrooms/codes/preview` | Minimal approved classroom/teacher metadata and actor-bound confirmation |
| POST `/classrooms/codes/confirm` | Explicit first enrollment; recheck live code/archive/membership |
| GET `/classrooms/invitations` | Current verified recipient's actionable invitations |
| POST `/classrooms/invitations/:id/accept` | Explicit recipient-only enrollment/reentry |
| GET `/classrooms/:id` | Current authorized classroom details, initial units/topics and plan versions |
| PATCH `/classrooms/:id/settings` | Teacher edits name/subject/division/year with revision; timezone immutable |
| POST `/classrooms/:id/archive` | Teacher archive/reactivate with revision; no permanent delete |
| POST `/classrooms/:id/code` | Teacher rotates code; previous code/previews invalidated |
| GET `/classrooms/:id/members` | Teacher roster; students receive first/last names only |
| GET `/classrooms/:id/history` | Teacher-only former-student membership history |
| GET `/classrooms/:id/members/:studentId` | Teacher-only existing submitted-attempt/grade summary, including former students |
| POST `/classrooms/:id/leave` | Close own active period, revoke access, retain history |
| POST `/classrooms/:id/members/:studentId/remove` | Teacher closes active period with attributed reason |
| GET/POST `/classrooms/:id/invitations` | Teacher lifecycle/delivery list / issue or renew invitation |
| POST `/classrooms/:id/invitations/:invitationId/revoke` | Teacher revokes pending invitation |

File upload/status/download uses the existing P4 `/files` interface. UUIDs and client roles never authorize access. Academic authoring, grade publication/correction, plan maintenance after initial creation and P7 eligibility consumption remain their existing later phase scope.

## Durable lifecycle and technical bounds

Unfinished drafts have no expiry. Save is a full bounded payload replacement with decimal revision; stale writes fail409. The wizard debounces acknowledged SQL autosave and flushes on step/exit/publication. A lost acknowledgment/conflict does not silently overwrite another saved revision. Recover from Mis Aulas. Publication requires all basic fields, an approved cover, IANA timezone, a ready own draft plan and at least one unit with a topic. Limits:100units,100topics per unit,500topics total; scalar text limits follow the spec; calendar year1–9999. Incomplete timezone text can be saved during editing; publication rejects invalid/fixed numeric UTC-offset input. P4's independent limits/scanning/quota remain unchanged.

Codes use144bits of random entropy and are stored only as digests. A teacher receives plaintext once upon publication/rotation; recovering a lost code requires rotation. Five-minute HMAC confirmations are actor/code/expiry bound and are rechecked after the classroom lock. A previous enrollment, even closed, forbids code reentry. Enrollment is unique per classroom/student; membership periods append, and closing one never removes attempts/grades/conversations. Membership transitions also queue idempotently keyed `p5.membership` jobs for later module consumption; this work does not claim a P7 consumer already exists.

Invitations last seven days and remain one pending row per classroom/normalized mailbox. Renewing after at least60seconds increments the generation; original mailbox spelling is retained inside authenticated encryption, returned only to the classroom teacher and reused by UI resend. Departures revoke older pending invitations; reentry requires a newly issued invitation identity. Acceptance also rejects any invitation not newer than the last departure, and cannot race past archive/removal/code rotation under the classroom lock. No enrollment happens from email issuance, registration or verification alone.

The P5 mutation budget is120successful admitted operations per verified user per minute (shared database controls under a P5 action namespace); P3's own security/admission configuration remains unchanged. Lists are permission scoped and do not silently truncate at500records. Classrooms and drafts are private. Every read rechecks current access; archive preserves reads but denies all writes except teacher reactivation. Teacher and timezone are additionally immutable in the P5 forward SQL guard.

`InvitationDeliveryWorker` uses AES-256-GCM envelopes in existing durable background jobs, with invitation/generation AAD and per-generation deduplication. It checks current invitation/generation/expiry/archive before claim, uses recoverable leases, capped retries and sanitized errors. No SMTP I/O occurs inside a database transaction. The supplied sender is restricted to an actual loopback captured inbox; production delivery remains a separately configured integrating adapter. Periodic dispatch and shutdown are opt-in Nest lifecycle providers. Retries are at-least-once: SMTP acceptance followed by a lost database acknowledgment may duplicate an email. A message already in flight cannot be recalled after revocation; its non-bearer invitation link still requires current verified recipient acceptance and never restores access by itself.

Keep both keys durable across application restarts and out of logs. This version intentionally fails closed on unreadable envelopes and does not implement key rotation or invent a production quota/provider. Production hosting remains outside scope.

## Evidence and deferred acceptance

Focused test results, actual runtime/browser checks, retained initial failures and review disposition are recorded in the [work record](work-log/2026-10-16-id-unavailable-p5-classrooms.md). Backend source tests use the freshly generated/compiled service; browser evidence uses actual fixture services and SMTP capture, with synthetic sessions clearly separated from accepted P3 behavior. Narrow views and selected axe checks are bounded observations, not exhaustive accessibility/performance acceptance.

Independent/native review must retain its actual disposition. This implementation does not inherit P4 approvals or another task's native consent. Chained integration is explicitly deferred by the user: accepted P3, then P4, then P5, with migration/dependency/session/CSRF/Next.js and full real user journeys verified on the resulting tree. Until then the full P5 phase remains in progress even when the isolated implementation is finished.
