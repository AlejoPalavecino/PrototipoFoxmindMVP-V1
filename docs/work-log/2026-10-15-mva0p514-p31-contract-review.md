# P3.1 — Independent contract security/requirements review

- Agent / role: `gentle-ai-verify`, independent read-only technical verifier.
- Runtime task ID: `mva0p514-7-xh9l` (observed by coordinator); agent session ID unavailable.
- Persisted by: el Gentleman, coordinator session `01a13fc3-5dac-75fc-a82f-71fe21722f18`.
- Date: 2026-10-15 (persistence date; runtime date not independently inspected).
- Branch: `docs/p3-1-account-session-contracts`, supplied context only.
- Starting commit: `a3bb3dfee69eaaf1273d2521e1f9fd35c3e6318b`, supplied by parent, not independently Git-audited.
- Candidate tree: `a8bf383e2042968515ea22bea238d7a11493b41f`.
- Phase/task: P3 / P3.1.
- Status: `completed` for contract verification only.

## Request and scope

User request: "Bien ahora si vamos con el P3.1". Checked the three exact questionnaire selections in the coordinator record against the functional specification and contract artifacts. No P3.2/P3.3 execution or runtime authentication testing.

## Work performed

Inspected snapshot AGENTS.md, roadmap/protocol, coordinator and mapper records, full functional-spec sections2/3/12, contract guide/OpenAPI and structural helper. The read-only agent made no source/document edits, installations, commits or pushes. The coordinator persisted this attributed report after the verifier settled.

## Verification

Executed once from isolated archive `.test-artifacts/p31-verify-3owGpC`:

`node --test tests/p31-contracts.test.mjs > verifier-contracts.log 2>&1`

Observed exit0:8tests,8PASS,0FAIL,0skipped/cancelled. Shell stdout/stderr were empty because redirected; exact combined output remains in the local `verifier-contracts.log`. No retries, additional executable probes, native review or runtime suites.

## Commits and outcomes

**PASS — contract artifacts only; no blockers.**

- R1 PASS: confirmed password, token, resend and session policies and all three user selections preserved.
- R2 PASS:12operations match routes/access/errors/cookies/CSRF; no proposed identity-switching, implicit enrollment or classroom-privacy bypass found.
- R3 PASS: token consumption, revocation, stale-password login race and account-independent throttling/counter exceptions addressed without fictional schema fields.
- R4 PASS: authenticated-encrypted outbox, external keys, rotation, cleanup and failure handling practical and explicitly new design, not implemented capability.
- R5 PASS: helper/runtime limitations explicit; no whole-P3 or authentication execution claim.
- R6 PASS: coordinator/mapper attribution distinguished; later units still require authorization.

Proof limits: not a complete OpenAPI/JSON-Schema or format validator; no authentication, PostgreSQL concurrency, hashing, mail/encryption, rate-counter or session runtime proof. Parent's unchanged-source/schema diff was supplied rather than rerun independently.

## Handoff

Coordinator can close P3.1 after its final spot check and evidence/roadmap reconciliation. P3 remains incomplete; P3.2 local captured-email infrastructure is next, not started.

Non-blocking advisory for P3.3 implementation acceptance: explicitly name abuse-counter storage outages in the fail-closed503 policy. The current storage policy is general. No correction batch or new review was required by this advisory; do not claim the runtime failure case has been tested.

## Key learnings

1. Account verification never grants classroom enrollment.
2. Session rotation preserves the original absolute expiry.
3. Deferred token delivery requires encrypted recoverable secrets.
4. Structural helper success does not prove authentication security.
