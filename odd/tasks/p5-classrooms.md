# P5 — isolated classrooms and enrollment

> Historical isolated checkpoint below is preserved. The later authorized P3/P4/P5 integration is now independently accepted; see [current integration](p5-integration.md). Current main publication is tracked there. The old pending candidate review does not override the current off/global native mode or authorize future phases.


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
| P5-A | Contracts, policy, cover assets and meaningful RED/GREEN | implemented; writer policy checks PASS; independent/native pending |
| P5-B | Draft persistence/publication, P4 plan promotion, settings and read models | implemented; writer SQL/runtime proof PASS; independent/native pending |
| P5-C | Code previews, invitation delivery/acceptance and concurrency | implemented; writer SQL/actual captured SMTP proof PASS; independent/native pending |
| P5-D | Membership periods, archive/reentry, privacy and retained history | implemented; writer SQL/runtime/history proof PASS; independent/native pending |
| P5-E | Opt-in API and reusable responsive UI with truthful states | implemented; types/bundle/browser proof PASS; final P3 shell deferred |
| P5-F | Real isolated runtime/browser verification, review disposition and handoff | writer46checks PASS plus22regressions; independent/native consent requested; full integration deferred |

Each behavioral work unit keeps its tests/docs together. Risks: authorization, privacy, durable email, migration/concurrency and file promotion. Review overages reported, never compressed to meet budget. Native reviews require candidate-specific consent; implement and verify concrete candidates before asking. No independent-review success without an actual independent reviewer.

## Exit

Isolated scope: verified fixture teacher publishes a valid persistent classroom using real safe P4 plan; different verified fixture student previews/confirms or accepts invitation; unauthorized, stale, duplicate, archived and former-member operations rejected without changing records. UI exposes actual isolated API results with loading/errors/retries. Full P5 phase exit additionally requires later accepted P3 identity/web integration; fixture authentication never proves that integration.

## Implemented checkpoint and review boundary

Isolated source/runtime candidate `f3263e56b3a336aaa6f25ca577bca74fab3fc6e0`. All P5-A through P5-E implementation/writer checks are complete; review acceptance remains pending. [Operations/API/UI handoff](../../docs/classrooms.md). Fresh API build0, UI types0/bundle0, focused37PASS + real9PASS =46checks, additional inherited22PASS and full npm audit0. Exact failures, missing preimplementation RED coverage, browser/axe limitations, cleanup interruption and corrective runs remain in the coordinator record.

No source edits after the frozen candidate; subsequent task/roadmap/record changes are passive evidence. Original compact local units precede standard readability formatting; resulting formatting/UI/runtime commits exceed400 authored lines (see record). This is explicitly reported, not compressed or authorized for oversized publication. No native/independent approval or publication exception inferred. A candidate-specific request for native review and optional independent read-only agents is pending; an unanswered/default UI option is not consent.

First unfinished acceptance action: obtain the actual candidate-specific review answer, then run only authorized review/verification, persist attributed evidence and correct any findings with a new candidate and applicable consent. Integration remains for the later chain P3 → P4 → P5; do not merge active/uncommitted P3 or later P4 into this isolated branch now.
