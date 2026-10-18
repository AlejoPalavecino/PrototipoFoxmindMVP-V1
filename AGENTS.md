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

P3–P6 remain accepted on main. P7 is now implemented, independently verified and published to main via merge8e4fd2e; exact remote ref confirmed2026-10-18. A passive publication record may follow that merge. Accepted corrected source0ec37c7/final canonical fixtured9cdf06. Start with [roadmap](docs/implementation-roadmap.md), [P7 tasks](odd/tasks/p7-activities.md), [final independent proof](docs/work-log/2026-10-18-p7-verify-final.md) and [coordinator](docs/work-log/2026-10-18-root-p7-activities.md). Fresh whole-feature44/focused120/strict/old-contract/security proof plus bounded B1 correction26/actual1/canonical5 passed; histories, files, authorization, actual UI and P7 notification targets are connected. Preserve all historical failed/unavailable proof. The90s exception applied only to external independent preparation; shared30s API helper and all production policies are unchanged. No corrected shared-default30s or new full-sweep PASS is claimed. Native review is off/global, disabled/unmanaged; no native approval. STOP before P8: no grading execution, result publication, progress dashboards, deployment, retained-data mutation or secret-file reads authorized. Original dirty P3 checkout remains preserved; do not switch/reset/stash it. Preserve broad quoted/international mailboxes, uppercase-domain rejection, fixed session/token/password/private-file/admission/freshness policies and the development Mailpit volume. Any future Verify uses user-requested gpt-6.1-sol/xhigh. Reconcile actual Git/remote refs before future work; phase authorization is never inferred.
