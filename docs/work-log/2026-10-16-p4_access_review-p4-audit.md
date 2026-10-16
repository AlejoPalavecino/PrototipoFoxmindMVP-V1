# P4 access and transaction audit — corrections required on initial candidate

- Agent / role: /root/p4_access_review; independent read-only reviewer.
- Session or task ID: /root/p4_access_review; registered runtime session unavailable.
- Persisted by: current P4 coordinator from reviewer messages/final report; reviewer wrote no files.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting/final inspected commit: ce31410981e2d269c3d73f45e4ffe3679fbb6e0a.
- Phase/tasks: P4-C/D/E, specification sections7/8; odd/tasks/p4-private-files.md.
- Status: completed (assigned read-only audit), initial candidate requires corrections; not phase acceptance.

## Request and scope

User explicitly authorized independent read-only agents on P4 without touching P3. Read roadmap, work-record protocol, task/spec, access/store/service/promotion/cleanup/HTTP, schema and six migrations. Reviewed user/scope/membership locks, private attempts, rechecks after I/O, quota, promotion and retention. No source, memory, runtime or work-record edits by reviewer.

## Findings and proof

1. P2: http.ts91 and service.ts46-47 release admission before response delivery. Controlled Writable backpressure with real FileService and in-memory adapters admitted three GET200 responses, three unfinished responses and3,000,000queued bytes. No download send deadline. Keep shared transfer slot through finish/close with bounded send and release on error/disconnect. An additional Windows loopback socket attempt flushed to kernel and did not positively reproduce stalled output; not counted as positive proof.
2. P2: access.ts29 checks activity publication/participation but omits actual type. Inline read-only resolver repro with owner teacher/QUESTIONNAIRE/DRAFT authorized instructions upload. Require ASSIGNMENT and reject questionnaire/evaluation.

`node --test tests/p4-file-policy.test.mjs tests/p4-cleanup-worker.test.mjs`:15PASS/0FAIL, exit0 including real Nest lifecycle. Both inline reproductions exited0 and exposed defects. No other concrete defect identified within this review.

## Limits and handoff

No build/generated writes, Docker fixtures, persistent services, full59checks, native review or P3/P5/P7/browser acceptance. Reproductions use controlled ports, not new SQL/S3/ClamAV evidence. Coordinator owns corrections/regressions and must request recheck of the changed candidate. Reviewer authored no fix and no commit. Initial three dirty docs belonged to coordinator. All findings remain open until attributed recheck below.

## Independent changed-candidate recheck

Reviewer returned completed recheck on ce31410 plus coordinator's uncommitted corrections. Both reported P2 findings are closed for those corrections; no new concrete defect observed. `node --test tests/p4-http-output.test.mjs tests/p4-file-policy.test.mjs tests/p4-cleanup-worker.test.mjs`:17PASS/0FAIL, exit0. Two independent inline memory commands exit0 additionally proved QUESTIONNAIRE/EVALUATION denied for upload/read/status, ASSIGNMENT upload admitted; a stalled GET denied PUT before store access and response error destroyed/released the slot. Read source confirms finish/close/error and absolute30s send expiry. Reviewer wrote nothing and did not build/start fixtures. XML recheck belongs to other reviewer; real/persistent evidence remains coordinator-owned. This closes these findings, not native or integrated P3/P5/P7 acceptance. Coordinator must freeze the same corrected code and continue native disposition.
