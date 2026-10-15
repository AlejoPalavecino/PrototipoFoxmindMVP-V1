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

The baseline has a minimal NestJS/Prisma/PostgreSQL foundation and dependency remediation, not a finished application. P3.1 account/session contracts are completed and independently reviewed. P3 remains in progress; P3.2 local captured-email infrastructure is completed and independently verified: [completed tasks](odd/tasks/p32-local-email.md), [coordinator handoff](docs/work-log/2026-10-15-01a13fc3-p32-local-email.md). P3.3 account/auth/session implementation is now authorized and in progress: [current tasks](odd/tasks/p33-accounts-auth.md), [coordinator](docs/work-log/2026-10-15-01a13fc3-p33-accounts-auth.md). Security/mail/outbox foundations are being prepared; no account/auth HTTP acceptance is claimed yet. User chose broad quoted/international mailbox support, while retaining uppercase-domain rejection. Mailpit is local-only; SMTP capture does not implement account verification, token consumption or the encrypted transactional outbox. Preserve its development volume. No Next.js implementation has started. Always use the roadmap's latest checkpoint and work record if this summary becomes older than the recorded work.
