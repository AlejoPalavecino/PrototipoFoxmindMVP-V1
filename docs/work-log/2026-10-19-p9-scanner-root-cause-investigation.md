# P9 scanner root-cause investigation — Immediate guard confirmed; underlying cost unresolved

- Agent / role / actual task: /root/p9_scanner_root_cause, fresh read-only investigator (gpt-6.1-sol/xhigh); not final acceptance Verify.
- Persisted by: /root coordinator; the investigator did not write repository files.
- Date: 2026-10-19 (client date); authoritative session ID unavailable.
- Branch/worktree: codex/p9-local-validation, managed p4-p3-integration checkout.
- Starting/ending commit: b1f024a3eda682a3aa52dd6f5a5d3c61c7126f12.
- Phase/spec: [P9 T3/S1,S2,S5,S6](../../odd/tasks/p9-local-validation.md), L49-L52.
- Status: completed read-only investigation; underlying root cause, correction and positive capacity proof remain unavailable.

## Outcome

The requested conditional fresh agent was launched after the current-budget diagnostic returned NONCLEAN. The immediate cause is confirmed: ClamAV reaches its configured25-second scan allowance and reports an incomplete scan through Heuristics.Limits.Exceeded.MaxScanTime FOUND. The application deliberately fails closed. The evidence does not yet identify an implementation defect or a safe corrective change.

## Observed evidence

- Exactly one L49 diagnostic: exit0/47160ms/native1PASS0FAIL0SKIP means evidence captured, NOT capacity acceptance. One INSTREAM sent50000000 bytes and returned the heuristic after25841ms with client30000ms.
- Actual image/configuration/caps verified before/after: MaxScanTime25000, client30000, unchanged1.5CPU/4GiB. Five successful asynchronous samples showed92.70-100.25%CPU and1.211-1.25GiB memory/PIDs3; one final monitor child was aborted during normal shutdown. Setup8.434ms/stopwait4.435ms;7701ms summed child wall time overlapped the scan, not synchronous blocking of its event loop.
- Input SHA256 remained87c87df114bc78e95430afc0e8b16d54b2ce27708162f8155a319e1ae084c9fd. Protected1100/all3 candidate hashes unchanged; ownedcleanup0 and exact owner2d3516e3f0644fa8 folder empty. No additional scan, build, upload, parser, fixture generation or source correction.
- Read-only ZIP header/EOCD inspection found one unencrypted stored work.txt entry: compressed and uncompressed sizes49999886; ZIP50000000. This is not demonstrated archive expansion and does not prove malware-free content.
- The positive fixture is still highly synthetic: roughly625000 eighty-byte records drawn from five repeating phrases and sequential numbers (tests/p9-positive-max-files.mjs:7-19). Bounded lines alone do not establish realistic classroom-file characteristics or cheap signature matching.
- CPU/memory samples do not establish throttling, OOM, peak pressure or host contention. One busy scan worker is a supported inference, not identification of the expensive matching stage.
- The image is pinned, but scripts/p4-services.mjs invokes freshclam with a tolerated update failure. Actual loaded database identities were not captured. This is a reproducibility gap, not proof of corrupt/outdated signatures or broken freshness enforcement.

## Primary-source investigation

The investigator read tagged ClamAV1.5.4 source, not an assumed current implementation:

- [Elapsed-time guard and heuristic](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/libclamav/others.c#L1296-L1319).
- [Synchronous individual scan callback](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/clamd/scanner.c#L448-L452): increasing MaxThreads is not an evidenced acceleration for this file.
- [20MiB normalization default](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/libclamav/default.h#L47), [large-input normalization exit](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/libclamav/scanners.c#L2678-L2682) and [raw matching](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/libclamav/scanners.c#L5400-L5435). Unbounded text normalization is not a supported diagnosis; outer ZIP/extracted-file matching remains plausible but unproved.
- [Supported Debug observation setting](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/etc/clamd.conf.sample#L278-L280) and [cgroup CPU counters](https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu-interface-files).

## Causality and next decision

High confidence: the time guard causes the native NONCLEAN result; scanner.ts accepts only exact stream: OK and translates FOUND to FILE_REJECTED. Underlying cost remains unknown: matching/parser stage, signature/PCRE workload, throttling/contention or upstream defect. Triage class E: insufficient discriminating evidence. No matching official1.5.4 defect was found that justifies a specific upgrade or configuration fix.

Keep25/30s, all protections, resources, size/quota and330/360s unchanged. Proposed NOT RUN: exactly one same-file instrumented diagnostic using diagnostic-only Debug yes, bounded asynchronously retained timestamped trace, actual database identities and before/after exact-owned cgroup cpu.stat/memory counters. This requires new explicit authorization. Logging adds observer overhead and may narrow the cause without identifying a signature or producing CLEAN; do not increase budgets blindly.

Five actual CLEAN/ready maximum-size attachments, count-boundary/receipt/restart evidence, T4-T7 and final whole-P9 independent acceptance remain pending. No merge, push or deployment.

## Work performed and checks

Investigator read feature/spec/roadmap/protocol, local scanner/config/fixture sources and retained JSON/logs/readiness; used read-only Get-Content, Select-String/rg, Git status/ref/stat and stream header inspection; retrieved official tagged sources into memory. Initial guessed-path searches failed before actual paths were resolved. No tests/scans/builds/containers/benchmark/uploads/Git mutations or cleanup; cleanupN/A. skill_resolution: paths-injected. Engram327-328 saved by investigator.

Coordinator spot check compared retained nativeScan.verdict/elapsed/bytes with apps/api/src/files/scanner.ts:31-33; exact rejection mapping confirmed. Passive attributed record needs structural/readback checks only, not another runtime execution. This report does not claim a root-cause correction or final Verify PASS. Risk: none for the passive attributed record; underlying pending code unit risk items2,3,5.

## Retained evidence

- External scanner-resource-diagnostic-5topTv/safe-resource-evidence.json: nativeScan, monitor.samples, snapshots.provenance, afterResources.
- External scanner-resource-run-yTXtBS: logs/readiness/hashes/investigator-locators.json.
- [Diagnostic writer record](2026-10-19-p9-scanner-resource-diagnostic-worker.md).
- No recursive scratch cleanup; exact full paths remain in the diagnostic writer record.

## L53 targeted interpretation — Outer ZIP PCRE stage localized

- Read-only investigator: /root/p9_scanner_root_cause (same gpt-6.1-sol/xhigh investigator, targeted new-evidence interpretation, not final acceptance Verify).
- Persisted by: /root coordinator; investigator wrote no repository file.
- Date: 2026-10-20 client date; same branch/HEAD b1f024a.
- Status: targeted investigation completed; a defective signature or engine implementation is not established, and positive capacity remains unproved.

### New observation

Exactly one detailed diagnostic completed exit0/58432ms/native1PASS0FAIL0SKIP, ScanCount1, diagnostic capture only. Same retained50MB SHA unchanged, native26088ms reports MaxScanTime FOUND under effective25000ms/client30000ms. Only a fresh uniquely owned generated config gained Debug yes; source/helpers/builds/policies/resources unchanged. Captured loaded ClamAV1.5.4/daily28158, main63/bytecode339 metadata and full hashes.

Cgroup deltas during that scan:26039008CPU microseconds,25622707user microseconds, nr_throttled0/throttled_usec0, all memory-event deltas0, peak1289969664bytes below4GiB. This records no own-quota throttling or OOM during the measured interval; it does not exclude host contention or logging overhead. Protected1103/all3 candidate hashes unchanged, ownedcleanup0/exactownerc3800ac7fbce30fa folder empty. STDOUT dropped1644162middlebytes under declared caps. Received STDERR213462bytes/2456lines had no collector-dropped bytes; not all daemon output is claimed complete.

### Trace localization

| Retained stderr lines | Observation |
|---|---|
|996-1014|ZIP recognition and stored-entry extraction; entry recognized as ASCII.|
|1018-1030|Extracted49999886-byte text raw scan completes around02:52:12.014; oversized script normalization explicitly skipped.|
|1031-1035|Control returns to outer ZIP; full50000000-byte map reaches regex matching at02:52:13.144.|
|1036-2444|235 PCRE2 execution reports, roughly13.149-36.348, reported results -1/no match. No printed match-limit/recursion/memory error.|
|2446-2453|Global time heuristic is appended; logical-signature deadline check and halt follow.|

The approximately23.2-second observed interval localizes cumulative expensive work to outer-archive PCRE processing and associated overhead, not ZIP extraction or unlimited text normalization. Log timestamps are not isolated per-regex CPU measurements. The last printed expression is identifiable but is not proven the sole culprit or a defective signature.

### Misleading upstream message

Tagged ClamAV1.5.4 [matcher-pcre.c](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/libclamav/matcher-pcre.c) emits the text cli_unzip: Time limit reached inside cli_pcre_scanbuf, before another match when its global deadline check fails. This is a misleading log label, not evidence the unzip stage consumed the scan time. The PCRE report occurs after a match returns. [matcher.c](https://github.com/Cisco-Talos/clamav/blob/fa59fca15872bb8a914ba4c68188bcc8a502cbdf/libclamav/matcher.c) uses a shared periodic deadline check for the subsequent logical/YARA message; that label does not identify a costly YARA rule. Full-buffer matching is deliberate, not by itself a demonstrated engine defect.

Parent spot check read retained1012-1037/2439-2454 and counted235 PCRE report headers, then checked the exact misleading message and report/deadline ordering in tagged primary source. Source function/string evidence is authoritative; rendered source line numbers may differ. Investigator found no confirmed matching published fix in bounded official searches.

### One proposed next step — Not implemented

Request fixture-only authorization for genuine valid stored ZIPs containing meaningful binary classroom assets plus modest text, rather than625000records built from five repeated phrases. Preserve existing expensive ASCII archives and rejection evidence as stress cases. Keep exactly50MB each/five distinct files and every25/30s,330/360s, format/AV/size/quota/digest/count/receipt/restart assertion. No renamed binary-as-text, junk padding, ignored chunks, exclusions or disabled signature matching.

This is representative positive capacity coverage, not a promise that every huge repetitive text archive completes in25seconds. Actual CLEAN remains unproved. One gated first-file approval/hash before files2-5 and full subsequent assertions require new explicit execution authorization. Another generic diagnostic rerun is not currently warranted. No change was implemented or scanned.

### Attributed verification and handoff

Investigator only read source/records/retained trace, counted/filter lines, read Git refs and retrieved official sources; no test, build, container, upload, fixture generation, cleanup or Git mutation. CleanupN/A. skill_resolution: paths-injected. Engram335-336 saved; coordinator337 and full task mirror persist findings. Parent passive record readback/link checks apply; no runtime repeat. Full P9/T4-T7/final independent Verify/main merge-push remain pending, no deployment. Risk: none for this passive report; underlying unit items2,3,5.
