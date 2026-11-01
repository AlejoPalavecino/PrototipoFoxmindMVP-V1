# Visual UI corrections

- Agent: /root/green_ui_fixes; runtime session ID unavailable.
- Scope: four independently reproduced visual controller and pending-navigation issues; frontend source only. Tests owned by test_runner.
- Status: in progress. Preserve concurrent raster work.
- Status: implementation complete, independent review pending. Corrected stale list response, preservation of edited prompt, definitive error classification and visible pending-navigation dialog when the resource editor is closed. Text publication history now narrows inspection to a text source; confirmation separately checks the source before use.
- Paths: apps/web/src/lib/foxy-visual-controller.ts, apps/web/src/components/foxy-workspace-session.tsx, apps/web/src/lib/foxy-publication-history-controller.ts, apps/web/src/lib/foxy-publication-confirmation-controller.ts.
- Evidence: 4 focused visual/navigation tests passed; 80 history/confirmation/management and visual tests passed; 52 visual/workspace/resource regressions passed; web TypeScript and lint:boundaries passed after concurrent domain changes. Tests were not edited by this agent.
- Limits: no browser visual validation; independent reviewer and explicit source-discrimination regression remain pending. No provider or retained data used. No commit.
## Visual publication UI
- Agent /root/green_ui_fixes; scope: browser UI and proxy, no backend edits. Created foxy-visual-publication-panel.tsx and foxy-visual-publication-controller.ts; updated foxy-client.ts, foxy-proxy.ts, foxy-workspace-runtime.ts, foxy-workspace-actions.ts, foxy-workspace-session.tsx and foxy-visual-workspace.tsx.
- Supports teacher destination and title, preparation with idempotent retry, polling and private preview, fresh review, explicit checked confirmation and idempotent confirmation retry; reads prior preparations on returning to an asset. Pending publication blocks navigation and selection. Published material still requires server confirmation.
- Tests: visual publication controller and component 6/6; 75 focused/regression tests across panel, controller, workspace runtime/actions and proxy passed. TypeScript web and lint:boundaries passed. No test file edited.
- Limitations: independent security/UX review, real end-to-end browser flow and screenshot remain pending. Uses synthetic clients in tests; no provider or retained data. No commit.
## Visual publication review fixes
- Reviewer findings corrected with RED from /root/red_management: changing title or destination invalidates prior preparation and pending reads; stale refresh cannot replace a newer or terminal publication; accepting navigation abandons the prior visual publication scope and suppresses late acknowledgements.
- Paths: foxy-visual-publication-controller.ts and foxy-workspace-actions.ts. Focused controller, panel, runtime and action suites passed 63 cases; web TypeScript and boundaries passed. Independent re-review and browser validation remain pending. No test edits or commit.