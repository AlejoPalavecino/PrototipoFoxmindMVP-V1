# Agenda event UX — functional review and proposal

- Agent/task: /root, coordinator; runtime session identity unavailable.
- Date: 2026-10-24.
- Branch/worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind.
- Starting commit: 2a6aa40.
- Scope: user asks how to improve event creation, organization and usefulness. This record covers review/proposal; no redesigned UI is claimed implemented.
- Status: completed (proposal and evidence limits, not feature implementation or visual acceptance).

## Work performed

Read roadmap, protocol, existing event form/draft/editor and Folder theme. Applied product-design index/audit guidance, context preflight (no saved context) and existing ego-browser skill. The user-mandated ego surface takes precedence over the plugin's default browser preference. No external research or new dependency was needed for this code-specific analysis.

Read-only /root/agenda_event_ux_explore inspected the same paths and consulted Engram reads. Its attributable findings: purpose wording, fixed 09–10 suggestion/zone, resetting times on all-day toggle, lack of separation between basic/optional fields and limited recurrence explanation. Preserved privacy, local temporal/DST, ALL_DAY exclusive end, recurrence 53 and CAS/draft invariants. Explorer made no edits/builds/tests or memory writes. Coordinator persists its returned fields here; memory reads initially used an incorrect alias, then succeeded with the detected project.

Created one dedicated review Space 4 agenda-evento-ux-2026-10-24, separate from the user's kept manual Space 3. Logged into the existing synthetic preview via its real form, opened New event and saved current DOM snapshot in ignored artifacts. No event was saved. Screenshot attempt failed Page.captureScreenshot timeout, so no screenshot was accepted and no visual audit is claimed. No retry/new-space workaround. Finish closes only the review Space; manual preview remains intentionally running.

## Outcome and checks

[Concrete proposal](../agenda-event-ux-proposal.md) describes one-screen basic creation, progressive options, date/duration handling, explicit weekly summary, field errors and finding the saved result. Recommendations are grounded in inspected code/live DOM, not inferred contrast/layout metrics. No domain/API/database or production UI changes. No functional tests/builds required for the documentation-only proposal; structural links and diff whitespace checks apply.

Next exact action: use the proposed first implementation scope for a separate UI/TDD change after the design direction is settled. Preserve the running preview and local branch; no main integration/publication. Engram writes remain prohibited while host registration is unavailable.
