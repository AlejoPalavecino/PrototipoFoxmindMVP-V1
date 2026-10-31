# Foxy AI — ensamblador de contexto F4A

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F4A grounding
- Status: completed

## Request and scope
Ensamblar fuentes ya verificadas y documentos procesados con claves opacas para proveedor y mapa privado de referencias, sin DB ni llamadas a proveedor; no editar pruebas.

## Work performed
Tipos en src/core/domain/foxy-ai-grounding.ts, ensamblador en apps/api/src/foxy-ai/assemble-grounding.ts y exportación en índice de API. Asocia fuentes y documentos, deduplica archivos idénticos, valida digest y bytes de PDF, consistencia de las pruebas, metadatos PDF/DOCX y límites conjuntos; no incluye IDs ni digest en las partes destinadas al proveedor. Conserva la referencia privada por separado. La prueba DOCX confía en el digest aportado por el lector: no dispone de bytes crudos para recalcularlo.

## Verification
- `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-grounding.test.mjs`: 5 PASS, exit 0.
- `npm run api:build`: exit 0; `npm run lint:boundaries -- --quiet`: exit 0.
- Sin DB, proveedor, red ni pruebas modificadas.

## Commits and outcomes
Sin commit; revisión y coordinación pendientes.

## Handoff
La autorización y lectura segura de cada fuente/archivo y la semántica de documentos compartidos están pendientes; el ensamblador no acredita permisos, no valida la autoría de los metadatos ni hace llamada IA.

## Corrección de custodia — 2026-10-31
Tras aclaración del arquitecto y corrección del test por test_runner, se exige correspondencia entre kind/identificador y propósito; PLAN usa plan sin destino, MATERIAL usa material sin destino y ACTIVITY usa instructions con target igual a la actividad. Archivos distintos con digest idéntico conservan identidades separadas. Primera prueba tras el ajuste informó INVALID_INPUT frente a FILE_NOT_READY para fuente inconsistente; corregido el código y nueva ejecución de `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-grounding.test.mjs`: 6 PASS, exit 0. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. No se editaron pruebas.

## Corrección curricular — 2026-10-31
Tras revisión se conserva context y currículo completo con selección y estados en el resultado, y se exige exactamente un archivo para fuentes PLAN y MATERIAL. La serialización hacia el proveedor debe decidir y sanear la proyección de currículo/contexto, que contiene IDs; no enviar el objeto íntegro sin revisión. `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-grounding.test.mjs`: 11 PASS, exit 0; `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas sin editar.
