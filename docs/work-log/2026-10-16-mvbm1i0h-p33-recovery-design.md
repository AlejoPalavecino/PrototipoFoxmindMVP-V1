# P3.3 T3-R — Read-only recovery cooldown assumption challenge

- Agent / role: scoped read-only design challenger.
- Task:mvbm1i0h-e-mqir.
- Persisted by: parent01a14539-ab7b-77dc-8eee-546a8c3dd168 from final report; reviewer wrote nothing.
- Date:2026-10-16.
- Branch/base:parent-supplied feat/p33-token-flows /0fd271cf4d2b9186b23a12525f1668efd886612f, not independently queried.
- Spec:T3-R,S1/S3/S5–S7, design only.
- Status:completed named assumption challenge, feasible-with-conditions; NO implementation/runtime acceptance.

## Scope and conclusion

Read injected backend skill first, specification through Log boundary, recovery parent record, normative contract and identity/security/outbox sources. No commands/tests/build/fixtures/Docker/HTTP/native/dependency/index/Git/repository writes. One erroneous identity/security.ts read returned ENOENT; actual identity-security exports/configuration subsequently inspected. No Git query or competing work.

No schema/lock-cycle blocker demonstrated. Existing AccountActionControl can hold private successful-request cooldown for BOTH known and unknown canonical mailboxes, only when separated from ordinary attempt counters. This proves neither implemented privacy nor runtime correctness.

## Exact representation and symbols

- Existing RateAction is recovery-request; abuseDigest validates configured membership at runtime: identity-security/configuration.ts:17,24,91,130–134.
- Stored action:identity.v1:recovery-request:success; subject:security.abuseDigest('recovery-request',`success\0${canonical}`). Do not pass stored action to abuseDigest, cast a new action or extend config.
- AdmissionBucket namespaces only ip/identifier/session; this marker must NOT go through IdentityStore.admit (persistence.ts:14,65–90).
- No last_success_at column exists. On the private marker ONLY, last_requested_at is successful acceptance, request_count a saturating0/1 sentinel. Initialize required window_started_at but never infer success/reset sentinel from its age. Count0 ignores initialized time.
- Schema:prisma/schema.prisma:165–176; initial migration:94–105,572; invariants migration:14 supports text action/key, required timestamps, nonnegative count, unique(action,subject_key), no user FK. HMAC pseudonym is not anonymous data.

## Minimal safe sequence

1. validateMailbox then PG canonicalEmail, not JS lowercasing; preserve broad mailbox/uppercase-domain policy (mail/mailbox.ts:5–26,persistence.ts:28–34).
2. Commit existing recovery IP/identifier admission separately; those timestamps move on every attempt, including denial (persistence.ts:65–94,runtime.ts:74–79).
3. Issuance transaction INSERT private marker ON CONFLICT DO NOTHING then SELECT FOR UPDATE; uniqueness serializes even unknown identifiers.
4. Marker BEFORE sorted owner user locks; resolve target, lock, re-read persisted ownership/canonical email; fresh store.now after waits. No prelock snapshot authority (persistence.ts:23–25,38–40,runtime.ts:56–61).
5. Cooldown=max(IDENTITY_POLICY.resendMinimumSeconds,rule.cooldownSeconds??60). Remaining>0 means generic RATE_LIMITED/positive ceil-seconds Retry-After for both. Policy recoveryTtlSeconds900/resendMinimumSeconds60 (sessions.ts:5–11), config cooldownminimum:47–49.
6. Known target: only live/unconsumed PASSWORD_RESET proofs invalidated, old jobs canceled,900s replacement/encrypted enqueue in same transaction. Never mark consumed token invalidated: terminal constraint forbids both (verifiers.ts:5,19–23,invariants:11–13,runtime.ts:160–173).
7. Unknown: no user/token/mail, but successful marker sentinel1/time MUST update before generic acceptance; no early return. Comparable work still required; marker symmetry alone does not prove timing privacy (contract:90).
8. Any rejection/enqueue failure rolls back marker/token/jobs together, retaining prior proof/history. Committed attempts remain allowed deltas. Preserve IdentityHttpError; other failures SERVICE_UNAVAILABLE; never swallow enqueue failure and commit marker.

## Lock/worker and reset conditions

Order:separate admission -> private success marker -> sorted users -> token/session mutations -> jobs. Reset/password change must never acquire marker after user lock; current source has no reverse edge.

enqueueAccountMail reacquires user lock then validates/enqueues; caller must already own required sorted locks (repository.ts:10–38). Worker token/user checks are ordinary reads, job claim/retry/finish separate statements on nontransactional client, SMTP after statements; no job-lock->user-lock reverse edge found (repository.ts:61–85,worker.ts:32–80). Cancellation clears pending/running payload/lease; in-flight mail may arrive, no recall/exactly-once promise (repository.ts:43–54).

Reset confirmation: hash outside TX, then sorted owner/current-user locks, persisted session/wrong-account recheck and conditional purpose/expiry/unused consumption; password update/all-session revocation/consumed-token mail cancellation atomic. No email-verification change/auto-login. Existing precedents runtime.ts:56–63,109–136. Eventual explicit transport branches precede logout fallback, preserve Origin/conditional CSRF, clear cookie only after successful reset (transport.ts:8–9,69–95).

## Outcome and handoff

Commands:none; file tools only. S1/S3/S5–S7 covered as design conditions, S7 WHOLLY UNVERIFIED behaviorally. No R code/tests/native PASS, new commit or changed authority over verified nine operations. Parent persists report, then meaningful public RED including known/unknown cooldown symmetry, rollback and concurrency before behavior. No new product decision identified; later independent runtime proof still mandatory.

## Key Learnings

- AccountActionControl supports separately namespaced successful acceptance, not an attempt bucket.
- abuseDigest requires an existing configured action; domain separation belongs in its identifier argument.
- Current worker job updates acquire no user mutation locks, so no inspected reverse edge reaches marker-before-user ordering.
