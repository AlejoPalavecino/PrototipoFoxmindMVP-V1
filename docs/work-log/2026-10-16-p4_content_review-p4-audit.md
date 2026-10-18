# P4 content and transport audit — corrections required on initial candidate

- Agent / role: /root/p4_content_review; independent read-only reviewer.
- Session or task ID: /root/p4_content_review; registered runtime session unavailable.
- Persisted by: current P4 coordinator from reviewer messages/final report; reviewer wrote no files.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting/final inspected commit: ce31410981e2d269c3d73f45e4ffe3679fbb6e0a.
- Phase/tasks: P4-B/D/E, specification sections7/14/15; odd/tasks/p4-private-files.md.
- Status: completed (assigned read-only audit), initial candidate requires corrections; not phase acceptance.

## Request and scope

User explicitly authorized independent read-only agents on P4. Read roadmap/protocol/task/guide, parsers/adapters/configuration/HTTP/service exclusion, local helpers/compose/scanner configuration and corresponding tests. No file, memory, global runtime or native transition writes by reviewer.

## Findings and proof

1. P2: content-worker.ts29/91-99 removes prefixes and recognizes structural Override/Relationship descendants without resolving their namespaces. Inline memory repro added xmlns="urn:forged" on either Content_Types Override or root relationship child; both returned the DOCX MIME rather than rejection. Require inherited/redefined namespace resolution on descendants with regressions.
2. P2: http.ts87-93/104 and service.ts46-47 allow pending output buffers after releasing the read slot. Three deterministic response doubles retaining end(bytes) without finish held150,000,000bytes across three admitted requests. Share bounded transfer admission until finish/close, with send timeout. Five paused real Windows sockets executed five reads and external memory around211MB, but kernel buffering finished writes quickly: this does not prove hard network stalling.

`node --test --test-concurrency=1 tests/p4-file-policy.test.mjs tests/p4-adapters.test.mjs tests/p4-content.test.mjs tests/p4-configuration.test.mjs tests/p4-cleanup-worker.test.mjs`:31PASS/0FAIL/0SKIP, exit0, around8s. Four additional inline Node executions wrote no files; both forged namespaces were accepted and deterministic output retention reproduced. All exit0.

## Limits and handoff

No compilation/generation, Docker/persistent fixtures, SQL/S3/ClamAV journeys, native authority or P3/P5/P7/browser integration tested. Controlled reproductions are not real-service acceptance. Coordinator must correct both findings with RED/GREEN and request changed-candidate recheck. Reviewer authored no corrections and no commit. Initial three dirty docs belonged to coordinator. Findings remain open until attributed recheck below.

## Independent changed-candidate recheck

Reviewer returned PASS/completed on ce31410 plus coordinator corrections, closing both previous findings without newly observed breaches in those corrections. Repeated four forged effective namespaces: all rejected; explicitly namespaced valid structural children admitted. `node --test --test-concurrency=1 tests/p4-file-policy.test.mjs tests/p4-adapters.test.mjs tests/p4-content.test.mjs tests/p4-configuration.test.mjs tests/p4-cleanup-worker.test.mjs tests/p4-http-output.test.mjs`:33PASS/0FAIL/0SKIP, exit0, around9.6s. Two inline memory executions exit0 additionally verified namespace matrix and stalled GET->PUT503 before store access, with output error releasing the slot. No files/build/fixtures/native transitions by reviewer.

Observed SHA256: content-worker.ts88B44A9C0A00A8F3713038A69B53336BBF120CB2F8C86AC6C1CC7F0515D91344; http.ts77755E8254FF4834C00C0C3A9A664305D61624ABBAFAA168ABBC4B934566E10A; p4-content.test.mjs4B318DC510DFA9503608CF77C2D882BE99C454614116C6C38FFC0F06041AFD82; p4-http-output.test.mjs2974921317BFB4A201B364B7497E44FA0C6A6E59B79BAC921866E4BC02C88114. HTTP doubles prove lifecycle admission, not exhaustive real-network backpressure behavior. Real/persistent runner remains coordinator proof; native/full integration remain separate. Freeze matching code and continue native disposition.
