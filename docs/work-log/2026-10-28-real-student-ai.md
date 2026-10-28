# Real student AI journey — completed

- Agent / role: real_flow / isolated real-provider verification
- Session or task ID: /root/real_flow
- Date: 2026-10-28
- Branch / worktree: codex/student-journey-polish, shared checkout
- Starting commit: 0f3407daf722eabab9670f66056584e45ddb5d8a
- Phase and detailed task/spec links: [student AI](../student-ai.md)
- Status: completed

## Request and scope
Authenticated synthetic teacher/student journey with real Gemini using exclusively owned ephemeral infrastructure; no retained accounts, private configuration disclosure, deployment or publication.

## Work performed
Added `scripts/student-ai-real-live.mjs`, with random owned database, guarded directory cleanup, real provider loaded by the existing opaque configuration mechanism, fresh disposable services and synthetic actors. Teacher created and published an assignment; the enrolled synthetic student submitted it. The teacher opened the individual summary in ego-browser TaskSpace 25, saw real generated analysis and the A1 activity title, reloaded and reopened the summary; the READY state and mapping remained visible. Browser space closed. No provider prompt or credentials recorded here.

## Verification
- `node --check scripts/student-ai-real-live.mjs`: exit 0.
- `npm run api:build`: exit 0; `npm run web:build`: exit 0.
- `node scripts/student-ai-real-live.mjs`: isolated DB/storage/scanner ready; Prisma migrate deploy and diff PASS; synthetic membership and submission PASS; real Gemini READY with one dispatch and A1 mapped to synthetic title PASS.
- `ego-browser skill` succeeded. Browser authenticated teacher opening and reload/reopening: READY, student, A1 title PASS. An initial selector wait failed because three matching references were visible; bounded content assertion afterward passed.
- P4 owned cleanup failures 0; synthetic fixture directory cleanup completed. Mailpit helper returned successfully. Browser TaskSpace finished.
- This proves one synthetic journey and provider response, not broader real-user or physical-device acceptance.

## Commits and outcomes
None; coordinator owns integration and commit.

## Handoff
Coordinator to reconcile evidence and decide whether the reusable runner belongs in the final work unit. No remote action performed.
