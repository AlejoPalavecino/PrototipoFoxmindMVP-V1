# Stop local FoxMind after manual testing

- Agent/role: /root coordinator; host session ID unavailable.
- Date: 2026-10-24.
- Status: completed.
- Scope: user asks to close FoxMind and leave everything as it is. Graceful app shutdown followed by stopping its four identified support containers; retain all current data, accounts, volumes, keys, configuration, backups and artifacts. No cleanup, reset, restore, push or deployment.

Before stopping, coordinator observed main with three local documentary commits ahead, supervisor PID33872/Next42508 matching the retained launcher and four running main containers. Target identities: scanner3435ece06a38, S33552811f3daf, mail2cf5036ff301, DB83cfa509ebc4. No unrelated processes or Docker Desktop are targets. Do not compare account counts to the older startup baseline or undo intervening user changes. Initial pending checkpoint, resolved below: metadata-only preservation snapshot, shutdown, exact container stops and final absence/preservation checks.

## Observed shutdown and preservation

Read-only explorer /root/local_restart_explore consulted Engram current_project/context/search and independently verified the live supervisor/child/ports/container metadata; it did not stop anything or inspect secrets. Coordinator snapshotted40retained volume names and four protected file size/mtime pairs without reading contents (original key, main private configuration, admitted/state markers).

Enter delivery to exec74235 failed because stdin was closed; no stop action occurred from that failed request. After rechecking identities, coordinator terminated only the verified Next PID42508. The supervisor's child-exit handler then ran normal API cleanup: exec74235 exited0, printed Original key file unchanged=true, and operation.lock is absent. No stale lock removal or forced filesystem cleanup was needed. Coordinator's checked fallback would have targeted only PID33872 if it remained; observed supervisor exit0 and final cleanup prove the normal shutdown completed.

Only afterward docker stop --timeout30 targeted the four exact main IDs, exit0. All four retained containers report exited/exitCode0. Final docker ps empty; no matching FoxMind Node process or listener on its seven known app/support ports. node .test-artifacts/main-gemini-20261024/stop-state.mjs after exited0, confirming all40volume names and4protected-file metadata pairs unchanged. No database/object rows were queried or reverted; normal database/container shutdown retains the latest manual-test data. Historical stopped container backups remain preserved.

No product changes/tests were required for stopping services. Local record and roadmap summary updated; documentary checks/commit follow, no push/deployment. Next exact action is a separately requested restart using the preserved canonical launcher. Current local URLs are unavailable while stopped.

Final independent explorer /root/local_restart_explore observed absent PIDs33872/42508 and seven listeners, all four exact containers Exited(0), named persistent volumes present and stop-state after exit0/40volumes/4files unchanged=true. It executed only metadata checks and no runtime or data mutation. Coordinator observed git diff --check passing and the newly linked shutdown record exists before local documentary commit. No deployment or remote operation.
