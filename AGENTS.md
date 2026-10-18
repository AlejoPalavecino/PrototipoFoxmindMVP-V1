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

P3 and P4 integration are completed locally on `codex/p4-p3-integration`. Start with [roadmap](docs/implementation-roadmap.md), [integration tasks](odd/tasks/p4-p3-integration.md), [independent verification](docs/work-log/2026-10-18-p4-verify-final.md) and [coordinator](docs/work-log/2026-10-17-root-p4-integration.md). Independent combined9/P3browser10/focused36, fresh API/Next builds, six migrations/drift0, actual S3/ClamAV/browser/restart proof and owned cleanup0 passed. Parent controls5PASS, writer legacy P4 checks67PASS; historical P3 pipeline81PASS/1baseline-reproduced1500ms failure remains explicit, not relabelled. Preview bytes/download are proven; perceptual synthetic PDF rendering is not. Native review off/global, disabled/unmanaged; no native approval. STOP at P4: do not integrate P5, publish, alter retained data or read secret files without new explicit authorization. Preserve accepted P3 mailbox/session/token/password policy, original dirty checkout and development Mailpit volume. Any future Verify worker uses user-requested gpt-6.1-sol/xhigh. Reconcile live Git/records before future work; no future phase authorization is inferred.
