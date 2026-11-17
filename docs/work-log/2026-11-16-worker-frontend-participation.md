# Participación: puertos por capacidad

- Agente: `/root/frontend_grading`, implementación delegada por el coordinador.
- Fecha: 2026-11-16. Rama: `codex/frontend-cohesion`. Worktree: `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`; base original `dd6f4bc92b959cce0e2c68343291614270c4a17e` más cambios concurrentes preservados.
- Autorización: separar HTTP de cuestionario, práctico y lectura de respuestas conforme a `docs/engineering/frontend/cohesion-refactor.md`, sin cambiar protocolo, capacidad de editor, borrador, estilos o reglas de producto.
- Escritura: sólo feature participation, `tests/frontend-participation-cases.test.mjs` nuevo y este registro. Host/fixtures heredadas/tablero pertenecen al coordinador.

## Base y evidencia

- `node --test tests/p7-questionnaire-client.test.mjs tests/p7-practical-client.test.mjs tests/p7-questionnaire-autosave.test.mjs`: 9/9 PASS antes de editar.
- Dos consultas a nombres de helpers inexistentes fallaron en lectura; se localizó y leyó el vigente `tests/helpers/frontend-feature-fixtures.mjs`. Sin mutaciones.

## Estado

Implementación entregada para integración del coordinador; no se marca DONE. Superficie de código liberada.

## Trabajo y evidencia

- Nuevos `api.ts` y `model/participation-operations.ts`: capacidades separadas de cuestionario, respuesta práctica, adjuntos y lectura. Adaptadores desde `Pick<ClassroomClient,...>` sin cargar React, CSS, Node ni casos de uso en runtime.
- `QuestionnaireAttempt` recibe `operations` y `reading`; `PracticalAttempt` recibe `operations` y `attachments`; `AttemptAnswers` recibe `operations` de lectura. Ya no reciben `api`/`classroomId` ni construyen URLs ni comprueban métodos opcionales del transporte.
- `editor` sigue en los dos formularios sólo para calcular edición/consulta según el epoch existente. El adaptador ligado a ese editor mantiene el rechazo cuando falta autoridad, intento o capability de transporte.
- No se editaron `QuestionnaireDraft`, editor lease, deadline, contrato de backend, headers, estilos ni pruebas heredadas.
- RED: `node --test tests/frontend-participation-cases.test.mjs`: 0/5; API inexistente (ENOENT esperado).
- GREEN de adaptadores: 5/5. Pruebas finales propias: 8/8, con rutas/payload/revisión, señal de aborto, token/epoch, rechazo sin petición, guardar versus enviar y protocolo real de adjuntos.
- `node --test tests/frontend-participation-cases.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-autosave.test.mjs tests/p7-participation-client.test.mjs`: 16/16 PASS. Incluye respuestas tardías, pérdida de ACK, recuperación de CAS, idempotencia de guardado, consulta sin autoridad y envío explícito. Usa transporte sintético en memoria, sin servicios externos.
- Prueba con `createClassroomClient` vigente: cuatro peticiones (answer, submit, reserva y contenido); cuatro CSRF distintos; mismo token/epoch y `same-origin`; contenido binario por PUT. No se alteró el cliente.
- `git diff --check -- apps/web/src/features/participation tests/frontend-participation-cases.test.mjs docs/work-log/2026-11-16-worker-frontend-participation.md`: PASS. `rg` sobre los tres componentes no encuentra `api.`, `ClassroomClient` ni rutas `/attempts/` (código 1 esperado por ausencia).
- `npm --prefix apps/web run typecheck`: cuatro errores de integración esperados en `AttemptSession`/`AttemptHistory` con props anteriores; ningún error de feature. Coordinador informado y autorizado a adaptar estos consumidores y fixtures.
- Repetición de `npm --prefix apps/web run typecheck` tras integración concurrente del coordinador: PASS (`tsc --noEmit`, código 0).
- Suite final con práctico heredado ya adaptado por el coordinador: `node --test tests/frontend-participation-cases.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-practical-client.test.mjs tests/p7-questionnaire-autosave.test.mjs tests/p7-participation-client.test.mjs`: 18/18 PASS.

## Límites y siguiente paso

- La carga conserva `uploadAttachment` existente, que no admite AbortSignal. Las escrituras por `attempt` sí propagan AbortSignal. No se agregó un protocolo alternativo.
- Coordinador integró hosts y al menos la fixture práctica, acreditado por typecheck y suite final verdes. Pendiente de su reconciliación global: restantes consumidores/fixtures y suites afectadas. Sin puentes temporales.
- No se ejecutaron integración con servicios, navegador ni build en esta unidad. No se hicieron commits.
- Reversión: retirar API/modelo/prueba nuevos y revertir únicamente los cambios de props/llamadas en los tres componentes y el export de tipos en `index.ts`; reconciliar primero los hosts y fixtures que adapta el coordinador. Preservar los movimientos y CSS concurrentes del refactor general.
