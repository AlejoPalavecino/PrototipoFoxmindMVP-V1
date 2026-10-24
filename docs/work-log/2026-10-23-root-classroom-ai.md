# Classroom AI extraction — design in progress

- Agent / role: /root, coordinator
- Session or task ID: /root
- Date: 2026-10-23
- Branch / worktree: codex/classroom-gemini; C:/Users/alejo/.codex/worktrees/classroom-gemini/ProtipoFoxMind
- Starting commit: ed06f885 (main, locally observed)
- Phase: new authorized AI extension to P5; [feature](../../odd/tasks/classroom-ai-extraction.md)
- Status: completed (continued and closed locally on2026-10-24)

## Request and scope
Extract units and their topics from an uploaded PDF or Word study plan using Gemini. The teacher edits the extracted proposal and confirms before classroom creation. Design extensible AI architecture. Work separately from concurrent changes. No remote publication authorized.

## Work performed
Read continuity instructions, roadmap and work-record protocol. Original checkout 43954848555cc9f304fa669ad2e7bd5caa00ebec is older than main and contains unrelated untracked work. Created managed worktree, checked clean status, then switched only that new worktree to codex/classroom-gemini from main ed06f885. Original checkout preserved. Dispatched read-only explorer and architecture/design worker with distinct ownership.

## Verification
Observed git status, log, worktree inventory and tracked main file inventory. Main contains actual classroom wizard/backend; old P3 roadmap does not describe main. No functional changes/tests yet. Current L3 policy requires reviewable design and human confirmation before RED.

## Commits and outcomes
No new commit. Design is reviewable in the worktree, pending the user's L3 decision. No runtime/secret/data changes or publication.

## Handoff
User explicitly accepted D1:A and instructed implementation with PostgreSQL background jobs in this separate worktree. The L3 gate is satisfied. First unfinished action: C1/C2 RED, then GREEN and durable backend/UI integration with independent verification. No push/PR authorization is inferred.

## Research and environment notes
Official Google document-processing, structured-output and file-input-methods guides were read through ego-browser in dedicated task space 2, then the space was finished. Gemini supports PDF understanding and structured JSON; local schema validation remains necessary. Current application format limits remain PDF/DOCX20MB. Avoid Files API copies for single-use processing where inline input fits; this does not imply zero provider retention. Word DOCX preprocessing needs bounded local parsing.

Context7 resolved Google Gen AI JavaScript SDK and returned structured-response documentation. Exact model and SDK API need verification against the installed version before implementation, not inference from old training knowledge. No external document or paid model call was made.

Engram mem_save and mem_session_summary were blocked by PreToolUse: host session is not registered. No host/session registration changes attempted. Repository records remain the continuity source. Ego Lite reported an available update; no upgrade attempted.

## Design verification
Read the concrete architecture and proposed source/transport/state boundaries. Requested correction of the worker deadline so the asynchronous design actually tolerates longer processing than the synchronous alternative. Coordinator relative-link check passed 7 links across the feature and three work records; git diff --check exit0. Functional tests and live UI tests are not needed for this documentation-only stage; no product acceptance is claimed. Roadmap adds only this proposed extension and preserves existing phase acceptance/history.

## Implementation stage
User accepted D1:A and confirmed Gemini API / Google AI Studio. Workers implemented shared domain, SDK adapter, bounded document parsing, PostgreSQL queue/usage and teacher-review UI. Independent test role reports 57AI +38selected regression PASS after fresh API build. UI worker reports strict TypeScript and Next production build PASS. No secret files were read; AI_API_KEY presence check returned false (value not accessed). No real Gemini request was made.

Coordinator authored the owned synthetic live harness and optional test-database naming support, updated the combined regression harness to the exact ten-migration inventory, and wrote the operations guide. First two live preparations deployed migrations but detected schema drift (clock_timestamp defaults/index names); they each cleaned owned resources with0failures. Backend worker corrected Prisma mappings. Third preparation passed deploy and drift; actual Next/API/private storage/scanner/inbox started at a disposable local origin for independent ego QA.

Immutable review snapshot: .test-artifacts/ai-review-v1/manifest.json, SHA256 222b90bd963e5d76f0d03c476b19d2e41105d66552bd5c11d3882ee54b3487f5,70 changed paths and481 context files. Blind judges A/B assigned identical scope under L3 Judgment Day. No native review approval, publication or phase completion is claimed.

## Independent verification corrections in progress
Live verifier established an authenticated same-origin POST to the extraction endpoint returns404: the existing Next classroom proxy lacks extraction routes. Manual fallback/autosave worked. Screenshot capture repeatedly timed out in ego; semantic DOM/API evidence is available, visual acceptance remains unproven. Earlier401 observations were superseded by an authenticated reproduction; no account-policy change is justified.

Judge B independently reproduced three introduced worker defects against the immutable snapshot: an already-aborted bounded call leaves an initiated rejection unobserved (Node process failure); the shared private FileService rejects simultaneous document reads; shutdown during a pending claim can dispatch after closing. Test role is adding RED regressions before production corrections. Judge A remains independent; final adjudication and re-review are pending. Source acceptance/commits remain blocked on corrections and applicable verification.

The runtime hook explicitly reports no registered session identity after resume. Agent-attributed Engram writes are now stopped until host registration, without retrying or inventing an identity. Repository records preserve continuity.

Live fixture restart preparation: the original exec session's stdin was closed, so Enter could not trigger graceful cleanup. Coordinator verified the exact harness PID5164 and child Next PID42904/origin60479, stopped only those owned processes, removed the three owner-labeled967a761a5fef57e4 containers/network, and removed the exact owner-labeled synthetic Mailpit3531d2cc-06c8-4c85-b26b-9fbae3738464 container/volume. Removed only that fixture's generated configuration files without reading them. Final docker ps empty. This forced teardown is not evidence of graceful shutdown; the next harness must use tty=true. No retained volume was touched.

## Continuation and final handoff

The continuation reconciles independent verification, historical failures, user-approved commit-size exceptions and local work-unit identities in the [final coordinator record](2026-10-24-root-classroom-ai-final.md). This supersedes the earlier pending handoffs without relabeling their failures. No remote delivery or real Gemini call is claimed.
