# Synthetic visual fixture

- Agent: /root/visual_fixture; session ID unavailable; branch codex/foxy-ai.
- Scope: isolated React fixture using actual Foxy visual components, synthetic state and a local PNG response. No production changes, data or provider.
- Location: temporary directory foxy-visual-fixture-isolated; URL http://127.0.0.1:18743/; local process session 76647 owned by this agent.
- Verification: esbuild succeeded after correcting initial PowerShell outfile argument. Browser interaction and image decode remain to be verified by coordinator. No tests or application code changed.
- Handoff: verify generation, image preview, classroom/unit/topic and confirmation; stop fixture process after QA. Fixture is not backend integration evidence.