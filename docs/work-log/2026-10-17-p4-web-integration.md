# P4 web transport — Writer checks completed

- Agent / role: bounded web writer
- Session or task ID: /root/p4_web
- Date: 2026-10-17
- Branch / worktree: codex/p4-p3-integration; isolated integration worktree
- Starting commit: 5e86d1e plus imported P4 merge candidate
- Phase and detailed task/spec links: P4; odd/tasks/p4-p3-integration.md T3, S1-S2
- Status: completed

## Request and scope
Implement the assigned P4 binary proxy, typed client and narrow existing-context file view. Preserve P3 account files; no P5, services, dependency changes or commits.

## Work performed
Read the feature document, P4 HTTP/handoff contracts, work-record protocol and existing account transport/components. Loaded all three exact injected skills.

Added the specific `apps/web/pages/api/v1/files/[[...path]].ts` ingress with `file-proxy.ts`; no account route/proxy/client was edited. Added `file-client.ts`, `private-file-panel.tsx`, `pages/files.tsx`, two focused test files and `docs/p4-web.md`. The existing-context view reuses P3 components/CSS and performs no domain creation/publication. The proxy bounds metadata and binary streams, validates routes/query/methods/exact declared length, preserves trusted session/CSRF and safe response headers, cancels disconnected transfers and never follows redirects. The client acquires fresh CSRF per mutation and retains server admission for retries. Processing outages (`PROCESSING_UNAVAILABLE`, scan `ERROR`) remain pending/retryable; they are distinct from real rejected states.

## Verification
- RED: `node --test tests/p4-web-proxy.test.mjs tests/p4-web-client.test.mjs` initially failed because the new modules did not exist. The temporary-processing-state test also failed before its state helper was implemented.
- GREEN: `node --test tests/p4-web-proxy.test.mjs tests/p4-web-client.test.mjs` exit0, 11 passed/0 failed. Real local HTTP fixtures exercise cookies/CSRF/header filtering, strict allowlists, metadata caps with and without Content-Length, binary declared cap/missing length, download headers, oversized JSON response sanitization, redirects/configuration, response disconnect and partial-upload cancellation. Client fixtures exercise fresh distinct CSRF bindings, real same-origin credentials, pending/rejected states, quota/retry and exact context parsing.
- `npm run test:web` exit0, 14 passed/0 failed, 2 conditional real-browser tests skipped because `FOXMIND_WEB_TEST_ORIGIN` was absent. Those tests require the coordinator's running web environment.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false` exit0 after final source edits. Incremental writes were disabled to avoid cache artifacts.
- No Next build, scanner/storage/browser integration, stress backpressure measurement or wall-clock deadline expiry run was performed by this writer; the proxy cancellation fixtures are observed, while those broader proofs remain coordinator work. No filesystem scratch directories were created.

## Commits and outcomes
No commits; parent owns Git.

Risk: items 2,3 (session-bearing proxy and shared route precedence). Independent verification remains required by the parent; writer checks do not imply integrated acceptance.

## Handoff
Coordinator: run the combined build and real browser/API/SQL/storage/scanner journey, then independent Verify. Route `/files?kind=draft&id=UUID&purpose=plan`; label `Seleccionar archivo`; submit `Subir archivo`; retained retry `Reintentar subida`; refresh `Actualizar estado`; readiness `Archivo listo`; pending `Archivo pendiente de validación`; rejection `Archivo rechazado`; preview `Previsualizar archivo`; iframe title `Vista previa del archivo`; download `Descargar archivo`. Capture the public file ID from the metadata POST response. No ID input, context creation, navigation edits or P5/P7 implementation was introduced.
