# Canonical local restart preserving retained data

- Agent / role: /root coordinator.
- Session/task ID: host session ID unavailable; local-restart.
- Date: 2026-10-24.
- Branch/worktree: canonical main, observed 2a0b8f4 after concurrent documentary closure (preserved).
- Status: completed; main application and its four support containers left running.
- Scope: user requests running local FoxMind for manual testing, conserving existing data and without deployment.

## Preparation and attributed exploration

Read roadmap, work-record protocol from preceding turn, main Gemini runtime/shutdown/readiness records and public operational scripts. Explorer /root/local_restart_explore consulted Engram current_project/context/search, Git and Docker metadata and public scripts only. It confirmed main's four persistent containers are stopped, the DB/S3/mail volumes exist, and the launcher is preserved under the sibling recovery directory rather than canonical .test-artifacts. Its findings are persisted here by coordinator; it did not start services or inspect private content. Engram write attempted by explorer was blocked by unregistered host session.

## Operational plan

Copy existing operational scripts and required state/configuration opaquely into ignored canonical .test-artifacts/main-gemini-20261024; preserve recovery originals. Adjust only the public SOURCE path to the preserved Gemini source location for internal key loading. Use canonical product/build artifacts. Existing stopped S3/scanner containers still bind retired worktree paths; preserve them under backup names and replace only their runtime containers with canonical read-only binds and identical persistent volume/network/port definitions, after identity checks. Database and mail containers/volumes remain the existing ones. No clone, seed, restore, migration application, account or file changes. Startup must require ready/admitted retained state, strict migration history and read-only drift checks. Existing credentials load only inside the local process and never enter records/output.

Use ego-browser and the verification skill for a bounded startup flow: retained infrastructure -> API/database readiness -> sign-in page and unauthorized API boundaries -> user manual testing. No paid AI generation or authenticated data edits required for startup verification. Services remain running on completion. No remote publication or deployment is requested.

## Verification and handoff

Initial pending checkpoint (superseded by the completed observations below): operational relocation review, restart, read-only preservation/readiness checks and real browser sign-in rendering. Historical full product tests are not fresh startup evidence. No product implementation was planned; runtime harness changes stay ignored. Exact URLs and stop/restart handoff are recorded below after observation.

## Observed operational preparation

Copied six operational modules and required retained state/configuration without printing their values; recovery originals remain intact. Public SOURCE now points to the preserved recovery source, ROOT remains canonical. Read-only reviewer /root/restart_safety_review found two operational safeguards: require existing admitted state before provisioning and hold operation.lock during relocation. Both were corrected and reread; reviewer returned LGTM_SIN_HALLAZGOS. Its inspection covered public scripts and filtered Docker metadata, not private contents or execution. Coordinator alone executed relocation, exit0: old stopped S3/scanner containers preserved with -pre-canonical-restart-20261024 suffix; replacements keep the same volume/network/port definitions with canonical readonly binds. DB/mail existing containers untouched by relocation.

Retained preparation started all four main services. Scanner and mail became healthy; DB and S3 running. SQL aggregate SELECT returned users2/classrooms4/drafts4/agenda_events0/migrations12. First retained preparation failed strict migration-checksum before API startup. An attempted Git-blob/line-ending comparison still failed; no migration/restore/clone ran. Stopped retries and escalated exact checksum diagnosis to architect /root/restart_checksum_diagnosis. Product diff remains empty. Exploratory public-path probes included missing retired launcher root and guessed migration path, corrected by listing actual names; no file mutation resulted from those failed reads.

## Checksum diagnosis and resolution

Read-only architect /root/restart_checksum_diagnosis compared stored migration checksums with Git and checkout representations. First three migrations retain CRLF hashes while canonical Git/checkout are LF; classroom_ai has the inverse checkout mismatch with stored/Git LF. All normalized SQL matches Git. Its in-memory experiment accepted12/12 real stored hashes, rejected12/12 SQL mutations and12/12 unknown hashes. It made no file or database writes; memory save/summary were blocked by host-session registration. Coordinator updated only the ignored verifier's checksum-mismatch fallback to require normalized checkout/Git equality AND exact stored SHA256 of a known LF/CRLF representation. No product/migration files or database history changed. Corrected retained preparation exited0, including12 migration histories and read-only schema drift0. This supersedes the two failed attempts without relabeling them.

## Observed running application and preservation

Coordinator started node .test-artifacts/main-gemini-20261024/preview.mjs in exec session74235, supervisor PID33872, Next PID42508. Ready metadata reports source commit2a0b8f4d3a0aa42eed14e74ac1ae4e769ec3016d, frontend http://127.0.0.1:52171, inbox http://127.0.0.1:52169, API http://127.0.0.1:52170, real Gemini Developer backend and configured key. Key loaded internally from preserved original source; no key value or Google request was emitted by these checks. Frontend retains its OS-only allowlist/backend origin environment.

Before application startup, node .test-artifacts/main-gemini-20261024/check-retained.mjs before recorded three persistent volume identities, exact12-row migration-history digest, aggregate users2/classrooms4/drafts4/events0, four S3 object hashes and key size/mtime. Independent test_runner /root/restart_readiness_verify executed its after comparison, exit0/unchanged=true: all those observations match. This proves checked counts, object bytes, history and identities; it does not claim exhaustive equality of every database row. No new accounts, classrooms, events or objects were created by validation.

Independent verifier observed frontend /sign-in, /agenda, /mis-aulas and inbox readyz HTTP200; /api/v1/health/live200 ok and /api/v1/health/ready200 ready; /api/v1/classrooms and /api/v1/agenda anonymous401 AUTH_REQUIRED. Four main containers active, scanner/mail healthy; independent SQL counts match. Its initial unprefixed /health probes returned404 before resolving the actual global API prefix. It did not operate a browser or change services/data/files.

Coordinator used ego-browser in dedicated Space2, snapshot and inspected screenshot restart-sign-in.png: real sign-in form, email/password/submit present, zero failed images and no horizontal overflow. Finished Space with p1 kept for the user's manual testing. No login, authenticated journey, new paid Gemini extraction or full product suite was run; this is startup/readiness evidence. Existing verified API/Next builds were reused because product bytes are unchanged. Verification and ego-browser skills governed this bounded flow.

## Current handoff and local record

Open http://127.0.0.1:52171/sign-in with existing accounts; local email inbox http://127.0.0.1:52169. Only main is restarted; recovered-source historical preview remains stopped. Restart from canonical directory with node .test-artifacts/main-gemini-20261024/preview.mjs after stopping the existing supervisor. Enter in exec session74235 or SIGTERM to verified supervisor PID33872 closes only API/Next; persistent support containers and all data remain. Do not start a second supervisor on the same ports. Original recovery scripts/config/backups remain untouched; relocated operational state stays ignored in canonical .test-artifacts. Two stopped pre-relocation container backups are intentionally retained.

Roadmap runtime summary updated without changing product phase acceptance. Coordinator observed whitespace checks and116 local link destinations passing. Final reviewer /root/restart_safety_review approved the EOL verifier/roadmap scope and identified this record's stale initial pending wording; coordinator marked it explicitly historical. Local documentation-only commit follows; its future hash is not invented here. No push or deployment is authorized by this runtime request or performed. Next exact action: user manual testing of existing data in the open local instance.
