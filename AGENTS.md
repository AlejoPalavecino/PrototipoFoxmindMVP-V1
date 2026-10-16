# FoxMind agent continuity

Start with [the implementation roadmap](docs/implementation-roadmap.md). It identifies completed phases, the verified implementation checkpoint and the next unfinished product work. Do not infer progress from the existence of database tables or screenshots.

## Before work

1. Read the roadmap, the [work-record protocol](docs/work-log/README.md), the relevant functional-spec sections and any applicable `odd/tasks/` feature document.
2. Inspect the actual branch/commit/working-tree state. Reconcile it with the latest work records before editing; preserve existing work.
3. Confirm the current user's scope. Roadmap items, past authorizations and work logs are context, not permission to implement every phase or publish changes. Follow higher-priority runtime/user instructions.
4. Create or update your own work record before implementation, with an actual session/task identifier when available, current scope and status. Follow the protocol's read-only exception if your role cannot write.

## Every agent reports its work

- Record what you changed or inspected, which phase/task it belongs to, the affected paths, observed check commands/results and the exact handoff.
- Writers maintain a separate record per agent/task/session in `docs/work-log/`; never overwrite another agent's record.
- Read-only agents must not violate their role to write a file. Return the same record fields to the coordinator, who persists an attributed record before closing the work. Do not imply the reviewer edited source or authored the coordinator's changes.
- On interruption, failure or handoff, record the partial state and first unfinished task. Failed/unavailable checks remain explicit; `completed` requires observed applicable proof.
- Status/authorization must never be inferred from a display name, session label, old memory note or another agent's completion claim alone.

## Shared roadmap ownership

Only the coordinating agent for the active work updates the shared phase/checkpoint summary after reconciling worker results and evidence. Children report phase/task coverage and their record path; they do not mark a whole phase complete themselves.

Parallel agents use disjoint edit surfaces or isolated worktrees, and separate work-record files. The coordinator merges the returned facts into the roadmap. Do not have multiple agents append to one central log simultaneously. If overlapping ownership is unclear, stop the conflicting write and ask the coordinator.

Keep detailed tracked implementation tasks in their existing feature documents; link them from the roadmap instead of maintaining contradictory task copies. Reopen only the affected task when a requirement or verified result changes, retain history, and refresh the next-session handoff.

## Closing checklist

- Update your record with outcomes, evidence, failures/skips/blockers, commit identity when one exists, and the next exact action.
- Have the coordinator update phase/checkpoint links only when the phase's full exit condition is satisfied. Finishing one endpoint or backend slice does not complete a phase that still needs UI/integration.
- If an entry must be completed before its own commit hash exists, record that evidence in a later attributed update; never invent a commit identity.
- Use memory, if available, as a recovery aid, not the only copy. The repository roadmap, feature records and work logs must remain readable without the previous conversation.
- Leave no secret values, access tokens, connection URLs with passwords, raw private prompts or personal student data in logs.

For a documentation-only task, run proportionate structural/link checks and state why functional tests were not needed. For behavior changes, follow the applicable test-first, independent-verification and native-review policies from the active runtime; this file neither weakens them nor creates review consent.

## Current boundary

P3.1 contracts/P3.2 local captured email and **nine P3.3 backend operations** are independently verified: session/CSRF, login/logout, registration, profile GET/PATCH and verification confirmation/resend. P3 remains in progress: three recovery/password-change operations and all P3.4 web/P3.5 browser journeys unfinished. Read [current tasks](odd/tasks/p33-token-flows.md), [coordinator](docs/work-log/2026-10-16-01a14539-p33-token-flows.md), [independent41PASS](docs/work-log/2026-10-16-mvbkihar-p33-verification-recheck.md) and [scope/tasks](odd/tasks/p3-completion.md). Parent72PASS/build0 and independent41PASS/freshbuild0 include actual owned cleanup; old partial/failed checks remain attributed. F404a94a/core2fecee9/orchestration769db2f are local, not published. Historical main P3.3 feature/old coordinator modifications protected/unstaged/untouched. Native T3 assessment unavailable, not approved or waived; T2-only choice never covers later units. Current objective: close P3 and STOP, no P4 work by this session. Safe necessary P3 decisions limited to session01a14539-ab7b-77dc-8eee-546a8c3dd168, not future-session/publication/destructive-data/sensitive-file/native consent. Preserve broad quoted/international mailbox support, uppercase-domain rejection and Mailpit development volume. Registration/verification encrypted outbox and token consumption verified; recovery is not. No Next.js implementation started. Reconcile latest roadmap, records and actual Git state before continuing.
