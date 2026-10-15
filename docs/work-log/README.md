# Per-agent work records

Every agent working on FoxMind reports what it actually did, what was verified and where the next session should continue. The [roadmap](../implementation-roadmap.md) is the shared phase summary; these records are attributable work evidence, not a second competing product specification.

## One record per agent/task/session

Use `YYYY-MM-DD-<short-actual-session-or-task-id>-<work-unit>.md`. If the runtime exposes no identifier, use an explicitly unavailable ID plus a collision-free filename; never invent a real routing identity. Display names do not authenticate ownership or grant permission.

Create the record before implementation. Update only your own record during work and before interruption/handoff. Parallel agents use separate files; the coordinator owns changes to the shared roadmap and reconciles worker records. A child returns its record path and the phase/task/spec IDs it covered.

Read-only agents do not write against their role restrictions. They return the fields below in their final handoff; the coordinator writes an attributed record on their behalf. Distinguish the reviewer, the coordinator who persisted the report and any writer who made corrections. If no coordinator can persist it, explicitly report that missing handoff proof instead of pretending a file exists.

## Required record

```markdown
# <Work unit> — <Outcome>

- Agent / role:
- Session or task ID: <actual ID, or unavailable>
- Persisted by: <only needed when a coordinator records another agent's report>
- Date:
- Branch / worktree:
- Starting commit:
- Phase and detailed task/spec links:
- Status: not_started | in_progress | blocked | completed | dropped

## Request and scope
<Requested outcome, constraints and non-goals; preserve exact user strings when relevant.>

## Work performed
<Changed or inspected paths and actual results; no unperformed work.>

## Verification
<Exact commands/examples, observed exits/results and failures/skips/unavailable checks.>

## Commits and outcomes
<Actual commit IDs when available; distinguish implementation, verification and delivery.>

## Handoff
<First unfinished task, exact next action, blockers and decisions needed.>
```

Include an interruption/decision timeline if needed. Do not rewrite another agent's historical findings to imply a test passed originally; append the correction and its observed result. Earlier review omissions/consents remain candidate-scoped, not permission for later candidates.

## Completion and reconciliation

- `completed` requires the assigned outcome and applicable checks to be observed. A partial implementation or failing required test is not completed.
- `blocked` names the external decision, access or proof needed to proceed. `dropped` is not completed.
- Record commits only after observing them. A record cannot contain its own final commit hash before that commit exists: cite an earlier verified work-unit commit or add a later attributed update.
- Keep publication claims separate. A successful local commit is not a push; verify the actual remote ref after an authorized push. Git's current state and the delivery result supersede an earlier prepared-handoff snapshot.
- When evidence changes, the coordinator reopens only the affected task and updates the roadmap's checkpoint/next action. Do not silently overwrite a conflicting phase status or merge concurrent edits by timestamp alone.
- Memory is optional recovery support; all essential handoff facts must remain available from versioned project documents and Git.

No passwords, access tokens, credential-bearing connection URLs, raw private prompts or student personal data belong in these records. Record useful errors with secrets redacted. The protocol is a project instruction, not runtime enforcement of every possible external agent; the coordinator verifies compliance before closing work.

## Current records

Records are discovered by listing this directory; no shared index append is required from every child. The coordinator may add durable links from the roadmap for important checkpoints.

- [P3.1 — Independent contract security/requirements review](2026-10-15-mva0p514-p31-contract-review.md).
- [P3.1 — Account/session contracts, coordinator](2026-10-15-01a13fc3-p31-contracts.md).
- [P3.1 — Read-only requirements map, attributed by coordinator](2026-10-15-mv9zsb0p-p31-requirements-map.md).
- [DOC-001 — Cross-session roadmap consolidation](2026-10-15-01a13fc3-roadmap.md).

Earlier database/backend/security work predates this protocol. Its existing task, verification and commit history remains authoritative evidence; no fictional per-agent historical records are generated.
