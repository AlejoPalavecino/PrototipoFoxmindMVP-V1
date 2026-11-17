# Grading: contratos y organización por caso de uso

- Agente: `/root/frontend_grading`, implementación delegada por el coordinador.
- Fecha: 2026-11-16. Rama: `codex/frontend-cohesion`.
- Worktree: `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`.
- Base: `dd6f4bc92b959cce0e2c68343291614270c4a17e`, con cambios concurrentes preservados.
- Alcance: TASK-004, puertos tipados y adaptadores de grading; TASK-009 sólo después del GO del coordinador. Fuente: `docs/engineering/frontend/cohesion-refactor.md`.
- Escritura: feature grading, prueba nueva `tests/frontend-grading-cases.test.mjs` y este registro. Aceptación de descarte y pruebas heredadas protegidas. Sin commits ni servicios.

## Evidencia inicial

- `node --test tests/frontend-grading-discard.test.mjs tests/brujula-grading-ui.test.mjs tests/grading-ai-review-ui.test.mjs`: 17/17 PASS antes de extraer. Fix existente de recarga mediante `leaveEditor` preservado.
- Una consulta PowerShell con expansión `{a,b}` falló por sintaxis; se repitió sin esa expansión. Sin mutaciones.

## Etapa 1: contratos y adaptadores

- Nuevos `api.ts` y `model/grading-operations.ts`: capacidades editing, publication, AI review, corrections, results, progress y summary. Reutilizan `PrivateGradingInput`, DTOs existentes y tipos neutrales mediante imports de tipo; conservan transporte y payloads.
- RED: `node --test tests/frontend-grading-cases.test.mjs`: 0/4, faltaba `api.ts` (ENOENT esperado).
- GREEN: `node --test tests/frontend-grading-cases.test.mjs tests/frontend-grading-discard.test.mjs tests/brujula-grading-ui.test.mjs tests/grading-ai-review-ui.test.mjs`: 21/21 PASS.
- `npm run typecheck --workspace @foxmind/web` no aplica: el repo no declara workspaces. Corregido a `npm --prefix apps/web run typecheck`: PASS, salida `tsc --noEmit`, código 0.
- Los contratos de adaptador cubren GET/POST, revisión, snapshot/requestId, confirmación explícita y propagación de AbortSignal. UI y pruebas protegidas sin cambios en esta etapa.
- Reversión de esta unidad: retirar únicamente los dos nuevos archivos de feature y la prueba nueva; conservar el cambio previo del coordinador en `ui/GradingEditor.tsx` y todos los cambios concurrentes.

## Estado

Etapa 1 entregada al coordinador y GO recibido para TASK-013 (segunda etapa). No se marca DONE. Sin commits, servicios ni proveedores.

## Etapa 2: organización y estado (TASK-013)

- UI consume operaciones por capacidad; URLs y conocimiento de `ClassroomClient` quedan únicamente en `api.ts`.
- Movimientos: `ui/GradingEditor` a `editing/GradingEditor`; `ui/GradingAiReview` a `ai-review/GradingAiReview`; `ui/PublishedGradeCorrection` a `publication/PublishedGradeCorrection`; `ui/PublishedResult` a `results/PublishedResult`; `ui/Progress`, `StudentRecord`, `StudentAiSummary` a `progress/`.
- Estado: `editing/use-grading-draft.ts` conserva juntos DTO/revisión, borrador, restore, dirty, confirmación de publicación y salida/descarte. `editing/use-grading-persistence.ts` conserva carga, AbortSignal y serialización de escrituras. `ai-review/use-grading-ai-review.ts` conserva propuesta, job, requestId y confirmaciones privadas.
- `ui/FeedbackDisplay`, rúbrica, serializador de feedback y CSS siguen compartidos internos del dominio. No cambian presentación ni selectores.
- Antes de extraer estado: prueba nueva del editor con adaptadores, cancelación y confirmación de recarga PASS, suite propia 5/5. Las pruebas heredadas todavía requerían migración de fixtures por el coordinador; no se afirma que pasaban durante esa ventana.
- La primera extracción mostró un fallo en el runner de hooks porque genera setters nuevos en cada render. Se estabilizó `clear` en el dueño del borrador, conservando el ciclo de carga; la misma prueba pasó después.
- Después de extraer: `node --test tests/frontend-grading-cases.test.mjs`: 7/7 PASS. Agrega conservación de todos los campos y revisión al cancelar, restauración conjunta al confirmar y abort efectivo del load con respuesta tardía tras desmontar.
- `npm --prefix apps/web run typecheck`: bloqueado temporalmente por consumidores en application todavía con props previas y por autoría concurrente. Ningún diagnóstico dentro de grading. Coordinador notificado para su integración.
- Reexports temporales de las siete rutas UI antiguas mientras el coordinador adapta consumidores y pruebas; deben retirarse antes del cierre.
- Reversión: devolver movimientos de componentes y `index.ts` a rutas previas, retirar controladores y contratos nuevos, restaurar props y llamadas previas preservando el fix previo de `leaveEditor`. Reconciliar primero con el coordinador porque host/fixtures se adaptan de forma concurrente. No usar una restauración masiva del worktree.

## Primer paso pendiente

Coordinador integra props/fixtures, luego correr aceptación heredada protegida y retirar los siete reexports temporales. Tipado global, build y QA visual de integración pertenecen al coordinador; no están acreditados aquí.
