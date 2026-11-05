# Brújula: contratos de autoría, muro y corrección — RED/GREEN local

- Agent / role: worker de contratos y persistencia.
- Session or task ID: /root/brujula_contracts_complete.
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula; checkout compartido.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: [BRU-06–08](../../odd/tasks/foxmind-brujula.md).
- Status: completed.

## Request and scope

Preparar contratos concretos y pruebas RED para objetivo/comentario separados, título de muro y puntajes por criterio con snapshot por intento. No implementar persistencia hasta aviso del coordinador de aprobación humana. No tocar Home, catálogo, wizard ni pantallas; preservar cambios previos de otros agentes.

Actualización de autorización: root transmitió aprobación humana de «Sugerida ponderada y final editable (recomendado)» y del resto de campos en alcance HTML. Root confirmó override explícito para todos los tipos y conservación de override al omitir el campo. Se ejecutó GREEN dentro de esas condiciones.

## Work performed

Inspección de roadmap, protocolo, tarea Brújula, HTML de referencia, schema y contratos/API de actividades/muro/corrección. El HTML exige objetivo y comentario separado; muro tiene título; corrección mantiene puntajes 0..10 por criterio y copia de rúbrica publicada. Actualmente esos datos faltan en el modelo persistido.

Contrato final:

- Autoría: `objective: string | null`, `teacherComment: string | null`, distintos de `instructions`; objetivo máximo 1400 caracteres; comentario máximo 5000, público junto con actividad. Campos opcionales en entrada histórica, omitirlos conserva valores existentes.
- Muro: `title: string | null` en posts; opcional en `publish`/`editPost` para compatibilidad histórica, 120 caracteres como referencia. Respuestas conservan solamente cuerpo. Retiro oculta también título.
- Corrección: entrada opcional `rubricMarks: { criterionIndex: number; score: string | null }[]`; índice contra snapshot congelado, decimal canónico 0..10 con hasta dos decimales. Respuesta agrega `rubricSnapshot`, `rubricMarks`, `suggestedGrade`, `calculatedGrade` y `finalGradeOverride`. La sugerida se calcula con aritmética entera exacta y redondeo a centésimos. Una rúbrica incompleta deja sugerida null; no redefine la fórmula histórica por preguntas.
- `finalGradeOverride?: string | null` distingue omisión (preservar), null explícito (volver a calculada) y valor (final docente). `overallGrade` conserva su contrato previo: manual para ASSIGNMENT, null en preguntas. Publicar preguntas todavía exige completar y validar cada puntaje. Aplicar IA usa la misma ruta privada y no envía override.
- Snapshot/marcas privados hasta publicación explícita; omitir marcas no recalcula notas históricas. Snapshot por intento impide reinterpretar criterios al editar la actividad.

Superficies modificadas: `prisma/schema.prisma` y migración aditiva `202611050002_brujula_activity_grading_wall`; `apps/api/src/classrooms/{activity-policy,activity-authoring,activity-draft,activity-ai/apply,grading,grade-publication,wall,wall-read}.ts`; `src/core/domain/{rubric-marks,classroom-grading,classroom-grading-types,classroom-grading-output,classroom-wall}.ts`; ActivityDetail en `apps/classrooms-ui/api.ts`; validación en `apps/web/src/lib/classroom-proxy.ts`; inventario explícito de migraciones en `tests/helpers/migration-inventory.mjs`. No se editaron pantallas. No se tocaron los cambios previos de rúbrica que ya estaban en el checkout.

El snapshot se materializa al primer guardado de marcas por intento; siguientes guardados preservan su definición aunque la actividad difiera. Las actividades ya impiden edición de contenido tras participación. Publicación congela snapshot, marcas, sugerida, calculada y override mediante trigger; corregir una nota publicada cambia final_grade y agrega el historial existente, conservando esa evidencia.

## Verification

`node --test tests/brujula-contract-parity.test.mjs` observado: exit 1; 10 casos, 5 PASS y 5 FAIL esperados por campos inexistentes. Fallan autoría independiente, publicar/editar título, aceptar marcas y devolver snapshot publicado. Pasan entradas históricas, rechazo de marcas inválidas (actualmente rechaza todo el campo) y proyección pending sin filtraciones. Esta última prueba no sustituye verificación de permisos SQL ni persistencia. No se ejecutaron migraciones ni se leyó configuración privada.

GREEN observado:

- `node scripts/build-api.mjs`: Prisma generate y TypeScript API exit 0.
- `node --test tests/brujula-contract-parity.test.mjs tests/brujula-contract-parity-proxy.test.mjs tests/brujula-contract-parity-database.test.mjs`: 14 PASS / 0 FAIL. PostgreSQL efímero propio, migraciones completas y cleanup exit0. Prueba persistencia de campos, compatibilidad omitida, retiro de título/cuerpo, permisos, todos los tipos, null/omisión de override, sugerida, snapshot congelado, publicación explícita, corrección posterior y trigger inmutable.
- `node --test tests/brujula-contract-parity.test.mjs tests/p8-grading.test.mjs tests/p8-publication.test.mjs tests/brujula-rubric-database.test.mjs`: 36 PASS / 0 FAIL, incluidos subtests de P8 y limpieza propia exit0.
- Invocación inicial de lifecycle/publication sin loader: 6 FAIL por `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` (parameter properties); no se considera prueba funcional fallida del candidato. Repetición correcta `node --import ./scripts/register-api-test-build.mjs --test tests/activity-ai-publication.test.mjs tests/activity-ai-lifecycle.test.mjs tests/p8-grading-proxy.test.mjs tests/p8-publication-proxy.test.mjs tests/p8-corrections-proxy.test.mjs tests/audit-wall-proxy.test.mjs`: 15 PASS / 0 FAIL.
- ESLint focal sobre las 15 superficies TypeScript modificadas: exit0, repetido después de los ajustes de proxy.
- `npx tsc -p apps/web/tsconfig.json --noEmit`: PASS inicial; repetición durante edición concurrente de Wall detectó errores en Wall.tsx:36/140 y se informó al autor UI/coordinador. Esa repetición no se declara PASS. `npx tsc -p apps/classrooms-ui/tsconfig.json --noEmit` aislado no está disponible por declaraciones CSS de Agenda/Classrooms; el proyecto web sí incluye sus declaraciones.

No se probaron proveedores reales ni navegación UI desde esta tarea. Solo fixtures sintéticos propios, sin configuración privada/base retenida.

## Commits and outcomes

Sin commits ni publicación. Producción sin cambios de esta tarea.

## Handoff

Implementación de contratos congelada para integración del coordinador. Primera acción siguiente: reconciliar tests/inventario de suite y comprobar tipos globales después de terminar las ediciones UI concurrentes; root mantiene el registro de tareas/roadmap y la aceptación integral. UI autoría/muro y UI corrección recibieron nombres/semántica exactos. Disponible para subalcance Foxy, todavía no asignado ni iniciado. Sin despliegue, commits, merge ni push.

## Reapertura por revisión independiente: pending y base calculada

Root asignó corregir el caso de QUESTIONNAIRE/EVALUATION con respuesta DEVELOPMENT pendiente y override9: la vista devolvía pendingfalse aunque publicar correctamente rechazaba puntajes faltantes. También encontró que calculated_grade:null explícito en TP se reemplazaba por el override mediante fallback nullish.

`tests/brujula-contract-parity-pending.test.mjs` nuevo: RED con `node --import ./scripts/register-api-test-build.mjs --test tests/brujula-contract-parity-pending.test.mjs` observado4casos,3FAIL y1PASSlegacy. La corrida sin loader falló antes por parameter properties TypeScript; no fue evidencia de comportamiento.

Fix mínimo en grading.ts: pending contempla earnednull por pregunta, incluso con nota final elegida; calculated_grade:null se conserva y solo undefined usa el fallback histórico. Se agregó un quinto caso para nota publicada histórica con base desconocida pero preguntas completas, que debe seguir sin pendientes. Mismo fallback aplicado a la base de TP durante publicación en grade-publication.ts, sin debilitar la completitud de preguntas ni guardas de publicación. ESLint de ambos archivos exit0 antes del refinamiento de pending. Recompilación coordinada por root antes de GREEN; no hubo builds simultáneos de este agente.

Root confirmó fin de su build y autorizó recompilar sin concurrencia. `node scripts/build-api.mjs` observadoPASS (Prisma/API). GREEN con `node --import ./scripts/register-api-test-build.mjs --test tests/brujula-contract-parity-pending.test.mjs tests/brujula-contract-parity-database.test.mjs tests/p8-publication.test.mjs`:19PASS/0FAIL, incluidos cinco casos nuevos y regresión de publicación/SQL. ESLint de grading.ts y grade-publication.ts repetidoPASS.

Se amplió además SQL propio en `tests/brujula-contract-parity-database.test.mjs`: guardado real de override9 con puntajes manuales null devuelve pendingtrue para QUESTIONNAIRE/EVALUATION, intento de publicar rechaza CONFLICT sin mutación; ASSIGNMENT conserva calculatednull y limpiar override devuelve finalnull/pendingtrue. Repetición `node --test tests/brujula-contract-parity-database.test.mjs`:1PASS/0FAIL, cleanup PostgreSQL propio exit0. No se debilitó la publicación ni se tocó UI.

Freeze reabierto/cerrado solo para esas dos superficies productivas, los dos archivos de pruebas y este registro. Root y reviewer recibieron causa, RED/GREEN y rutas. Siguiente acción del coordinador: revisión independiente y selección integral del candidato actual.

### Corrección posterior: representación SQL histórica null

El reviewer detectó que las filas SQL reales previas reciben calculated_gradeNULL al agregar la columna; el caso undefined cubría solo adaptadores. Se reabrió esta unidad: el primer fix podía presentar una nota TP histórica7 como pendiente. RED adicional de esa forma SQL:6casos,5PASS/1FAIL esperado.

Solución final que supersede el fallback anterior: la migración aditiva `202611050002_brujula_activity_grading_wall` realiza backfill calculated_grade=final_grade para filas preexistentes antes de activar el trigger de evidencia publicada; no modifica final_grade, estado ni published_at. Lectura y publicación agregan fallback defensivo únicamente cuando calculadaNULL y overrideNULL; una baseNULL explícita con override9 sigue siendoNULL y no se inventa una base9.

Nuevo `tests/brujula-contract-parity-migration.test.mjs` verifica upgrade SQL real sobre fixture PostgreSQL propio: crea notas7privada/8publicada, restaura allí el esquema inmediatamente anterior y ejecuta el archivo de migración exacto; notas/estado/fecha pública idénticos, calculated inicializada, lectura/guardado conserva7 y resultado público conserva8. La restauración de esquema solo ocurre dentro de fixture efímero identificado y limpiado por el harness, nunca una base retenida.

Verificación final fresca: `node scripts/build-api.mjs`PASS; `node --import ./scripts/register-api-test-build.mjs --test tests/brujula-contract-parity-pending.test.mjs tests/brujula-contract-parity-database.test.mjs tests/brujula-contract-parity-migration.test.mjs tests/p8-publication.test.mjs` →21PASS/0FAIL; tres limpiezas propias exit0; ESLint grading.ts/grade-publication.tsPASS. Root/reviewer recibieron la causa, solución y evidencia actual. Freeze final incluye ahora migración y prueba de upgrade; no se considera vigente el cierre intermedio antes de esta corrección.
