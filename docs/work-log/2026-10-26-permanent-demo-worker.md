# Permanent demo provisioning — worker

- Agent / role: /root/permanent_demo_worker, operational provisioner.
- Session or task ID: /root/permanent_demo_worker.
- Date: 2026-10-26, America/Buenos_Aires.
- Branch / worktree: main, canonical checkout.
- Starting commit: b97098f42302bee92d2142ba35e1ab56808c548c.
- Phase: permanent synthetic demo setup; no product phase implementation.
- Status: completed (operational API provisioning and first complete fresh-session acceptance; independent coordinator verification follows).

## Request and scope

Prepare and execute only after coordinator runtime-ready gate an API provisioner for two new owned synthetic actors and three retained demo classrooms. New demo data only; no existing-data edits, reset, provider calls, runtime starts or private retained configuration reads. Production/test sources untouched.

## Work performed

Read coordinator scope, roadmap/work-log protocol, public domain barrel, classroom/Agenda clients and existing HTTP setup examples. Consulted Context7 for installed pdf-lib 1.17.1-compatible PDF creation and Mailpit recipient-scoped search. Operational files belong exclusively to ignored `.test-artifacts/permanent-demo/`. Credential storage uses Windows CurrentUser DPAPI; no persistent sessions or tokens. A nonsecret manifest journals confirmed steps and blocks automatic replay after an uncertain mutation.

## Verification

`git check-ignore .test-artifacts/permanent-demo/manifest.json`: ignored. `node --check` on all four operational MJS modules passed. PowerShell parser accepted the credential helper. Directory ACL is protected with two principals only (current user and SYSTEM); inherited child ACLs were inspected and match. No runtime operations have run; gate pending. Operational RED, product types/linter and product tests are not applicable to unchanged product sources.

Prepared `node .test-artifacts/permanent-demo/provision.mjs --runtime-ready`, requiring the coordinator's explicit gate. Human credential viewer is `.test-artifacts/permanent-demo/credentials.ps1` (default Reveal opens a local Windows form, no plaintext disk/console). Neither credential creation nor this viewer has been executed. Design-aligned content: Mathematics questionnaire with companion response left ungraded, Literature practical assignment unsubmitted, Biology evaluation unstarted, two private primary events (timed and all-day). Dates are anchored to the persisted creation date. The helper checks restrictive ACLs before any secret operation. Fresh sessions check recorded actor identity before additional mutations. Classroom codes are memory-only; an interruption between classroom publication and membership deliberately requires reconciliation instead of regenerating or persisting a code.

Pure local asset preparation generated and reloaded three one-page PDFs using installed pdf-lib: Mathematics 1290 bytes, Literature 1325 bytes, Biology 1284 bytes. This proves PDF serialization/loading only, not runtime upload/scanner approval or rendered visual acceptance. A final syntax pass after review corrections passed all four MJS files; `git diff --check` passed. Review also added recorded activity-revision checkpoints and CAS checks before save/publication so resumption cannot overwrite/publish a manually changed activity. Planned fresh-read acceptance now checks confirmed Mathematics submission awaiting grading, unstarted Biology and unsubmitted Literature. These endpoint checks remain unexecuted.

Final prepared operational paths/line counts: `.test-artifacts/permanent-demo/state.mjs` (54), `http.mjs` (60), `content.mjs` (54), `provision.mjs` (175), `credentials.ps1` (40), plus three synthetic PDF assets. All are ignored. No `credentials.dpapi`, manifest, account, classroom, membership, upload, activity, attempt or event has been created. No production source, test, dependency, environment or shared roadmap was edited.

Final reviewer correction: `gradePublished === false` is now required only for the principal teacher's `history-submissions` response; that field is optional in the auxiliary student's `history`. Both paths still require the recorded attempt to be `SUBMITTED`. `node --check .test-artifacts/permanent-demo/provision.mjs` passed after this correction. Gate remains closed; no endpoint or live acceptance was executed.

## Commits and outcomes

No commit created by worker.

## Handoff

Coordinator reported Docker Desktop engine unavailable and web/API stopped; human Docker readiness is pending. Gate remains closed and status stays `in_progress`, not completed. First unfinished action: coordinator restores/confirms the admitted retained runtime at web 52171/API 52170/inbox 52169 and explicitly sends runtime-ready to this worker. After that gate and review closure, execute the prepared command, retain confirmed results, perform fresh-session checks and independent browser acceptance, and report actual nonsecret IDs/counters. Do not execute merely because a port opens or this preparation record exists. Never clean retained demo data on completion.

## Actual execution after explicit coordinator gate

The coordinator later explicitly confirmed API ready 200, web sign-in 200 and inbox ready 200, authorized execution and subsequently confirmed HTTP acceptance was sufficient because ego CLI was unavailable. That gate supersedes the preparation-only state above. No browser/UI acceptance is claimed.

`node .test-artifacts/permanent-demo/provision.mjs --runtime-ready` ultimately exited 0 at `2026-10-26T20:02:19.301Z`, confirming 49 journal steps and an empty pending marker. Retained results: two newly registered and email-verified synthetic actors; three active classrooms with opposite teacher/student memberships; three approved plan PDFs; three approved Library PDFs/materials; three published activities (questionnaire, practical assignment, evaluation); two primary private events (one timed, one all-day); one confirmed companion Mathematics questionnaire submission with no published grade. Nothing was cleaned, reset, restored or migrated; no provider requests or existing-user/data edits occurred.

| Resource | Confirmed nonsecret ID |
|---|---|
| Principal FoxMind Demo | 40c8cd13-4746-4b96-abc1-0d6c01ec2093 |
| Auxiliary Docente Demo | 1f193dac-7f01-4682-880d-06758599c204 |
| Mathematics classroom | 58fecbdc-412c-4da8-a99a-7079e19e740e |
| Literature classroom | eb86c1d7-cbae-436b-9efb-42891b71d27a |
| Biology classroom | c974503f-28a7-4b39-99f3-5a0d9d9c553d |
| Mathematics questionnaire | c6416515-b05e-4aeb-8e33-832ae82fd889 |
| Literature assignment | 9ebf49cc-c1c6-4d45-8bf8-1d5af39bc944 |
| Biology evaluation | 5a694a3c-5c05-4bc8-a427-9096627fabf5 |
| Submitted Mathematics attempt | 58c42033-024a-4a0c-85cd-a47f30b42513 |
| Timed private event | ee4c5400-e346-43f6-bb32-773289e35bd4 |
| All-day private event | faa73495-4007-4d07-acd1-2dfe2204ed2e |

Both fresh cookie jars successfully logged in, resolved their recorded identities, read each classroom with its expected role, and downloaded all three plans and all three Library files. Actual plan byte sizes were 1286/1325/1284 and material sizes 1296/1330/1292 for Mathematics/Literature/Biology respectively. Published activities have associated materials and future local deadlines November 2/5/9 at 18:00 Buenos Aires. Literature's pre-start student practical detail correctly hides its materials; Library access remains authorized. Biology has no started attempt, Literature has no submissions, and Mathematics history confirms the recorded attempt as SUBMITTED, teacher gradePublished false.

Principal Home is `mixed`, teaching 2/studying 1, pending 1/review 1/materials 3/classrooms 3; Agenda range returned 5 entries (including both private events), upcoming 3. Auxiliary Home is `mixed`, teaching 1/studying 2, pending 1/review 0/materials 3/classrooms 3; Agenda range 3/upcoming 2. These are actual complete first fresh-session observations, not UI screenshots or post-restart durability claims.

## Preserved failed attempts and operational corrections

- First invocation stopped before API work because Windows PowerShell inherited an incompatible module-autoload environment from Node. Explicitly importing its own `$PSHOME` Security module corrected the helper. A synthetic probe returned exit 0 before actual credentials were sealed. DPAPI CurrentUser encryption/decryption then worked; the viewer was never opened.
- Anonymous registration preflight initially requested authenticated CSRF and received 401 before sending register POST. Read the actual account client and matched its conditional authenticated-CSRF contract. Journal records `not_sent` reconciliation; no duplicate actor creation.
- A transient Windows EPERM occurred replacing the manifest before material upload. Added bounded retries only around atomic filesystem rename. No API mutation was sent by the failed pre-command save.
- A resumed PDF generator initially changed timestamps/size; the already allocated Mathematics material expected 1296 bytes and the 1298-byte PUT returned 400 INVALID_UPLOAD. Read-only file status remained STARTED/PENDING/ready false. Reconstructed original PDF metadata from the local file's creation timestamp, observed exactly 1296 bytes, and reconciled the explicit rejection. Upload reused the original file ID; no replacement allocation or duplicate entity. PDF generation now reuses immutable local bytes on reruns.
- First fresh-read acceptance stopped at Literature's intentionally redacted student pre-start practical detail. Checked both actors' actual responses and corrected the operational expectation; no activity was started to bypass the boundary. The subsequent complete fresh-session run passed.
- An additional repeat attempt sent no creation commands but a later fresh login received 429 outside the helper's bounded 60-second Retry-After guard. It stopped; no policy was relaxed and no further API call followed. Local before/after comparison confirms all 49 confirmed step payloads/IDs/deadlines exactly unchanged (SHA-256 `3f5f4f649330c6feef7b328decb3aef725313efe1d97c567e8d334a472c9df4d`). The extra repeat's fresh-login acceptance is unavailable; the earlier complete fresh-session PASS remains separate. New direct Home-item assertions added before that extra repeat have syntax proof only; the recorded Home module counts above were observed in the earlier complete run.

The last 429 occurred at the extra repeat's first principal `freshVerification` login (provision.mjs line 131). Its numeric Retry-After header was not retained; the generic guard does not distinguish invalid/missing/nonpositive values from values over 60, so no exact delay is claimed. Source inspection only: login admits both IP and normalized-identifier buckets; default budgets are 30/900 seconds and 10/900 seconds respectively, with expiry at window start plus duration. The sequence is compatible with the principal reaching the identifier budget, but the actual rejecting bucket and any runtime overrides were not inspected. A default-only estimate from first principal login around 20:00:22 UTC is expiry around 20:15:22 UTC (17:15:22 Argentina); this is an estimate, not an observed Retry-After or guaranteed login time. No additional auth request was made to recover the missing header.

Final operational scripts: state.mjs 60 lines, http.mjs 63, content.mjs 56, provision.mjs 179, credentials.ps1 42. All four MJS syntax checks, PowerShell parser and final diff whitespace check pass. Product types/linter/tests remain N/A because product/test sources are unchanged. The runtime-created Next declaration edit belongs to the coordinator/runtime, not this worker. No worker commit or remote publication occurred.

## Final handoff

Complete operational summary and nonsecret IDs/counters are in ignored `.test-artifacts/permanent-demo/summary.json`; durable resource journal is `manifest.json`; passwords are sealed in `credentials.dpapi`, under checked protected current-user/SYSTEM ACLs. Human access uses `powershell.exe -NoProfile -File .test-artifacts/permanent-demo/credentials.ps1`, which opens a local window without plaintext disk/console output; it was not executed by the worker. Leave the retained runtime running and all demo data intact. Coordinator/reviewer should reconcile this record and perform their independent checks after respecting auth rate limits, then hand the protected local credential viewer to the user. No requested provisioning task remains open for this worker.
