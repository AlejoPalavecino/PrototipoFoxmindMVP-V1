# Platform UI source and QA map

- Agent / role: /root/ui_source_map, read-only explorer (gpt-6.1-sol).
- Session or task ID: /root/ui_source_map; registered session identity unavailable.
- Persisted by: /root coordinator, from the explorer's completed handoffs.
- Date: 2026-10-21 (client timezone).
- Branch / worktree: codex/foxmind-entry-glass, isolated glass worktree.
- Starting commit: c6a4c08c94040ca6b115ce8b4899d532fcc82a6f.
- Phase / scope: presentation integration source/runtime/component mapping.
- Status: completed.

## Work performed

Read-only git worktree/status/log inspection, roadmap/work-record protocol, functional visual requirements, existing entry task and relevant components/styles. Actual current source is the isolated glass worktree, not historical feat/p33-token-flows in the original workspace. Entry/Home intentionally excluded academic bodies, leaving separate academic typography and controls. Mapped actual shared navbar, account/academic styles and platform surfaces. Exact frontend-design and vercel-react-best-practices skill paths loaded (paths-injected).

Mapped existing frontend replacement owner script without reading secret/env/runtime credential files: its own replacement-web-stop controls only its Next child; original stop-request ends API/fixture lifecycle and must not be used. Mapped real ClassroomView, Plan/Library/Wall/Activities/Progress and standalone real-component Vite QA with a read-only in-memory adapter. No browser, process changes, source writes, tests, installs, database or remote operations by explorer.

## Verification

Observed commands: git worktree list --porcelain; scoped git status/log/diff-stat; bounded code/document reads; exact process-owner command-line inspection. Contracts from apps/classrooms-ui/api.ts and actual component request sites. Mapping is not functional acceptance; parent owns compiled/browser proof.

## Commits and handoff

None. Coordinator implemented presentation through a bounded writer, then owned frontend-only build/restart and browser verification. See [coordinator](2026-10-21-root-platform-glass.md).
