# Foxy private image inspector — in progress

- Agent / role: /root/green_diagram, slice worker
- Task ID: /root/green_diagram
- Date: 2026-11-01
- Branch/worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Phase: V-A1b.1, docs/work-log/2026-11-01-architect-private-asset-custody.md
- Status: in_progress

## Request and scope
Bounded isolated PNG/JPEG inspection; no scanner, storage, provider, tests or shared barrel changes.

## Work performed
- Added isolated inspector factory, worker entry and PNG/JPEG format gate. Input is copied before dispatch; parent checks immutable digest, size, MIME and header dimensions. PNG chunk CRC/APNG and JPEG marker/MPF/trailing checks precede bounded complete decode.
- Consulted Context7 Sharp 0.35.5 constructor, timeout and decoder APIs. No barrel, scanner, storage or provider integration was changed.

## Verification
- node --experimental-transform-types --test --test-reporter=dot apps/api/src/files/foxy-private-image-inspector.test.mjs: exit 0, 8 cases; repeated after final error and signal handling.
- npm run api:build --silent and npm run lint:boundaries --silent: exit 0 before final small input/abort guard edits.
- Additional synthetic palette PNG with alpha and progressive JPEG: both inspected at 64x48 with correct MIME, exit 0.

## Handoff
Independent audit and adversarial fixture expansion required; no real scanner, storage, custody, preview, publication or external provider tested. Native worker heap limits do not bound all native allocations; byte/pixel/channel limits and deadline apply. Barrel export is coordinator-owned.
