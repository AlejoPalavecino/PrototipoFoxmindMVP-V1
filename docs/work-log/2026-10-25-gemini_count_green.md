# Activity Gemini count compatibility — GREEN implementation

- Agent / role: gemini_count_green / slice_worker.
- Session or task ID: /root/gemini_count_green.
- Date: 2026-10-25.
- Branch / worktree: codex/classroom-activity-ai; classroom-activity-ai/ProtipoFoxMind.
- Starting commit: 3c74eb61eeeb4457c89ef19c86ca1c9436999f54.
- Phase / spec: [A2 provider](../../odd/tasks/classroom-activity-ai.md); [current coordinator](2026-10-25-root-activity-gemini-main.md).
- Status: completed.

## Request and scope

Implement only the activity provider count compatibility repair after independently observed RED. Production ownership is solely `apps/api/src/ai/activity-adapter.ts`; tests belong to the independent tester. No Google calls, private configuration reads, runtime changes, builds, commits or integration in this child task. Other agents' changes are preserved.

## Work performed

Read roadmap, work-record protocol, A2 contract, activity adapter/prompt, extraction adapter and response schema. Context7 official js-genai documentation consulted; installed SDK version is 2.31.0. Its `countTokensConfigToMldev` rejects generation-only count configuration, while `contents` supports multimodal input.

After the coordinator delivered independently observed RED, changed only `apps/api/src/ai/activity-adapter.ts` (75 lines): a five-line helper builds a count-only text prefix containing the complete system instruction and serialized response schema, then appends all existing contents unchanged. Removed unsupported `config.systemInstruction` from count. The digest now covers the same full conservative count payload, including instruction/schema. Generation continues to use the original content and privileged system instruction/response schema. Count is a conservative admission representation, not an assertion of exact generation wire token equivalence; it may overestimate. No source is truncated or omitted. No retries, billing, leases, timeouts, ports or local validation changed.

## Verification

- Independent RED, relayed by coordinator `/root`: new real-SDK compatibility tests 3 FAIL; existing adapter tests 6 PASS / 1 FAIL. This child did not author or edit tests.
- `node --test --test-reporter=dot tests/activity-gemini-count-compatibility.test.mjs tests/activity-ai-adapter.test.mjs`: exit 0, ten dots / 10 PASS on first post-patch run. Actual installed GoogleGenAI SDK uses a fake key and ephemeral loopback HTTP server; no Google request.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit 0, silent; no emitted build artifacts or live runtime change.
- `git diff --check -- apps/api/src/ai/activity-adapter.ts docs/work-log/2026-10-25-gemini_count_green.md`: exit 0; Git reported only its LF-to-CRLF normalization advisory.
- Repository package scripts do not configure a linter; unavailable, not PASS. File is 75 lines and all functions remain below 40 lines.
- Two-strike circuit breaker not triggered: no post-patch test/type failure.

## Commits and outcomes

No commit created; parent owns verification/integration delivery.

## Handoff

Source frozen after focused GREEN/types/whitespace checks. Parent and independent verifier must inspect this candidate, then perform an explicitly fresh runtime restart before any authorized real retry. Never automatically resend the failed real job. Full real Gemini acceptance and local main integration remain pending and are not claimed by this child. No API/Next build was run while shared live runtime was active.
