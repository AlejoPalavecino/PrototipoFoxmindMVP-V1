# Provider test configuration — partial

- Agent /root/setup_test; session ID unavailable; branch codex/foxy-ai.
- Created ignored `.env.foxy-test` with empty AI_API_KEY, visual opt-in, synthetic-test quotas and a USD 1 local budget. Pricing values supplied by coordinator from https://ai.google.dev/gemini-api/docs/pricing; verify before use.
- No secret read, provider request, retained-data operation or product code change. git check-ignore confirmed file is ignored before creation.
- Pending: runner which loads the configuration without exposing secrets and uses isolated synthetic infrastructure, then one authorized call per modality. A local budget is not a guarantee of provider-side billing limits.
- Added scripts/foxy-provider-smoke.mjs: explicit flag required before environment read; inherited AI variables rejected; one generate attempt per modality, errors sanitized. No live execution. This direct adapter smoke bypasses the app ledger; local USD 1 budget does not constrain provider billing. Boundaries PASS; invocation without flag exited 1 before any calls.
