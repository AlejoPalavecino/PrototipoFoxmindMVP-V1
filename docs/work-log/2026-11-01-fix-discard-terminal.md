# Terminalidad de descartes en historial

- Agente: /root/fix_discard_terminal (slice_worker); sesión no disponible.
- Fecha: 2026-11-01; rama codex/foxy-ai; worktree foxmind-foxy-ai.
- Estado: in_progress.
- Alcance: corregir el historial para que DISCARDED sea terminal; sin editar pruebas ni otros slices.

## Resultado y pruebas

- Se trató PUBLISHED y DISCARDED como terminales en lectura de página e inspección; se conserva el DTO conocido ante una transición incompatible.
- `node --test --test-reporter=dot apps/web/src/lib/foxy-publication-history-controller.test.mjs`: 19 PASS, exit 0.
- `npx tsc -p apps/web/tsconfig.json --noEmit --pretty false`: exit 0.
- `npm run lint:boundaries --silent`: exit 0.
- Sin cambios en pruebas; la revisión independiente y el commit corresponden al coordinador.
- Estado: completed.

- Seguimiento: una fila más reciente invalida la inspección seleccionada antigua, aborta su lectura y detiene polling sin fabricar revisión de aula. Se protege la continuación de la lista si un callback cambia el recurso.
- Suite de historial: 20 pruebas PASS; TypeScript web y fronteras PASS.
