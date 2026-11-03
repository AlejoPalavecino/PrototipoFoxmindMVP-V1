# ARQ-08 — revisión independiente

- Agent / role: /root/arq08_review, quality_reviewer, solo lectura.
- Session or task ID: tarea nativa /root/arq08_review.
- Persisted by: /root, a partir del informe del revisor.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-08](../../odd/tasks/architecture-consolidation.md#arq-08--ordenar-ejecución-y-diagnóstico), [registro coordinador](2026-11-02-id-unavailable-arq08-execution.md).
- Status: completed.

## Request and scope

Revisar semántica de admisión, precedencia de locks, diagnóstico, cadencias, gasto y medición. Solo lectura y pruebas puras.

## Work performed

Comparación automatizada en memoria contra HEAD de las seis tablas, condiciones de lease de los seis conteos globales y cinco predicados directos de dueño y prioridad. Conserva Foxy texto hasta recuperación, visual con lease vivo y prioridad cruzada sin Student/Grading. Verificación estática del lock 78123002 y su orden antes de 78123001 en los usos que requieren ambos. Límites, estados, gasto y polling conservados.

## Verification

- 12/12 pruebas puras de scheduler, diagnóstico y lifecycle Foxy. Guard con 146 entradas. Sin builds, servicios, migraciones ni ediciones del revisor.
- La medición de conexión incluye apertura cuando corresponde. La del lock incluye ida y vuelta a PostgreSQL. La evidencia de contención y liquidación sobre PostgreSQL corresponde al coordinador.
- SHA-256 agregado `7b8401362d826265cdc92bf9bc2ed0390ca14e69bf25ba0642bfaaa940b38957` del JSON de pares ruta y huella ordenados. Archivos exactos:
  - `apps/api/src/ai-admission.ts`
  - `apps/api/src/classrooms/activity-ai/queue.ts`
  - `apps/api/src/classrooms/ai/queue.ts`
  - `apps/api/src/classrooms/grading-ai/sql-queue.ts`
  - `apps/api/src/classrooms/student-ai/worker.ts`
  - `apps/api/src/foxy-ai/foxy-shared-admission.test.mjs`
  - `apps/api/src/foxy-ai/turn-queue.ts`
  - `apps/api/src/foxy-ai/turn-recovery.ts`
  - `apps/api/src/foxy-ai/visual-claim-authority.ts`
  - `apps/api/src/foxy-ai/visual-completion.ts`
  - `apps/api/src/foxy-ai/visual-queue-recovery.ts`
  - `apps/api/src/foxy-ai/visual-queue.ts`
  - `tests/audit-scheduler-diagnostics.test.mjs`
- Huella del núcleo `ai-admission.ts`: `6d9f852568707fda388f936636b33615c600fd98eedc203f4708c9abf3de94ee`.

## Commits and outcomes

VERIFIED para el alcance estático y puro. Sin bloqueantes.

## Handoff

Coordinador integra evidencia de PostgreSQL, presupuesto y lifecycle antes de cerrar.
