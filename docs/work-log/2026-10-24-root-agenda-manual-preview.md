# Agenda — manual local preview

- Agent/task: /root, coordinator; registered session identity unavailable.
- Date: 2026-10-24.
- Branch/worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind.
- Starting commit: d1b117a44ca5d691b51b8a311cbcfcba34885885.
- Scope: user requests running the app from this worktree for manual Agenda testing before integration.
- Status: completed (startup and user handoff; preview intentionally remains running).

## Preparation and ownership

Read roadmap, work-record protocol, previous closure and isolated runtime source. Worktree initially clean. No source behavior changes, retained configuration or development data are needed. Launch a new owned disposable integration runtime with real API, Next production web, PostgreSQL, storage/scanner and captured email, held open explicitly until its stopfile is requested. Artifacts and synthetic credentials remain ignored under .test-artifacts/agenda-manual-preview.

Read-only explorer /root/agenda_preview_explore confirmed Docker client/server29.9.2, the real identity+classrooms integration contract, random owned resource labels and callback-scoped cleanup. The wrapper has no fixed callback lifetime; the automated runner's360s timeout is not used for manual startup. Explorer read Engram context/search, made no writes or file changes. Coordinator persists these attributed findings here. Retained P4 local configuration is not used.

## Verification and handoff

Pending fresh API build, preview readiness, synthetic sample setup and browser handoff. Existing final production web build is reused. No integration, push or deployment is authorized. Stop only this preview by creating its recorded stopfile; wrapper then closes its own processes and removes its own resources. The prior pixel-capture limitation is outside this startup task.

## Observed startup and handoff

- Initial standard node scripts/build-api.mjs exceeded its existing30s generation budget and reported unavailable. Direct Prisma generate then exited0 (1.59s generator stage); direct API TypeScript compilation exited0. No configured budget/source was changed. Final production web build from the previous verified closure was reused.
- First ignored launcher had an incorrect relative import after moving directory depth; it exited before resource creation. Fixed only the ignored launcher path, then started the owned manual runtime hidden using Start-Process.
- Runtime migrations deploy/drift both exit0. Ready origin: http://127.0.0.1:58411; process26456; two personal events (including a weekly class) and three actual academic deadlines across synthetic classrooms. No retained configuration/data was read or modified.
- Actual browser login through ego(lite) Space3 agenda-manual-2026-10-24 reached /agenda. Loaded page confirmed the weekly example, academic deadline and create-event action. Space finished once keeping p1 for the user's manual testing. No new screenshot claim.
- Synthetic access instructions are available only in ignored .test-artifacts/agenda-manual-preview/acceso.md; no password, tokens or private connection strings are recorded here.
- Runtime intentionally stays alive until .test-artifacts/agenda-manual-preview/stop is created. That is this invocation's stopfile; returning from its callback cleans its own resources. Closing the browser alone does not stop the server. No fixed360s test-runner deadline applies to this manual wrapper.
- No product tests were added for this reversible startup task. Verification used actual migration/readiness and the real signed-in browser page. Main was not integrated or published.

Next exact action: user tests the agenda at the URL above. To stop later, create the exact stopfile above and observe owned cleanup; do not terminate unrelated Docker resources. Any user feedback or main integration is a separate instruction.
