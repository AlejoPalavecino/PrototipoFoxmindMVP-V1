# Gemini real local setup — ready for manual testing

- Agent / role: /root coordinator
- Task ID: /root
- Date: 2026-10-24
- Branch / worktree: codex/classroom-gemini; isolated classroom-gemini worktree
- Starting commit: f871cb45718bc691f2d07cd97ab0ea98d771dfa5
- Status: completed (setup and startup; manual provider smoke pending)

## Request and scope

User requested help configuring Gemini in the separate worktree and starting the platform for the real flow, with API key entry outside chat. Prepare ignored local files and a new disposable development session; do not touch retained databases or unrelated containers. No paid model request is made automatically before the user uploads a plan.

## Preparation

Read roadmap, work-record protocol, Gemini guide, public runtime helpers and SDK configuration. Explorer independently observed clean branch/HEAD and unrelated Docker resources; its attributed report is separate. Agent-attributed Engram writes remain prohibited by the unregistered host hook.

Official Google pages were consulted via ego Space5 on2026-10-24: [model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) confirms stable PDF input/structured outputs and65.536output-token limit; [pricing](https://ai.google.dev/gemini-api/docs/pricing) Standard paid rates are0.30USD input and2.50USD output including thinking per million tokens. Local initial quotas:5peractor,10global,1USDdaily application budget. These controls do not change Google billing settings.

Private key is isolated in ignored .env.gemini.key.local; public AI settings in ignored .env.gemini.runtime.local. Created with exclusive-write semantics, preserving existing files. No secret values read or logged by the coordinator. The backend process may load the private file internally and exposes only sanitized readiness.

## Handoff

First unfinished actions: fresh API/Next builds, owned real-provider runtime, user saves API key directly in the private file, verify readiness and provide app/inbox/stop instructions. Existing synthetic harness must not be mislabeled as real Gemini. No remote operation authorized.

## Observed setup checkpoint

- Initial npm run api:build failed with Prisma generation exit unavailable. A direct Prisma generate probe using the unchanged 30000ms deadline passed (status0, elapsed14403ms); the unchanged full API build then passed both generation and TypeScript. Root cause of the first unavailable exit remains unproven.
- npm run web:build passed: Next16.4.2 production compilation, type checks and static generation.
- Reviewed the ignored operational launcher from /root/gemini_real_runner: no synthetic provider override, private key loaded internally, AI variables excluded from Next, owned services and sanitized metadata only. node --check had passed in the worker report.
- Started launcher in interactive exec session91683. Observed waiting for private AI_API_KEY. No key content read by coordinator, no owned services started yet, no provider request sent. User asked via async status question whether the private file was saved; no reply at checkpoint.
- Platform URL, migration/drift proof and Google acceptance are still pending. The process stays waiting and will provision only its owned disposable runtime after a nonempty key is saved.
- Rollback boundary: the two ignored local env files, ignored gemini-real-20261024 launcher/artifacts and these three setup work records; no production source changed. No remote publication.

## Ready for manual real-provider test

- User confirmed the private key was saved. The running backend internally reported key availability true; coordinator never read the private file or key.
- Owned PostgreSQL/storage/scanner ready; Prisma migrate deploy PASS and migrate diff PASS. The isolated application uses normal createApplication with Gemini Developer API, model gemini-3.5-flash-lite, syntheticProvider false.
- Platform http://127.0.0.1:60092; owned inbox http://127.0.0.1:52602; launcher PID 33840, interactive exec session91683. Both pages opened in dedicated ego Space5, p1 sign-in and p2 empty Mailpit, snapshots observed; handOff returned control to user. No screenshot/visual acceptance claimed.
- Generated synthetic PDF: .test-artifacts/gemini-real-20261024/plan-sintetico.pdf. User registers a disposable account, verifies via this inbox, creates a draft and uploads the plan to initiate the paid provider request.
- Setup status: completed. Real Gemini extraction/Google key acceptance remains untested until user uploads; startup does not send a Google request. No account or aula created automatically.
- Runtime intentionally remains running for requested testing. Enter in launcher session91683 or Ctrl+C requests owned cleanup. Actual cleanup is pending, not claimed. Session data are disposable and lost on shutdown; unrelated resources remain untouched.
- First next action: user completes registration/verification/upload, checks units/topics, edits and explicitly confirms classroom creation. If user requests assistance, resume Space5 only with their authorization; it is handed off.
- No production source changed; no functional regression tests rerun for this operational-only setup. Fresh API and Next builds, launcher syntax check, migration/drift and actual browser readiness are proportionate checks. Private env files and local harness are ignored. No push or PR.

## Attributed final review

- Reviewer / task: /root/gemini_setup_review; persisted by /root coordinator on2026-10-24.
- Outcome: APPROVED / LGTM_SIN_HALLAZGOS. Read-only inspection of three setup work records and ignored preview.mjs. git diff --cached --name-status confirmed only records; git diff --cached --check passed; git check-ignore confirmed launcher ignored after scoped sandbox elevation.
- No reviewer writes, services, tests, browser interaction or Google calls. Build/readiness evidence attributed to coordinator. No claim of Google acceptance, actual extraction or completed cleanup. Next user action remains registration, verification and plan upload, followed by observed results and eventual owned cleanup.
- Git check-ignore independently confirmed both private local env filenames and launcher ignored; no secret content read. Local documentation commit contains this setup record plus explorer and runner records only.
