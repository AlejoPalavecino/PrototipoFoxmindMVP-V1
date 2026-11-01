# Foxy AI M4D3 — panel de gestión

- Agente / rol: /root/green_management / slice_worker.
- Session ID: no disponible; tarea: M4D3.
- Fecha: 2026-11-01.
- Rama/worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Estado: in_progress.

## Alcance

Crear panel de reintento y descarte en el diálogo existente, sin borrar el borrador ni modificar pruebas.

## Resultado provisional

El panel distingue reintento de preparación y de solicitud incierta, requiere revisión y checkbox para descarte, muestra respuestas reales de limpieza y permite actualizar estado. El diálogo bloquea operaciones incompatibles y oculta confirmación de publicación para una preparación descartada. Session suministra el estado real de gestión.

## Verificación

- node --test --test-reporter=dot apps/web/src/components/foxy-publication-management-panel.test.mjs apps/web/src/components/foxy-resource-workspace.test.mjs apps/web/src/components/foxy-workspace.test.mjs: 34 pruebas, exit 0.
- npx tsc -p apps/web/tsconfig.json --noEmit --pretty false: exit 0.
- npm run lint:boundaries --silent: exit 0.
- Primer test focal mostró que el texto DONE omitía indicar descarte; se corrigió y la ejecución posterior pasó.

## Pendiente

Revisión independiente y prueba integrada en navegador; terminalidad DISCARDED del historial se reportó al coordinador para corte independiente.
- RED adicional de snapshot inconsistente: historia DISCARDED con inspección READY no debe mostrar preview/confirm. Se bloqueó en diálogo usando evidencia terminal de lista, preparación o recibo y se muestra actualización sin inventar estado. Suite componentes ampliada 35 PASS; TypeScript y fronteras PASS. Revisión independiente pendiente.
