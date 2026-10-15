# P3.1 — Read-only identity requirements map

- Agent / role: `gentle-ai-explore`, read-only requirements mapper.
- Runtime task ID: `mv9zsb0p-6-r450` (observed by the coordinator); agent session ID not exposed.
- Persisted by: el Gentleman, primary orchestrator, session `01a13fc3-5dac-75fc-a82f-71fe21722f18`.
- Date: 2026-10-15 (persistence date).
- Branch: coordinator branch `docs/p3-1-account-session-contracts`; mapper did not inspect Git metadata.
- Starting commit: `a3bb3dfee69eaaf1273d2521e1f9fd35c3e6318b`, supplied by coordinator, not independently audited by mapper.
- Phase/task: P3 / P3.1.
- Status: `completed` for requirements mapping only; no contract design or implementation.

## Request and scope

User request, verbatim:

> Bien ahora si vamos con el P3.1

Read-only map of approved account/session requirements and current schema support. No HTTP/library research, code writes, installs, shell checks, commits or publication by the mapper.

## Work performed

Read AGENTS.md, roadmap/protocol, the prior DOC-001 handoff, relevant functional specification sections/examples and identity models, plus the existing backend configuration/application/health boundary.

Confirmed product evidence:

- Specification lines92–105and143–147: email/password only,16–128-character passwords, verification1hour, recovery15minutes, single-use links,60-second resend minimum with previous-link invalidation; unverified users can sign in but are restricted to verification/resend/sign-out and cannot use classrooms.
- Specification lines110–139: invitations require invited verified account and explicit acceptance; registration/verification does not enroll; generic enrollment errors and invitation-only re-entry apply. Classroom invitations have separate7-day validity.
- Specification lines662–665: first/last name editing, read-only email, password change/sign-out and no exclusive global classroom role.

Schema evidence:

- User fields/unique normalized email/verification timestamp: schema lines100–131.
- Authenticated Session with required user, token hash, expiry, revocation and last-seen: lines134–146. No anonymous session or prescribed lifetime.
- AccountToken purposes/lifecycle: lines11–14and149–162. No generation field or automatic single-use enforcement merely from the schema.
- AccountActionControl: lines165–174, supporting action/subject/window/counter but not prescribing thresholds.
- No dedicated encrypted-mail outbox model was found in the inspected schema; a secure outbox policy is not confirmed by existing JSON payload capacity.
- Existing backend configuration/controller registration has database URL/port and health routes only, not identity routes. Mapper did not capture line-numbered citations for these backend files.

## Verification

No runtime checks performed. This report is source mapping, not evidence of working authentication, token enforcement or delivery. No CodeGraph query/init or memory tool was available/required for this bounded pass.

## Commits and outcomes

No writes, commits or pushes by the mapper. The coordinator persisted this attributed report. Mapping is complete; endpoint design/security implementation remains unstarted. The original roadmap's not-started status was the inspected pre-contract snapshot, not proof that the newly authorized coordinator work cannot start.

## Handoff

Coordinator must distinguish technical choices from unconfirmed product policies. Routes/payloads, cookie/token transport/consumption and configurable abuse thresholds can be specified while preserving agreed requirements. Session lifetime, effects of password change on other sessions and duplicate-registration account-existence behavior were not established by the source; do not present them as confirmed. Resolve those choices before finalizing the contract.

## Key learnings

1. The schema supports persistent user sessions without establishing session lifetimes.
2. Recovery must not disclose account existence and enrollment errors must protect classroom records.
3. No dedicated encrypted-outbox model was confirmed by this source inspection.
