# Frontend de autoría por caso de uso

- Agente: worker `/root/frontend_authoring`; sesión no expuesta.
- Fecha: 2026-11-16. Rama: `codex/frontend-cohesion`. Worktree: `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`. Base asignada: `dd6f4bc`.
- Encargo: TASK-004 (contrato/adaptador puro) y, tras GO del coordinador, TASK-007 (drafting/generation/publication). Diseño aprobado: `docs/engineering/frontend/cohesion-refactor.md`.
- Escritura: feature activity-authoring, `tests/frontend-authoring-cases.test.mjs` y este registro. Trabajo concurrente preservado. Sin commits, servicios ni proveedores reales.
- Aceptación: rutas/payload/abort preservados; React consume operaciones tipadas; conservar CAS, creación diferida, DST, rúbrica y publicación explícita.
- Estado inicial: lectura y diseño del adaptador; pruebas nuevas antes de implementación. Primera etapa no modifica consumidores.
- Reversión: retirar únicamente archivos nuevos y cambios de esta unidad dentro de las superficies asignadas; no revertir archivos concurrentes.

## Evidencia

- TASK-004 RED: `node --test tests/frontend-authoring-cases.test.mjs` → 0/3, módulo API nuevo ausente (`ENOENT`).
- TASK-004 GREEN: mismo comando → 3/3. Cubierto: rutas, método, payload, revisión, señal de aborto, generación explícita, reconocimiento de posible cargo y propagación de conflictos/abortos.
- `npx eslint apps/web/src/features/activity-authoring/api.ts apps/web/src/features/activity-authoring/model/authoring-operations.ts` → exit 0.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json` → exit 1 por composición concurrente de MaterialsOperations y módulos study-commands todavía ausentes; sin errores atribuidos a la unidad de autoría.
- API nueva no importa runtime: sólo imports de tipos. No React, CSS ni Node; transporte inyectado `Pick<ClassroomClient, 'call'>` conserva sesión/CSRF/timeout del consumidor.
- Etapa 1 lista para revisión del coordinador. Primer paso pendiente: GO para integrar operaciones y separar casos de uso de TASK-007. No cambiaron consumidores ni rutas existentes.

## TASK-007 — ejecución tras GO del coordinador

- `drafting/ActivityAuthoring.tsx` conserva valores, dirty/discard, pasos, diálogos, foco y bloqueo visual. `draft-rules.ts` contiene revisión, rúbrica y payload; `QuestionEditor.tsx` evita cargar el editor completo desde generación. El borrador local se ubica en `drafting/local-activity-draft.ts`.
- `publication/authoring-persistence.ts` posee identidad/revisión confirmadas y creación diferida. Un create confirmado seguido de save fallido conserva el ID y su revisión; el retry no duplica create. Guardado, metadata, plazo y publicación son operaciones distintas. La UI conserva el cerrojo de operaciones.
- `publication/authoring-deadline.ts` valida huecos y horas repetidas; React conserva selección, resolución y mensajes. El payload usa la fecha local elegida originalmente.
- `generation/` reúne UI y hook. `generation-form.ts` separa valores/defaults de JSX; `generation-requests.ts` posee identidad idempotente y límites de cantidad. Hook conserva cancelación, polling e intentos; UI conserva el consentimiento de cargos, revisión y aplicación única como borrador privado.
- API de transporte permanece en `api.ts`, sin imports runtime. `model/authoring-operations.ts` contiene contratos compartidos dentro de esta feature; `activity-scope.ts` sigue siendo la regla compartida de alcance.
- CSS movido completo a `drafting/ActivityAuthoring.module.css`; generación reutiliza los mismos estilos. Comparación normalizando CRLF contra HEAD: contenido, orden y selectores idénticos. No se consolidaron selectores.

### Evidencia observada

- RED de extracción: suite nueva pasó 3 y falló 3 por ausencia de persistence/deadline/draft-rules. Tras implementación: 6/6 GREEN.
- Suite nueva ampliada: 10/10, incluyendo rutas/payload/abort, conflictos, CAS/retry, DST, transformación de preguntas/rúbrica, identidad de generación, guardado vs publicación explícita, hook sin generación automática al cargar fuentes y cambios admitidos tras bloqueo.
- Comando final puro: `node --test tests/frontend-authoring-cases.test.mjs apps/web/src/features/activity-authoring/model/activity-scope.test.mjs tests/p7-authoring-time.test.mjs tests/p7-authoring-client.test.mjs` → 15/15, exit 0.
- `npx eslint apps/web/src/features/activity-authoring` → exit 0. `git diff --check -- apps/web/src/features/activity-authoring tests/frontend-authoring-cases.test.mjs` → exit 0.
- Comando anterior agregó `tests/p7-authoring.test.mjs` y pasó 24/24. Ese archivo ejecutó `withP5Database` sobre fixture propio descartable; cleanup observado `exit0`. Se informó al coordinador: se incluyó sin advertir previamente que excedía el límite asignado de no ejecutar servicios. No se repitió; no se usaron datos retenidos ni proveedores. Emitió warning preexistente de pg sobre consulta concurrente.
- Último typecheck global → exit 1 por composición de application todavía pendiente (dos props autoría y cuatro de grading), sin errores internos en autoría. No se declara tipado global verificado. El coordinador adapta composición fuera de esta superficie.
- No se ejecutó navegador ni build: pendientes de integración coordinada. Pruebas sintéticas no acreditan IA real ni aspecto responsive.

### Contratos públicos y movimientos para integración

`ActivityAuthoring` conserva el nombre de prop `api` y recibe `ActivityAuthoringOperations`. `ActivityGeneration` y `useActivityGeneration` reciben `ActivityGenerationOperations` en `api`. Componer de forma estable con `createActivityAuthoringApi(transport, room.id)` y usar `.generation` para generación. Las entradas públicas `index.ts` apuntan directamente a los dueños nuevos; transporte se importa desde `api.ts`.

| Ruta previa dentro de la feature | Dueño nuevo |
|---|---|
| ui/ActivityAuthoring.tsx | drafting/ActivityAuthoring.tsx; QuestionEditor extraído a drafting/QuestionEditor.tsx |
| ui/activity-Assignment.tsx | drafting/activity-Assignment.tsx |
| ui/EvaluationRubric.tsx | drafting/EvaluationRubric.tsx |
| ui/ActivityAuthoring.module.css | drafting/ActivityAuthoring.module.css |
| ui/ActivityGeneration.tsx | generation/ActivityGeneration.tsx |
| ui/ActivityGenerationForm.tsx | generation/ActivityGenerationForm.tsx y generation/generation-form.ts |
| ui/ActivityGenerationProposal.tsx | generation/ActivityGenerationProposal.tsx |
| ui/GenerationSetup.tsx | generation/GenerationSetup.tsx |
| model/use-activity-generation.ts | generation/use-activity-generation.ts y generation/generation-requests.ts |
| model/activity-generation-api.ts | generation/generation-feedback.ts y api.ts (createActivityGenerationApi) |
| model/brujula-authoring-draft.ts | drafting/local-activity-draft.ts |

Los archivos previos TS/TSX son reexports temporales locales para que el coordinador adapte consumidores y retire puentes. CSS no tiene puente. Tests previos que inyectan `{ call }` deben componer el adaptador; no fueron editados por este escritor. El stub de `parity-authoring-entry.test.mjs` hacia `../model/use-activity-generation.ts` debe apuntar al import nuevo `./use-activity-generation.ts`.

### Estado y primer paso pendiente

Unidad implementada con verificaciones focalizadas verdes; sin commits ni publicación. El coordinador debe reconciliar tests/consumidores/manifests, retirar reexports temporales, actualizar documentación canónica y verificar tipado/build/navegador. No se escribió el tablero ni se marca DONE.

Reversión: restaurar únicamente los archivos previos de autoría desde el candidato base y retirar las nuevas rutas `api.ts`, `model/authoring-operations.ts`, `drafting/`, `generation/`, `publication/`, la suite propia y este registro, coordinando primero cualquier adaptación posterior del orquestador. Preservar cambios de otras features.
