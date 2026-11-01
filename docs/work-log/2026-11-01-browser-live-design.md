# Browser-connected live Foxy validation design

- Agent / role: /root/browser_design / architect; runtime session ID unavailable.
- Date: 2026-11-01; branch codex/foxy-ai; worktree C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting checkpoint: f49cfc0; scope: browser connected to isolated real backend before main integration.
- Status: completed (design only). ESTADO_DISENO: LISTO_PARA_TDD_RED.

## Evidence and contract

The [real-provider record](2026-11-01-real-provider-validation.md) establishes the core-runtime journey, not HTTP/browser. Existing scripts/activity-ai-real-live.mjs supplies the correct topology: withP4Services plus withMailpit, compiled Nest application, production Next bound to loopback and FOXMIND_API_ORIGIN. scripts/activity-ai-live-seed.mjs already registers, logs in and verifies accounts over real identity HTTP and Mailpit; do not replace authentication with request.id or use homeFixture users with not-a-login hashes.

Create scripts/foxy-browser-live.mjs (coordinator-assigned worker owns it) and at most one focused fixture helper, each <=200 lines. CLI contract:

`node scripts/foxy-browser-live.mjs --live-authorized --attempt-id=<fresh UUID>`

A separate explicit `--synthetic` mode may substitute providers for preflight, mutually exclusive with live; it must not load the real key file. Require an exclusive durable receipt before parsing config or starting services. Record stages and fixed safe identifiers only; mark each modality DISPATCHING and sync before invoking generate. Per-process wrapper allows at most one countTokens and one generate for each of IMAGE and DIAGRAM; repeat calls fail before SDK. A reused UUID never starts resources or calls Gemini. No retry/fallback with a new UUID without coordinator authorization.

## Isolation and composition

1. Build current API and Next before live startup, using system environment whitelist only; no AI secret in build output/environment. Preserve the pre-existing generated next-env.d.ts modification.
2. Live runner reads only the explicitly authorized .env.foxy-test, into an allowlisted object in memory (not process-global environment); validate readConfiguration and profile consistency. Never emit config, key, cookie, token, SDK/raw process error or credential-bearing URL. There is no need to access retained environment files or their paths.
3. withP4Services({databaseName:'foxy_browser_test'}) and withMailpit own all containers/network/volume/ports. Apply all current migrations to that new database. Do not reuse activity migrateOwned unchanged: it hardcodes a different DB and obsolete migration count14. Prisma status/diff or all migrations plus explicit history count from current directory is appropriate.
4. Choose random loopback web/API ports. Build ApiConfiguration from identityTestEnvironment(), provider allowlist, ephemeral P4 infrastructure, Mailpit SMTP, FILES_ENABLED=1, CLASSROOMS_ENABLED=1, random signing/delivery keys, APP_ORIGIN=webOrigin. Keep AI rates, budgets, caps and private quota from validated config intact. Configure only new synthetic classroom storage quota to20MiB.
5. Construct real Gemini adapters with validated models/profile/caps. createApplication(configuration,{foxy:{textProvider:null,visualProviders:countedAdapters}}) installs real identity/classroom/file/Foxy transports and worker lifecycle. Text is intentionally disabled in this validation fixture so chat cannot add calls. Seed must enqueue no curriculum/activity/student/grading AI jobs; assert all AI job tables and usage empty before browser activity. No authentication override.
6. Start current Next production with only system whitelist, NODE_ENV=production, NEXT_TELEMETRY_DISABLED=1 and FOXMIND_API_ORIGIN. Poll /sign-in to readiness with a bounded deadline. API key stays in parent API memory, never in Next or browser.

## Synthetic identities and data

Use real POST /auth/register, /auth/login, Mailpit verification and /auth/email-verification/confirm. Generate synthetic passwords in memory; if the browser needs them, write only to a dedicated ignored fixture, never output them or commit them. Use unique example.test addresses.

Create two verified teachers and two owned classrooms (one per modality), plus one verified student enrolled in both. Two teachers preserve the configured10MiB private reservation budget. Seed the minimal classroom through real draft/create, plan PDF upload, PATCH draft, publish, student code-preview/confirm endpoints, adapting the existing seed helper with unique emails. Do not call AI extraction while creating the classroom. Store unit/topic IDs and class names in ignored browser-fixture.json; no production identities or records. Existing helper adds a library document; omit that for this fixture so an empty initial Library is observable.

Browser sees ordinary login and all calls use real session cookie, Origin and CSRF. Account switching must use real logout/login, or isolated cookie contexts proven by ego; do not assume Spaces separate cookies. Passwords are synthetic fixture inputs, not user secrets. /foxy-ai should show both visual capabilities, text disabled and real classroom destination data.

## Browser DoT

Within a dedicated ego Space (skill ego-browser), inspect the actual rendered UI and use real clicks/forms. Do not mutate React state or mock fetch through evaluation.

For IMAGE teacher then DIAGRAM teacher: login, open /foxy-ai, create General conversation, enter a short synthetic water-cycle prompt, choose kind and generate once. Wait via UI refresh/poll, observe READY and loaded image naturalWidth/naturalHeight>0. Capture image and schema preview; use actual meaningful generated content, not a1px placeholder. Choose real classroom, unit and topic, title, Prepare, wait READY, open private publication preview, Review, check explicit consent, Publish. Observe success, reload and verify durable result. Record actual POST/GET statuses and fixed job identifiers without tokens/bodies.

Before confirmation, student Library must not contain the unpublished material; real student HTTP client from seed may verify 403 to the known P4 file as supporting evidence while teacher stays logged in. After both publications, log out and login student in browser, open /mis-aulas?aula=<roomId>, choose Library, find each material in selected unit/topic and open it. Verify image load or download response; compare digest/bytes server-side to the authorized source. Student /foxy-ai must deny teacher feature.

Supporting database assertions: one job/dispatch per kind, expected budget reservation settled, distinct private/P4 keys, one material after confirm replay, zero materials before confirm, real scan proofs, real owner authorization. Browser-only proof and database proof must be reported separately.

## Cleanup, risks and handoff

Keep session alive until explicit owned stop-file or SIGINT; record safe origin, fixture path and stop path only. Shutdown Next, then Nest worker/custody lifecycle, then database/SMTP/storage using nested finally/allSettled so one close failure cannot skip others. Close ego Space after successful QA. Verify ownership labels before stopping containers; remove only own synthetic credential file/fixtures and never retained projects. Automatic deletion rejection must be reported if encountered.

Failure after dispatch is billable/ambiguous: preserve the durable receipt and safe job error_code, do not regenerate automatically. A UI bug is fixed and verified offline first. A new paid attempt requires the coordinator to establish authorization. A test that uses raw runtime services or mock sessions cannot be reported as browser/backend integration. This plan requires no product contract or schema migration and does not authorize main merge, remote publication or deployment.

## Verification performed by architect

Read existing startup, real identity seeding, configuration, file and Foxy/publication paths; sent exact topology and pitfalls to worker. No provider call, key read, Docker mutation or browser interaction. Document structural/link check is recorded separately by coordinator if run.