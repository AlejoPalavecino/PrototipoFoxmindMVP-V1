# Foxy AI — lector de historial H1

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: eb4b13f
- Phase and detailed task/spec links: H1, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Leer últimos pares READY contiguos bajo lease vigente con aislamiento de snapshot; no conectar al prompt en este slice.

## Work performed
Se copia lease antes de I/O, comprueba claim y snapshot antes/después, filtra por dueño y conversación y toma hasta diez pares READY contiguos. Corta ante hueco, error, respuesta inválida o cambio de snapshot; tamaño total JSON máximo 262144 bytes con pares completos comenzando por los recientes. Solo expone user/title/markdown y admite señal de cancelación opcional; no se editó prompt ni pruebas.

## Verification
`node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-history.test.mjs`: exit 0, 4 PASS en PostgreSQL efímero sintético. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas adicionales de máximo de bytes, lease mutable y snapshot cambiado entre checks solicitadas al coordinador. Sin proveedor real ni secretos.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente y pruebas adicionales; preparación existente todavía no pasa señal a loadClaimed. Integrar historial al prompt solo con versión y límites acordados.

## Corrección de identificadores en historial
La proyección reemplaza UUID canónicos sin distinguir mayúsculas en `user`, `title` y `markdown` por `[identificador]` antes de contar bytes; no modifica las filas guardadas. Esto no anonimiza nombres ni otros datos personales. `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-history.test.mjs`: exit 0, 9 PASS en PostgreSQL efímero sintético, incluidas nuevas pruebas de bytes, huecos y carreras. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Sin pruebas editadas ni proveedor real.
