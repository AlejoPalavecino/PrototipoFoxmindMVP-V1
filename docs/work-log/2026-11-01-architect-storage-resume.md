# Isolated storage and scanner validation — execution plan

- Agent / role: /root/storage_proof / architect.
- Session ID: unavailable; actual task: /root/storage_proof.
- Date: 2026-11-01.
- Branch/worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: 48caebf.
- Status: completed (investigation and test design only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for isolated interoperability tests. This is not approval or proof of private-source physical cleanup.

## Scope and observed evidence

The coordinator requested a short viable plan to validate actual S3/ClamAV interoperability without reading retained credentials or attaching to retained services. Applied the local sdd-ambiguity-gate and clean-architecture skills. Runtime memory writes are unavailable because host session registration is unconfirmed.

Docker server responded with version 29.9.2. The local image inventory includes postgres:17.10-bookworm, chrislusf/seaweedfs:4.48 and clamav/clamav:1.5.4. Tag presence does not yet prove that the exact digest references used by the fixture can be started. No service was started or stopped by this investigation, and no real interoperability PASS is claimed.

`scripts/p4-services.mjs` already exports `withP4Services(run,{persistent:false,databaseName:'p4_test'})`. It creates a unique labelled network and new containers, random loopback ports, fresh synthetic credentials, temporary object/database storage, pinned S3/scanner image digests, and ownership-checked cleanup. It never reads `.p4-local`. Its callback exposes `databaseUrl`, the configured S3 client and endpoint, scanner host/port, infrastructure, and restart control in persistent mode. Reuse this helper; do not invoke `p4:local`, its retained private configuration, or `tests/p4-persistence.test.mjs`.

The scanner startup attempts FreshClam using `config/p4-freshclam.conf` with one attempt and bounded connect/receive timeouts. ClamD retains `FailIfCvdOlderThan 7`. Readiness polls PG, authenticated S3 and ClamD PING for at most 180 seconds. Missing/failing signature updates can prevent readiness: report that explicit unavailable check instead of weakening signature freshness or using a fake scanner. Updates may use external signature-network access; they do not need an AI provider or user key.

## Smallest executable slice: V-INF1

Test owner: test_runner. New file: `apps/api/src/foxy-ai/foxy-real-storage-scanner.test.mjs` (or equivalent exclusive test path). No production contract changes are required for this proof.

Use one `withP4Services` callback so scanner startup occurs once. Apply existing migrations only to its new `_test` database. Use a `pg.Pool` on the callback connection and existing `transactionDatabase(pool)` from `tests/classroom-ai-database.test.mjs`; do not nest `withAiDatabase`, which would allocate a second database. Seed `homeFixture` with synthetic teachers/classes only.

Construct production `S3Storage(runtime.s3,'foxmind-private')` and `ClamdScanner(runtime.scannerHost,runtime.scannerPort)`, then inject them into `FileService` and `createFoxyRuntime` exactly as the existing visual runtime/publication journey tests do. AI providers remain deterministic synthetic ports. Use direct/public modules or a freshly compiled API consistently to avoid the Files/Nest decorator import failure observed earlier. Build first if compiled imports are used.

Required first proof, sequential in the same fixture:

1. Real adapter smoke: exact-byte PUT/GET for `foxy-assets/<owner>/<asset>`; second conditional PUT maps to UPLOAD_CONFLICT; unauthenticated HTTP object GET is denied. Scan a generated benign PNG/JPEG and the standard harmless antivirus test signature; clean succeeds and test signature gives sanitized FILE_REJECTED.
2. IMAGE PNG/JPEG and DIAGRAM renderer: start -> worker -> READY -> private read; stored hash/size and validated/scanned digests agree. Count exactly one provider generation per job. A reconstructed runtime can read the same bytes without regenerating.
3. Prepare a raster copy -> publication worker -> explicit confirmation -> library material. Before confirmation no student material access; after confirmation exact-byte read succeeds. Private and library storage keys differ, and real scanner is called once for each custody path. The source key is never exposed to browser/public DTOs.
4. Verify scan failure leaves the job private/not READY and creates no material, using the invocation's actual scanner being unavailable, then restore only that owned service. The direct scanner antivirus probe in step 1 establishes its real signature detection, but does not establish rejection of an infected raster by Foxy. That stronger claim requires the same valid inspectable synthetic image to be independently rejected by the daemon and passed unchanged through the pipeline; if no such fixture is available, report this subcase unverified. Do not substitute a different byte buffer inside a scanner wrapper and call it real infected-image interoperability.
5. Finish with runtime shutdown, storage drain/close, pool shutdown, and helper-owned cleanup. Log only names/status/counters/hashes needed as synthetic evidence; never print callback configuration, credentials or connection URL.

Suggested focused invocation: `node --experimental-transform-types --test --test-concurrency=1 --test-reporter=dot apps/api/src/foxy-ai/foxy-real-storage-scanner.test.mjs`. Keep the test under the existing owned-service child budget (360 seconds), with readiness failure named distinctly. Avoid the full `npm run test:p4:integration`: that command also builds Next and runs unrelated browser/file journeys.

Optional second proof V-INF2: call the helper with `persistent:true` and databaseName ending `_test`, using its new labelled volumes exclusively. Recreate runtime/DB clients around `restartData()`, then prove actual PG/S3 restart preserves private and published hashes, visibility and no second provider dispatch. This tests only resources created by that invocation; it does not permit use of the retained P4 project. Delete only exact names whose ownership label equals the invocation tag. Do not use a blanket Docker cleanup.

## Private-source cleanup remains a separate missing capability

The actual `S3Storage.put` uses `IfNoneMatch:'*'`; `remove` is an ordinary DeleteObject. Its owned promises, scope barrier and drain protect local scheduling but cannot prove that a remote timed-out PUT has stopped. Existing visual discard preserves lease, payload/proof/key and charge. Existing schema pairs blob_deleted_at with quota_released_at and allows zero charge only for a physically deleted discarded source. There is no fencing primitive or residual-byte accounting.

Therefore a successful V-INF1/V-INF2 cannot justify installing a private visual cleanup worker or releasing that quota. The already implemented library-copy cleanup is a distinct path and is not evidence of a private-source fence.

An implementation-ready physical cleanup design must first select and prove a remote ordering strategy. The previously proposed permanent same-key nonimage fence would require a new internal storage port, proof/lease columns and residual charge semantics; marking blob_deleted_at and charge=0 for a retained fence would be false accounting. It must not be added as an unconditional public PUT API.

Required actual SeaweedFS proof before enabling such a strategy: proxy-delayed conditional PUT that outlives the local timeout, discard and fence race, uncertain fence response, readback/hash validation, repeated cleanup, crash after remote fence but before SQL proof, actual storage restart, and no late byte recreation or alternate remover of the fence. Tests must cover the no-object case and an already existing payload. A permanent fence must remain durable and its retained byte charge must be measured. AWS documentation in the earlier design is background, not SeaweedFS 4.48 compatibility proof.

Until that design and proof exist, keep private cleanup disabled, discarded asset charged and cleanup PENDING. Do not report recovered quota or DONE. This is a technical missing implementation/proof, not a request for another user approval.

## Verification and handoff

Observed read-only checks: Docker server version/image inventory; source inspection of p4-services, scanner configuration/start tests, production S3Storage/ClamdScanner, visual custody and journey tests, discard repository and visual asset guards. No functional test or real storage/scanner execution occurred in this architecture task. No secrets or retained configuration read, external research, provider calls, migration or production edit, memory write or commit.

Next action: assign V-INF1 to test_runner using the existing isolated service helper. Proceed to V-INF2 only when V-INF1 passes and restart proof is still required. Retain physical-source cleanup as a separate explicit unfinished slice rather than treating interoperability as its approval.
