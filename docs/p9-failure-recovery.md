# P9 owned service failure and manual recovery

These two first-proof groups exercise the existing UI and production API against uniquely owned disposable local services. They are not commands to run against retained data or an instruction to repeat accepted proof. Service proof passed, and the explicitly authorized L67 SMTP execution proved natural retry and actual captured-recipient recovery. Earlier fixture/environment failures remain attributed below.

## Boundaries

| Failure | Expected truthful behavior | Recovery |
| --- | --- | --- |
| Database paused before questionnaire edit | Fresh CSRF request503; no answer POST; mounted unsaved text and error remain, never confirmed saved | Restore exact DB; observe unchanged academic state; explicit Reintentar guardado persists the retained answer |
| Storage or scanner paused during a small practical upload | PUT503; nonready/error UI, no download or submission; reserved safety row has cleared operation lease | Restore exact service; Quitar cancels pending row without claiming quota refund; explicit upload creates a new intent and actual approved/private-hash attachment |
| SMTP paused before a fresh nonmember invitation | Invitation200/queued, not delivered; real worker records P5_MAIL_UNAVAILABLE/PENDING | Same Mailpit container/volume/ports restored; natural retry completes after its one-minute boundary, captured recipient and existing SMTP-acceptance UI observed in L67. |

All pauses have finally restoration and the native harness has defensive restoration and owned cleanup. No SQL approvals, direct-storage mutation, worker replacement/manual dispatch, clock shifts, product policy changes, new builds or foreign resources are permitted. Safety-upload rows legitimately mutate; accepted baseline file IDs/private hashes and the relevant full academic table union are protected separately.

## Bounded first-proof commands

Each test330000ms/foreground child360000ms runs once. Run the mail group only after the service group succeeds; any required actual failure stops without correction or retry.

```sh
node --test --test-isolation=none --test-concurrency=1 tests/p9-service-recovery-integration.test.mjs
node --test --test-isolation=none --test-concurrency=1 tests/p9-mail-recovery-integration.test.mjs
```

Existing scanner25s/client30s, storage10s, identity/DB and proxy deadlines remain unchanged. Longer explicit response observations do not change those limits. Existing Retry-After429 handling is preserved in shared public prerequisites, never treated as successful fresh data.

## Observed boundary

The first service command passed exit0/94689ms/native1PASS0FAIL0SKIP: real DB503/noanswerPOST/retained dirty value/manual persistence, and storage/scanner503/cancel-with-reservation/new-intent explicit UI recovery to actual ready/private-byte hashes. The first SMTP command failed exit1/55900ms/native0PASS1FAIL0SKIP after actual queued invitation and P5_MAIL_UNAVAILABLE/attempt1/next retry+60s were captured. It timed out on `Actualizar aula`, which the existing product renders only for a root load/action error, not normal invitation SMTP status. This is a fixture locator assumption, not a product delivery failure. The intended natural retry/captured-recipient proof did not run to completion.

Both exact owned runtimes restored services and reported native process/owned cleanup0/0; owner folders were empty. All1060 protected and4 candidate hashes matched after execution, before final documentation. No policy/build/product change or automatic correction/retry occurred. These commands are historical one-shot evidence, **not authorization to rerun**. Parent must resolve the fixture-only correction and remaining proof scope first.

### L65 finite closure attempt

Explicit L65 authorization permitted correcting both refresh points before candidate freeze and one remaining SMTP command. Both now use unchanged public openClassroom navigation plus completed200 detail/member/history/invitation observations, not an invented product refresh control. The rest of the pending natural-retry/captured-recipient path was audited once; syntax/static contracts and current25/30/build provenance passed without rebuild.

The one corrected command exited1/13884ms/native0PASS1FAIL0SKIP on `P4 Docker network unavailable` at fresh owned network creation, before browser/account/classroom/SMTP setup. No new SMTP behavior was observed. Native owned cleanup0; integrated-process cleanup N/A because never entered. The generated exact owner folder was empty; all836 nonowned source/test/build hashes and corrected test bytes remained unchanged. No readiness probe, correction, retry or accepted-body replay followed. Environment cause beyond the generic wrapper is unconfirmed. Parent must resolve this unavailable mandatory proof; no new execution follows automatically.

### L67 explicitly authorized restored-environment result

After the human restored Docker and explicitly authorized one SMTP execution, the unchanged prepared command passed exit0/151554ms/native1PASS0FAIL0SKIP under330/360. Actual queued invitation became PENDING/attempt1/P5_MAIL_UNAVAILABLE at14:45:14.838Z with nextavailable14:46:14.838Z. Same owned Mailpit resumed14:45:18.614Z; the normal worker completed attempt2 at14:46:16.980Z without manual dispatch, resend or clock changes. Actual synthetic recipient/matching invitation link was captured after completion. Both public classroom reentries completed200 reads and showed truthful pending-error then `Correo aceptado para envío.` status. Full academic hash and membership count remained unchanged; sending did not enroll the person.

All836 source/test/build hashes and corrected fixture bytes remained unchanged. Native process/owned cleanup0/0, exact owner folder empty; same Mailpit container/volume/loopback bindings restored and preserved.79 safe public responses were complete with no transport failures. Exact IDs, timestamps, hashes, cleanup and retained evidence are in the attributed record. This closes the assigned SMTP own-proof gap, not independent whole-P9 Verify, publication or deployment. No other accepted proof was replayed, and no further SMTP execution is authorized by this success.

See the [attributed worker record](work-log/2026-10-20-p9-failure-recovery-worker.md) for command results, safe evidence, exact resource ownership, cleanup, frozen hashes and remaining acceptance. No whole-P9, independent Verify, native approval, publication or deployment claim follows from these groups alone.
