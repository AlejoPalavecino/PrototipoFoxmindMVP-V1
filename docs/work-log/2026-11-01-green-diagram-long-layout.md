# Diagram long layout — GREEN

- Agent: /root/layout_green; runtime session ID unavailable; branch codex/foxy-ai.
- Scope: measure title and edge-label rows before allocating nodes; preserve content and density limits.
- Changed apps/api/src/foxy-ai/diagram-renderer-layout.ts; no tests edited.
- 14 renderer/long-layout tests passed; npm run api:build --silent and npm run lint:boundaries --silent passed.
- An initial local editing command hit a Windows encoding error; the affected file was restored from HEAD before applying the change in UTF-8. No consecutive test failures.
- Handoff: independent review and real-provider revalidation remain.