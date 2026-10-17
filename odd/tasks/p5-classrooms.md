# P5 — isolated classrooms and enrollment

Base 767174bc61f2fc3a80c3937c4a0519b1b90523e0; branch codex/p5-classrooms. User authorizes all P5 design/implementation in this worktree, no P3/P4 edits or chained integration yet. [Record](../../docs/work-log/2026-10-16-id-unavailable-p5-classrooms.md); [spec](../../docs/foxmind-v1-functional-spec.md) sections 2–6/11/14/15. Historical P3 status and grants inherited from P4 are not current authority.

## Architecture and acceptance

- Required trusted authentication port rechecks server-side sessions after user lock; verified email required. No public default identity adapter or client-selected owner/role.
- Database-backed transactions serialize user -> classroom -> draft/enrollment/invitation. Reuse inherited P4 promoteDraftPlan inside publication transaction; never recreate file inspection/security.
- Private durable versioned drafts do not expire. Required text/cover/IANA timezone/year/plan and nonempty units/topics validated at publication, more permissive bounded incomplete saves. Conflict detection prevents silent overwrite. Published timezone immutable. No permanent classroom deletion.
- First code entry is a minimal preview only; explicit short-lived actor/code-bound confirmation is required. Rotating code invalidates old previews; former members cannot use codes. Raw codes are never stored/logged; teacher receives a newly generated code at creation/rotation.
- Invitations use original validated mailbox spelling and case-insensitive lookup, seven-day generation lifecycle, unique pending recipient/classroom, explicit verified-recipient acceptance. Durable encrypted delivery retries/rechecks current generation; no automatic enrollment. Resend after departure must issue a new invitation identity; old invitations cannot restore access.
- One durable enrollment per classroom/student; append membership periods, only one active. Leaving/removal closes period and preserves all academic history. Archive permits reads, denies all modifications except teacher reactivation, including membership changes and invitation/code mutations.
- Reusable P5 UI lives outside P3 apps/web; includes Enseño/Estudio, four-step wizard/resume, plan safety state, invitations, code preview/confirmation, students/names-only classmates, settings/archive/history. Production session/CSRF and final P3 shell integration deferred; isolated host must be visibly identified and loopback-only with no production trust shortcut.
- Owned databases, ports, containers/volumes and generated output only. Forward migrations; never alter historical migration SQL. Explicit local configurable quotas; no production quota/provider choices.

## Work units

| ID | Outcome | State |
|---|---|---|
| P5-A | Contracts, policy, cover assets and meaningful RED/GREEN | in_progress |
| P5-B | Draft persistence/publication, P4 plan promotion, settings and read models | pending |
| P5-C | Code previews, invitation delivery/acceptance and concurrency | pending |
| P5-D | Membership periods, archive/reentry, privacy and retained history | pending |
| P5-E | Opt-in API and reusable responsive UI with truthful states | pending |
| P5-F | Real isolated runtime/browser verification, review disposition and handoff | pending |

Each behavioral work unit keeps its tests/docs together. Risks: authorization, privacy, durable email, migration/concurrency and file promotion. Review overages reported, never compressed to meet budget. Native reviews require candidate-specific consent; implement and verify concrete candidates before asking. No independent-review success without an actual independent reviewer.

## Exit

Isolated scope: verified fixture teacher publishes a valid persistent classroom using real safe P4 plan; different verified fixture student previews/confirms or accepts invitation; unauthorized, stale, duplicate, archived and former-member operations rejected without changing records. UI exposes actual isolated API results with loading/errors/retries. Full P5 phase exit additionally requires later accepted P3 identity/web integration; fixture authentication never proves that integration.
