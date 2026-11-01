# Private visual reader V-A1b.3a

- Agent / role: /root/green_management / slice_worker
- Session ID: /root/green_management
- Date: 2026-11-01
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 6f3bd32
- Status: in_progress

## Scope
Implement authorization, inspection and verified private asset reads with two real UoWs, no transport, provider or deletion; no test edits.

## Work performed
Added private-asset-read-repository.ts, private-asset-reader.ts and private-asset-read-service.ts; exported factories through Foxy barrel and ObjectStorage type through Files barrel. Reads use actual UoW before and after bounded GET, revalidate session/owner/source, validate stored proofs and SHA-256/length and return copied bytes with restrictive headers. Archived source allowed. No mutation, provider call, transport or cleanup.

## Verification
node --test --test-concurrency=1 apps/api/src/foxy-ai/foxy-private-asset-reader.test.mjs: 7/7 PASS against temporary PostgreSQL. npm run api:build --silent and npm run lint:boundaries --silent exit 0. No real object store access or browser proof.

## Handoff
Coordinator to arrange domain DTOs required by design and independent review, then transport/inspection integration. Physical cleanup remains disabled; no commit created.

## Shared read DTOs
Added shared domain inspection, payload, MIME/producer and internal descriptor types in src/core/domain/foxy-ai-asset.ts, and typed the repository's inspection/descriptor returns. Incomplete stored metadata is represented as null rather than an invalid typed payload. node --test --test-concurrency=1 apps/api/src/foxy-ai/foxy-private-asset-reader.test.mjs passed 7/7; api:build passed after correcting an initial TypeScript widening error; lint:boundaries passed. No transport or real object store proof.
