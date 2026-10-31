# Foxy AI — continuidad de chat H2/H3

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 74a1343
- Phase and detailed task/spec links: H2/H3, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Conectar historial permitido al prompt v2 y contar con recorte de pares antiguos previo a reservar; sin proveedor real.

## Work performed
El nuevo turno se emite como foxy-chat-v2; preparación solo acepta v2 y pasa señal al lector. Proyección copia exclusivamente user/title/markdown, elimina UUID y limita tamaño. Preflight retira pares completos antiguos solo por AI_INPUT_LIMIT o conteo mayor al máximo; abort y demás errores no reintentan. Prompt presenta historial como continuidad no confiable y nunca evidencia de aula; conteo, despacho y fingerprint comparten proyección. Sin cambios a pruebas ni proveedor real.

## Verification
`node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-history-preflight.test.mjs apps/api/src/ai/foxy-text-adapter.test.mjs`: exit 0, 14 PASS. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Corrida adicional de pruebas antiguas por index.ts no ejecutó sus casos porque importación transitiva identity/index carga decorador Nest incompatible con Node strip-only; reportada al coordinador para ajuste de harness. Las pruebas previas también requieren actualizar fixtures explícitos v1 al nuevo contrato, conservando v1 como rechazo. Sin DB retenida, secretos ni proveedor real.

## Commits and outcomes
Sin commit propio.

## Handoff
Cerrar regresiones antiguas con harness y fixtures v2 corregidos por test_runner; revisión independiente antes de habilitar. Histórico v1 conservado y pendiente v1 falla cerrado antes de despacho.

## Regresiones actualizadas por test runner
`node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-history-preflight.test.mjs apps/api/src/ai/foxy-text-adapter.test.mjs apps/api/src/foxy-ai/foxy-turn-preparation.test.mjs apps/api/src/foxy-ai/foxy-text-worker.test.mjs apps/api/src/foxy-ai/foxy-text-worker-lifecycle.test.mjs`: exit 0, 32 PASS, tras actualización atribuida de fixtures a v2 e imports directos. `foxy-provider-input.test.mjs` aún usa barrel con decorador y aserción exacta anterior sin history; corrección de pruebas solicitada al coordinador. Código no modificó tests.

## Proyección actualizada
Test runner corrigió import directo y aserción de `history` en `foxy-provider-input.test.mjs`. Corrida final combinada con preflight, adaptador, preparación, worker, lifecycle y proyección: 36 PASS, exit 0. Revisión independiente continúa; no hubo proveedor real.
