# Current main local startup for manual testing

- Agent / role: /root, coordinator.
- Session or task ID: /root; runtime session ID unavailable.
- Date: 2026-10-25, America/Buenos_Aires.
- Branch / worktree: canonical main.
- Starting commit: cb3fe10dcb9f27f7a0fdebe42fa2374ea4da2b76.
- Phase: operational local startup; no product-phase change.
- Status: completed.

## Request and scope

User requests running latest main locally for manual testing and receiving its URL. Reuse admitted persistent development infrastructure and existing configuration through the preserved launcher. No seed, restore, data migration, account creation, paid provider request, push or deployment.

## Preparation

Read roadmap, work-log protocol, canonical October 24 restart/stop and current visual delivery records, package scripts and public operational modules. Read-only explorer /root/worktree_cleanup_check consulted Engram and independently corroborated canonical main, no active Docker containers and the retained launcher procedure; coordinator persists attribution here. Explorer made no changes or service starts. Historical metadata commit 2a0b8f4 identifies a prior run, not current build: launcher imports canonical .build and starts canonical apps/web. Recovery SOURCE supplies existing AI configuration internally only; it does not supply product code.

Coordinator verified ready-only guard in clone.prepare, admission and lock requirements and no operation.lock. Its retained branch provisions existing owned containers, validates twelve migration histories and checks drift read-only; clone/restore/migrate branch is unreachable under retained-restart-only guard. No private configuration content was printed or manually inspected. Fresh canonical API and Next builds started; outcomes and readiness will follow observed results. Scope of verification is startup: sign-in renders, API readiness/database connection and anonymous authorization boundary, leaving services running for user testing.

## Handoff

Finish builds, run retained preview, confirm bounded health/browser smoke, record exact URL and supervisor identity. Historical feature verification is not a fresh startup or authenticated acceptance claim.

## Observed startup and explicit scope extension

Live GitHub main readback matched cb3fe10. Fresh `npm run api:build` and `npm run web:build` exited 0; inherited Next external-lockfile warning only. Initial preview exited 1 at prepare-clone; diagnostic isolated retained-infrastructure. Docker had no containers at all, but the owned network and three persistent main volumes remained. Coordinator's ignored recreate-retained-20261025.mjs validated admission, ready state, ownership labels, missing exact containers and existing pinned images, then recreated only four support containers using existing definitions, read-only configuration binds and original volumes. No volume/configuration regeneration or restore. All four services became ready, scanner and mail healthy.

Second preview failed the migration gate: retained database had twelve migrations while main requires fourteen. Coordinator asked for explicit backup/schema-update authorization because retained mutation was outside the initial startup plan. User answered "Sí, respaldar y actualizar la base local". That authorization supersedes only the initial no-data-migration scope for these two pending migrations.

Ignored upgrade-retained-20261025.mjs locked the operation, validated admission and existing twelve history entries, recorded existing business-table counts, produced a custom-format backup and validated it with pg_restore --list before applying migrations. Backup: .test-artifacts/main-gemini-20261024/before-main14-1792975183205.dump (ignored/private; not published). Applied only 202610250001_activity_topics and 202610250002_activity_ai via the existing migration helper. Fourteen history/checksum entries and read-only schema drift 0 passed; all old history entries and business-table counts unchanged; topic backfill count matched activities with a topic. No seed/restore/account creation. Ignored restart verifier updated to accept current fourteen migrations and validate historical subsets correctly, retaining exact Git/newline checksum safeguards.

Final canonical preview in exec session93468, supervisor PID22604, reports product commit cb3fe10, web http://127.0.0.1:52171 and inbox http://127.0.0.1:52169. API readiness http://127.0.0.1:52170/api/v1/health/ready returns 200; sign-in and inbox readyz return 200. Web anonymous classrooms returns 401. Initial Home probe without required timeZone returned 400 (input validation, not an availability failure); corrected query is recorded separately below after observation. Existing Gemini configuration loads internally; no generation request was made by verification.

Ego-browser Space1, p1, "FoxMind main local 2026-10-25 restart": live sign-in snapshot confirms current FoxMind branding, heading and email/password controls. No login, account edits, full feature regression or screenshot acceptance claimed. Space kept for user testing. Product files unchanged; `git diff --check` passed. Local documentary closure only, no push/deployment.

Current handoff: user can test existing accounts at http://127.0.0.1:52171/sign-in, captured email at http://127.0.0.1:52169. Services remain running. Enter/SIGTERM to the verified preview supervisor stops only API/Next; infrastructure and all persistent data remain. Future restarts use the same canonical preview launcher with fourteen-migration gate and current builds. No unfinished startup work remains.

Corrected anonymous Home query with timeZone=America/Argentina/Buenos_Aires returned 401, confirming current web-to-API authorization boundary. Ego finish keep p1 completed exit0. No authenticated data was accessed during these HTTP/browser smoke checks.

## User-requested test login account

User subsequently requested an account for signing in. Coordinator created one new synthetic account through the running web registration API (202), fetched only its addressed verification email through a recipient-filtered local Mailpit search, explicitly confirmed the proof (200), and verified login/session authenticated=true. The diagnostic session was then logged out (204). Existing accounts were not modified; no classroom or global role was assigned. Credentials were delivered directly to the requesting user and are excluded from this record; verification/session tokens were never printed or saved. This is a later authorized account-creation action, separate from startup smoke. No product change, provider request or push.
