# Main preview with real Gemini and preserved data — ready for user testing

- Agent / role / task: /root / coordinator
- Date: 2026-10-24
- Worktree / branch: integrate-classroom-gemini / main
- Starting commit: f1e5964
- Feature: [classroom AI](../../odd/tasks/classroom-ai-extraction.md) and [Agenda](../../odd/tasks/agenda.md)
- Status: completed

## User request and chosen data boundary

User requests platform from main with real Gemini, preserving data and private API key, with URL for joint Agenda/AI testing. After concrete topology review, user explicitly chose cloning current accounts/classrooms/files into an independent environment while preserving both previews. Source Gemini60061 and inbox57642 are alive; source DB classroom_ai_dev currently has2users/4classrooms/4drafts and ten applied migrations. Prior Agenda63122 does not respond; its retained resources remain untouched, without combining unrelated datasets.

## Preparation and safety decisions

Read current roadmap, work-record protocol, Gemini guide, setup/mobile/integration continuity and public launchers. main clean atf1e5964. Explorer /root/main_gemini_runtime_explore read Engram current_project/context/search under prototipofoxmindmvp-v1; sandbox Docker/Git status failed, while coordinator elevated Docker/status and readiness passed. No memory writes because host identity remains unregistered.

Architect /root/main_gemini_runtime_design identified that old preview identity/outbox/classroom keys exist only in process memory, and stopping it deletes its owned services. It must remain running. Two differently keyed APIs must not share DB/S3 because background delivery/cleanup workers would interfere. Source invitations0/livebackgroundjobs0/activeAI0 allow cloning without live encrypted work; historical invitation0 is necessary because delivery encryption is also used when listing old invitations. Existing account-action-control windows must expire before admitting work under new persistent HMAC keys; source rows are preserved, not reset or deleted.

Launcher owner /root/main_gemini_clone_launcher writes only ignored operational scripts under .test-artifacts/main-gemini-20261024. Plan: private dump plus all-object copy/verification, new persistent DB/S3/mail volumes and independent scanner, stable private configuration, original Google key loaded internally without copying/printing. Compare original row digests and object hashes; apply only missing Agenda migrations to clone and verify12history/checksums/diff0. No source DB/files/keys modified, no Google request until manual upload, no remote operation. Independent review precedes provisioning.

## Handoff

Initial pending work was completed below. Next exact action: user manual testing of Agenda and AI at main52171; no execution blocker remains. Existing main API/Next artifacts are from the verified combined product tree; no product source changes required.

## Observed operation, failures and recovery

Static review approved six ignored scripts; independent syntax6/6PASS. Initial clone stopped before private config/resources at strict migration checksum: only classroom_ai had CRLF checkout bytes versus LF historical bytes. Root proved canonical Git blob SHA exactly matches retained checksum and normalized SQL is identical, then wrote those canonical bytes only to the working file. No semantic Git diff or DB history change; strict10history passed. A first shell-quoted diagnostic failed syntax before writes; file-based helper passed.

Owned four persistent containers/three named volumes were created. Scanner first failed on CRLF in copied public config; root normalized only owned copies to canonical LF, restarted only the new scanner within original readiness budget, and worker fixed generator. No source service was stopped. Later image healthcheck used localhost/IPv6 against IPv4-only Clam: actual127.0.0.1PING returnedPONG; root patched only the owned container health script and generator now usesIPv4. Healthcheck then passed, without restarting main.

During clone, all Docker services were interrupted together, exit255; the tool process session disappeared. Old --rm DB/S3/scanner containers and launcher no longer existed; no root command removed them. New persistent volumes survived. State remained preparing with a dead lock PID. Recovery verified PID absent before unlinking only that lock, restarted only new owned containers, and compared all37business tables and4objects against private source manifests. They were already exact with12migrations: no restore or overwrite was needed. All4 object backup entries had complete local hashes (two unique byte-identical blobs), original10history rows/checksums unchanged, drift0, first-admission gates0. Marked clone ready only after these checks.

Main API/Next started in exec session32474, PID1708, origin http://127.0.0.1:52171 and inbox http://127.0.0.1:52169. Metadata confirms real Gemini Developer API, modelgemini-3.5-flash-lite, keyConfiguredtrue, syntheticProviderfalse. Key loaded solely from original classroom-gemini private file, no copy/value output. Frontend inherits only OS allowlist and backend origin. HTTP sign-in/Agenda/mis-aulas200; anonymous classroom/Agenda API401; inboxreadyz200. Counts initially2users/4classrooms/4drafts, history12. No automatic Google requests, new account seeds, auth changes or product code changes. Main product tree still equals previously verified e8df4116; full174tests/builds were not repeated for operational scripts.

To honor preserving both previews after the external interruption, root additionally recovered the original snapshot into a separate logical DB and bucket on the persistent infrastructure. CLI recover-source-data exited0:37tables exact,4objects exact,history10. Original Mailpit retained volume restarted with validated image/owner and effective new ports. Source25d20c6 API/Next now runs in session98295/PID15848 at http://127.0.0.1:60061, inbox http://127.0.0.1:49493. Source keys are stable/private/new after verified no encrypted work/invitations or active account-control windows; Google key remains the original file. Main and original never share a queue or bucket, and subsequent manual changes are independent. No other historical environment was migrated or combined.

## Attributed records and restart handoff

[Explorer](2026-10-24-main-gemini-runtime-explore.md), [architecture](2026-10-24-main-gemini-runtime-design.md), [launcher owner](2026-10-24-main-gemini-runtime-launcher.md), [reviewer](2026-10-24-main-gemini-runtime-review.md), [original recovery owner](2026-10-24-main-gemini-runtime-recover-source.md). Their code/static checks are not presented as operating services or reading private data. Independent final readiness report follows separately.

From this main worktree, restart main with node .test-artifacts/main-gemini-20261024/preview.mjs, then source with node .test-artifacts/main-gemini-20261024/recovered-source-preview.mjs. Stop only the relevant app supervisor with Enter/SIGTERM; scripts close API/Next and retain DB/S3/mail volumes. Keep ignored operational directory/private configuration/backups and original key file: they are local restart state, intentionally outside Git. Main must start first if physical infrastructure is stopped. No backup restore runs on admitted restarts. Current apps are left running for the user; do not run a second supervisor for the same ports. No push, PR or deployment.

## Final independent readiness and delivery

[Independent31-check readiness](2026-10-24-main-gemini-runtime-verify.md) passed exit0. Both apps/inboxes respond, expected anonymous API401 remains, strict12/10migration checks pass, main scanner/mail healthy and persistent resources remain. No new login/visual/paid E2E proof claimed. This request changes only versioned operational records/roadmap; all launchers/private config/backups stay ignored. Local documentation commit follows after structural/whitespace checks, without inventing its own hash. No push/PR/deployment. Current main URL http://127.0.0.1:52171, inbox http://127.0.0.1:52169; recovered original http://127.0.0.1:60061, inbox http://127.0.0.1:49493. All apps remain running.
