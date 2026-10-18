# P7 independent verification — one reproduced content-lock blocker

- Agent / role: `/root/p7_final_verify`; independent ODD Verify, requested gpt-6.1-sol/xhigh; not writer/native RDD reviewer.
- Session identity: unavailable, omitted from Engram mutations.
- Date: 2026-10-18.
- Candidate: `bbc809c620a2e758232cf721a1a3958bd8284e8b`, branch `codex/p7-activities`.
- Baseline: `b4829e2e198a185f96a0ad0914b8ba2b7200c9d0`.
- Managed HEAD observed: `84b917ea3b9f9c3958aa342f4faed483da55420c`, passive records only beyond held candidate; pre-existing dirty task/coordinator records preserved.
- Task/specs: T7, S1–S4, `odd/tasks/p7-activities.md`.
- Status: blocked on one candidate-caused unmet S1 requirement; no whole-feature acceptance/publication.
- skill_resolution: paths-injected; reloaded all four supplied skills.

## Scope and historical boundary

Read and reconciled the updated entire feature document through L28 and full Engram mirror #60. L28 authorizes ONE fresh preparation/default repetition under the unchanged aggregate API limit of 30 seconds. The earlier scratch `foxmind-p7-verify-wUgA95` and its 30,061ms compilation-unavailable result remain historical evidence, not converted to PASS. No old partial build was reused. No source, workspace test, Git, native review, remote publication or retained development data was mutated. No P8 implementation was performed.

## Reproduced blocker B1 — first consultation-only TP opening does not lock instructions

Severity: P2 correctness / unmet explicit requirement.

Spec8 says the first student opening of a TP detail containing its instructions starts participation/content locking. The feature log L9 expressly includes closed/ineligible consultation without granting expected-work/editor/submission permission. Submission eligibility must not permit changed instructions after that real first opening.

Observed public-interface reproduction on the immutable candidate:

1. Real teacher and student register, sign in and verify through actual captured Mailpit messages.
2. Teacher publishes a valid TP with written instructions and an already expired deadline, before the student joins. General late reception is allowed.
3. Student joins through the actual code preview/confirm flow. Eligibility is correctly `expected=false`.
4. In the actual browser, student opens Actividades → `Abrir trabajo práctico`, then sees the real instruction text.
5. The resulting public session reports `locked=false`; SQL shows `first_started_at=null`, zero attempts.
6. Teacher saves different instruction content with the current classroom revision. The public mutation returns HTTP200, where content-lock rejection requires HTTP409. The domain snapshot hash changes.

Evidence is in `independent-consultation.json`, `independent-consultation.png`, `independent-tp-consultation.test.mjs` and original `independent.stdout.log`. The sole probe execution exited1 after34,341ms; its assertion is 200 !== 409, not a fixture prerequisite failure. Process/owned service cleanup both reported0. No retry or source fix followed.

Relevant candidate paths and lines:

- `apps/api/src/classrooms/activity-participation.ts:141–150`: `needsStart` derives from `is_expected`; instructions remain exposed for an ineligible student while `canStart=false`.
- `apps/classrooms-ui/Activities.tsx:64–67`: actual TP open calls start only when `next.canStart`.
- `apps/api/src/files/access.ts:46–54`: matching instruction access exception permits consultation-only access without a started attempt; static related seam, not a separately reproduced file-download finding.

Causality: activity-participation.ts and Activities.tsx are absent from accepted baseline b4829e2. This is a missing rule in the new P7 feature, not an existing baseline application defect. The separate baseline/candidate old-route pair below showed no old transport regression.

Correction must preserve consultation-only eligibility (no fabricated submission, editor capability or expected-work assignment), archived read-only behavior and the future-deadline first-submission authorization flow. Separate actual instruction-opening/content locking from eligibility. Parent owns one coherent correction with regression coverage, followed by one targeted recheck of B1, not another full sweep.

## Exact fresh preparation

New root: `C:/Users/alejo/AppData/Local/Temp/foxmind-p7-verify-repeat-rkJc5c`, created with Node fs.mkdtempSync. Preparation duration82,512ms.

- Candidate ALL507 tracked blobs; baseline ALL434 tracked blobs; no exclusions.
- Includes tracked operational `.engram/config.json` in each tree, exact Git object `ee3a497092dfc6fd3d4cfe2aac0f7ffd0eb9e32a`, SHA256 `534f2a5682664cdf0f0be98541fc5c4807530a56ffe828e66455b0c6d0ed28f8`.
- `git ls-tree -rz --full-tree`, fatal UTF-8 path decode, byte-safe `git cat-file --batch`, per-blob Git SHA1 validation and SHA256 readback; no PowerShell raw-source conversion, checkout/clone or ZIP normalization.
- Every Git mode100644; unsupported modes rejected in preparation.
- Separate dereferenced physical copies of existing local node_modules, including nested dependencies:31,519 files /3,314 directories /772,674,988 bytes per tree. Zero symlinks/hardlinks by lstat/nlink. Independent recursive Windows ReparsePoint scans both0. No install/version changes.
- Before execution: no `.build`, `.generated` or `apps/web/.next` in either tree; no partial artifact from old scratch reused.
- No untracked env, secret or development files copied.

## Observed commands and outcomes

Every behavior command ran only once in this authorized continuation. The default runner was not preceded by a separate build.

| Check | Observed result |
|---|---|
| `node scripts/test-p7-integration.mjs` DEFAULT | exit0;613,484ms; fresh Prisma/API TypeScript/production Next builds; all9 journeys,35leaf44TAP; fail0/skip0 |
| Serial focused Node suite, exact31-file list in focused-files.json | exit0;71,096ms;120PASS/fail0/skip0; actual integration/mobile files excluded |
| `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit --incremental false` | exit0;1,866ms |
| Same check-only tsc for `apps/web/tsconfig.json` | exit0;2,524ms |
| External legacy-contract-probe.mjs against raw baseline and candidate | both exit0;1,709/1,671ms;29 old routes × API/web × absent/new editor-header inputs =116 observations; exact31,412-byte stdout SHA256 equality, empty stderr and identical exits |
| `node --test --test-concurrency=1 tests/dependency-security.test.mjs` | exit0;157ms;8PASS |
| Existing npm CLI `audit --json` | exit0;1,655ms;0 vulnerabilities |
| External independent TP consultation test, one330s test/360s child bound | exit1;34,341ms;B1 reproduced; stopped further behavioral commands |

Default per-journey TAP totals in order: authoring5, participation5, practical5, practical-timing5, questionnaire8, overview3, recovery3, history5, notifications5. All nine reported process cleanup0 and owned cleanup0. Its stderr contains normal Prisma load notices and the existing Next ignored-home-lockfile warning, not a clean-stderr claim.

The default directly demonstrated real P3 session/verification/captured-mail/CSRF, PostgreSQL migrations/drift, private S3/actual ClamAV, real TP file lifecycle/count/quota/custody, editor transfer/stale editor/scan wait, complete-body receipt across lock waits and delayed bodies, questionnaire/evaluation idle/navigation/generation/lost-ack/reload/incomplete confirmation/freeze, immutable all-type reopen/prefill/history/grade-pointer conservation, membership/re-entry/archive, and mobile academic plus legacy WALL notification targets without academic emails. Focused120 and the independent old-route pair complement those observations; they do not cover B1, as independently shown.

## Skips and limitations

No normal P6/P4/P5 rebuild-and-actual runners, backend runner or full P3 account browser suite were separately rerun. Their relevant changed shared seams were exercised by the fresh default's real P3–P6 connections, SQL-backed P6/P7 focused checks and baseline transport pair. Untouched password/reset behavior was not re-proven. Baseline had no fresh API/Next build: old transports executed raw exact source under matching package metadata, and baseline P7 is absent. These skips are explicit rather than inferred passes from prior reports.

No further behavioral checks ran after B1. No whole-feature PASS is asserted. An initial external probe-file generation command had a JavaScript quoting syntax error before creating/executing that probe; preparation of that outside-only artifact was corrected and `node --check` passed before its sole actual runtime invocation. No application command was rerun for that tooling issue.

## Per-spec verdicts

| Spec | Verdict |
|---|---|
| S1 | BLOCKED: B1 violates the TP first-detail content lock. Other listed observed proof passed; no full acceptance. |
| S2 | Fresh complete tracked preparation/default/focused/strict/baseline proof observed; independent verifier returned one blocker batch. Targeted correction recheck still pending. |
| S3 | Full L28 task/memory mirror read and reconciled; important outcomes saved in canonical Engram without invented session ID. Coordinator must persist this attributed record and refresh its mirror before closure. |
| S4 | PENDING: parent-only merge/push must wait for accepted correction proof. No remote action attempted. |

## Integrity and cleanup

Final raw source readback: candidate507/507 and baseline434/434 match exact Git blob SHA256 values; zero changed/missing paths/modes. Both dependency copies were independent physical files. Fresh output contains127 API .build files,42 generated Prisma files and a production Next BUILD_ID; baseline still has no build/generated/Next artifacts.

Original dirty checkout249 tracked-file bytes/modes and its exact porcelain status unchanged. Managed checkout508 tracked-file bytes/modes and its two pre-existing dirty record statuses unchanged. Full hashes and inventories are in final-integrity.json / before-inventories.json / after-inventories.json.

All executed default/focused/independent owned cleanup routines succeeded. Final process queries for default45356/focused33956/independent39232 and their direct children returned none. All six explicitly logged default P4 owner keys were independently checked afterward for containers/volumes/networks:18 read-only checks, exit0 and absent; see known-owner-final-inventory.json. The additional independent probe's owner key was not exposed in its log; its ownership-checked helper reported process0/owned0, without claiming a separate exact-name inventory for that unlogged key.

No recursive OS scratch cleanup occurred. Both old/new roots, fresh build output, external probes/logs/results and canonical browser evidence directories remain retained. The external probe PNG contains only disposable fixture data.

## Evidence and handoff

This directory contains prepare.cjs, prepared.json, both full raw manifests, both dependency summaries, full pre/post inventories, all command started/result/stdout/stderr files, focused-files.json, default.summary.json, the external legacy and consultation probe sources, consultation JSON/PNG and known-owner-final-inventory.json.

Coordinator persists an attributed repository record, reopens only the B1-linked task/spec and executes the one coherent correction. Independent verification then rechecks B1 and its necessary first-authorization/archive invariants against fresh immutable correction bytes; do not start another whole-feature sweep. Preserve the earlier failed30s proof and this fresh default PASS as distinct executions. No merge/push before accepted corrected proof; stop before P8.

Risk: candidate items1–5; verifier made no source change.


## Coordinator persistence
Persisted by /root from read-only /root/p7_final_verify. The sole human-authorized same30s repetition passed before B1; no authority for further full sweeps is inferred. B1 correction is the first bounded independent-verifier correction batch; only targeted B1 and necessary first-authorization/archive proof follows. Source authorship remains with the correction writer, not verifier.
