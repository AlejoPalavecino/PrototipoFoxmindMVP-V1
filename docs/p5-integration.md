# P5 integration with accepted identity and private files

P5 classroom behavior is connected to accepted P3 sessions and P4 custody in the actual API/Next application. Local acceptance passed fresh independent verification and one bounded international-mailbox correction/recheck; main publication is tracked separately. [Tasks](../odd/tasks/p5-integration.md), [coordinator](work-log/2026-10-18-root-p5-integration.md), [backend configuration](p5-host.md), [web composition](p5-web.md).

## Local verification

```powershell
npm run test:p5
npm run test:p5:integration
npm run test:p4:integration
npm run test:p3:browser
```

The first command preserves the isolated P5 fixtures/preview contracts. It does not prove accepted P3 sessions. The integration command freshly builds the API and production Next, creates owned PostgreSQL/private storage/ClamAV/captured-SMTP services, deploys seven migrations and checks drift. It registers/verifies actual accounts, uses the classroom wizard with a binary plan, explicitly enrolls through codes and captured invitations, checks denied-command data snapshots and current membership/archive boundaries, restarts actual data/API resources, and proves a pending invitation can deliver after restart without automatically enrolling a newly registered recipient.

Fixtures contain no retained development data. Keys are generated once in memory for that owned fixture and reused across its actual application restart; application host configuration requires durable operator-provided keys. The test-only worker stop invokes the real lifecycle before HTTP invitation issuance; no synthetic background-job or session rows replace application behavior. Random fixture volumes preserve data across the tested restart and are removed on exit. Never run retained development cleanup/prune commands to repair these fixtures.

The seventh forward migration adds classroom revision guards; already-applied P3/P4 migrations are preserved. Vite's isolated tooling requires newer CSS dependencies, kept in its nested lock path rather than changing accepted Next/Tailwind dependency paths. Exact direct pins and the full lock graph are checked.

## Acceptance boundaries

Historical isolated P5 evidence46checks/22regressions and current writer unit checks remain attributed, not automatically accepted as integrated. Preserve any failed/skipped/unavailable command in the coordinator record. The historical P3 D1 startup-child1500ms timeout reproduced on its baseline remains an advisory, not a new global pipeline PASS. No P6 plan maintenance, P7 authoring/submission or P8 grading implementation is included. Native review remains user-owned and off/global; no native approval is claimed. Main publication occurs only after full in-scope proof and actual remote confirmation.

## International recipient identity

Invitation matching uses transaction-local parameterized PostgreSQL `lower(text)`, the same canonicalization rule as accepted P3 identity. JavaScript lowercase is not interchangeable for Greek sigma or dotted capital I. Original validated mailbox spelling remains in the encrypted delivery envelope; account validation and accepted international/quoted formats are unchanged. The real public regression `tests/p5-international-invitations.test.mjs` covers these mailboxes and prior ASCII behavior, pending visibility, equivalent-recipient duplicate rejection without data changes, explicit acceptance and leave/reinvitation history. Only classroom setup uses SQL; identities/sessions and invitation operations use actual public P3/P5 interfaces.

## Observed acceptance

[Independent proof](work-log/2026-10-18-p5-verify-final.md): original combined9real+16controlled, isolated46, P49, P3browser10; actual six-to-seven migration upgrade preserved34oldtables; audit0/35direct/707lockedges0problems. The sole matching blocker was corrected and fresh targeted4PASS/original reproPASS. Own corrected combined13real+16controlled and focused42PASS, parentcontrols8PASS; all reported owned cleanup0. Controlled UI cases are not counted as real identity journeys. Historical failed preparation and P3 baseline timing advisory remain attributed; no native approval or production readiness is claimed. No P6+ implementation/deployment.
