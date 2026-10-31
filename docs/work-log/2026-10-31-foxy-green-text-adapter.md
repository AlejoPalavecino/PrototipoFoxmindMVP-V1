# Foxy AI — adaptador textual Gemini E2/E3

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 3abf54d
- Phase and detailed task/spec links: E2/E3, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Adaptador textual con proveedor inyectado, preflight, límites, protección frente a inyección y validación local; sin credenciales ni proveedor real.

## Work performed
Tipos puros de entrada/salida; prompt serializa solo campos proyectados y PDF inline, con contenido como datos no confiables. Adaptador cuenta controles y documentos, liga preflight a fingerprint, aplica plazos/abort y no reintenta despachos inciertos. Respuesta verifica esquema, límites y referencias al contexto enviado. No se editaron pruebas ni activó worker.

## Verification
`node --test --test-reporter=dot apps/api/src/ai/foxy-text-adapter.test.mjs src/core/domain/foxy-ai-answer-grounded.test.mjs apps/api/src/foxy-ai/foxy-provider-input.test.mjs`: exit 0, 16 PASS. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Context7 al resolver @google/genai devolvió Monthly quota exceeded; se siguieron patrones SDK y tipos existentes del repositorio. Sin credenciales ni proveedor real.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente y worker. El adaptador puede recontar automáticamente si entrada muta; el worker debe congelar entrada o ligar fingerprint/contaje a la reserva antes del dispatch para evitar presupuesto obsoleto. Disponibilidad de modelo y esquema en proveedor real no verificados.

## Corrección de preflight pendiente
El coordinador solicitó proteger una reserva ya hecha: si el contenido cambia después de `countTokens` exitoso, `generate` ahora rechaza antes de recontar o despachar y mantiene el preflight anterior. Después de un despacho que consumió el preflight, una nueva generación puede contar de nuevo según contrato existente. Prueba `node --test --test-reporter=dot apps/api/src/ai/foxy-text-adapter.test.mjs src/core/domain/foxy-ai-answer-grounded.test.mjs apps/api/src/foxy-ai/foxy-provider-input.test.mjs`: exit 0, 18 PASS; `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Sin proveedor real ni cambios a pruebas. La advertencia anterior sobre recuento entre preflight pendiente y despacho queda superada; el worker debe seguir evitando un segundo preflight explícito después de reservar.
