# Foxy Gemini diagram and provider factories — in progress

- Agent / role: /root/green_diagram, slice worker
- Task ID: /root/green_diagram
- Date: 2026-11-01
- Branch/worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Phase: V-H1 provider adapters, docs/work-log/2026-11-01-architect-visual-host-wiring.md
- Status: in_progress

## Scope
Synthetic-only structured diagram adapter and bounded-fetch SDK factories. No secrets, provider requests, application configuration or runtime wiring.

## Work performed
- Implemented diagram structured JSON response/schema, strict graph parsing, immutable single-use preflight and bounded SDK factories for image and diagram. Exported factories via AI barrel; configuration/host belong to another agent.
- Consulted Context7 for installed @google/genai 2.31.0. Synthetic SDK probe demonstrated Developer API countTokens rejects systemInstruction before fetch; architect approved embedding a fixed instruction as first content part in both count/generate. This changes instruction role and is not claimed equivalent to a system instruction or proof against prompt injection.

## Verification
- Node synthetic adapter suites including installed SDK with injected fetch: 18 cases PASS. npm run api:build --silent and npm run lint:boundaries --silent: exit 0.
- One initial installed SDK synthetic test failed AI_UNAVAILABLE, diagnosed as SDK rejection noted above; corrected per architecture and rerun passed. No real credentials, provider calls or spend.

## Handoff
Independent audit and adversarial prompt/SDK body checks requested. Real model compatibility, billed output caps, full scanner/storage and classroom publication acceptance remain unverified; factory existence alone does not enable real generation.
