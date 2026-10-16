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

P3.1 contracts/P3.2 local captured email and **seven P3.3 T2 backend operations** are independently verified: session/CSRF, login/logout, registration and profile GET/PATCH. P3 remains in progress: five T3 confirmation/resend/recovery/password-change operations and all P3.4 web/P3.5 browser journeys are unfinished. Read [current execution](odd/tasks/p33-t2-execution.md), [coordinator](docs/work-log/2026-10-16-01a14539-p33-t2-resume.md), [independent PASS](docs/work-log/2026-10-16-mvb63m78-p33-t2-verification.md) and [scope/tasks](odd/tasks/p3-completion.md). Original P3.3 feature/coordinator metadata is preserved under separate historical document-only authority; current companion records reconcile that older checkpoint without maintaining its authority. T2 was explicitly left natively unreviewed, not approved; no future review waiver follows. Current user authorized P3 then P4 with safe decisions only for session01a14539-ab7b-77dc-8eee-546a8c3dd168, not standing future-session, publication, destructive-data, sensitive-file or native-consent authority. Preserve broad quoted/international mailbox support, uppercase-domain rejection and the local Mailpit development volume. Registration encrypted outbox/SMTP lifecycle is verified; account-token consumption/recovery are not. No Next.js implementation or P4 storage/scanner has started. Reconcile roadmap, current records and actual Git state before continuing.
