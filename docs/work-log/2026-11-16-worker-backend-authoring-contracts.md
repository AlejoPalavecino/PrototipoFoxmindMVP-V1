# TASK-005 - Contratos de Autoria

Agente: /root/backend_authoring_contracts, worker. Fecha: 2026-11-16.
Worktree: C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind. Rama: codex/backend-capabilities. Base: dd6f4bc92b959cce0e2c68343291614270c4a17e.

Alcance autorizado: contratos expresivos de 15 operaciones; conservar SQL/locks/tx/argumentos, sin HTTP ni esquema. Ownership: authoring/**, prueba propia y registro. Trabajo concurrente preservado; sin commits/proveedores/datos reales.

## Resultado del candidato

Las operaciones aceptan objetos nombrados y retornan filas concretas; sin T elegido por consumidor ni ...unknown[]. authoring-records.ts posee filas y ActivityRow sigue reexportado desde activity-authoring.ts/public existente. RevisionPort se consume de classrooms/public dentro del ownership. Solo el adaptador transforma share/update a SQL; conserva consultas, orden y valores de argumentos y la tx recibida. No abre transacciones.

Guardado conserva COALESCE para rubricas y los CASE e indicadores de presencia de objective, teacherComment y teacherBrief, incluidos null/undefined/cadenas vacias.

## Metodos anteriores -> actuales

readActivities01 -> findActivity; readActivities02 -> listActivities; readAttempts03 -> listPendingReviews; readStudentActivities04 -> listStudentActivityStates; insertActivities05 -> createDraft; updateActivities06 -> updateMetadata; updateActivities07 -> updateDeadline; updateActivities08 -> saveContent; updateActivities09 -> publishActivity; updateActivities10 -> withdrawActivity; readMaterials11 -> findMaterial; readQuestions12 -> listQuestions; readQuestionOptions13 -> listQuestionOptions; readActivityInstructionFiles14 -> listInstructionFiles; readActivityMaterials15 -> listMaterials.

## Evidencia observada

- RED node --test tests/backend-authoring-repository.test.mjs: 0 PASS / 16 FAIL antes de cambiar produccion, por metodos nuevos inexistentes (TypeError esperado).
- GREEN mismo comando: primero 16/16; despues negativos TS 17/17; final 18/18 PASS. Prueba congela las 15 consultas originales con argumentos sinteticos y comprueba identidad de tx/resultado; verifica ambos modos de lock y ocho combinaciones de preservacion de campos.
- Seis negativos TS dentro de un test con @ts-expect-error: SQL libre, scope ausente, T elegido por consumidor, argumentos posicionales, ActivityType invalido y resultado count incorrecto. La ausencia del error esperado tambien falla la prueba.
- TypeScript API createProgram strict/noEmit, entradas service y adapter: 0 diagnosticos pertenecientes a authoring. No reemplaza build global.
- node scripts/check-boundaries.mjs: Architecture AST boundaries passed (0 frozen exceptions).
- Busqueda de nombres numerados anteriores en apps/api/src y tests: sin coincidencias.
- Al actualizar este registro hubo UnicodeEncodeError en Python por encoding cp1252; registro reconstruido explicitamente UTF-8. No afecto produccion ni resultados de pruebas.

## Superficie y limites

Modificados: application/activity-authoring.ts, application/authoring-repository.ts, infrastructure/authoring-repository.ts dentro de la capacidad. Nuevos: application/authoring-records.ts y tests/backend-authoring-repository.test.mjs, ademas del registro. No se editaron public ni otros modulos/pruebas aprobadas. Coordinador debe registrar archivo y test nuevos en inventarios/CI.

Diff propio versus archivos originales antes del movimiento: service +36/-37; contrato +21/-17; adapter +25/-24; records +16 (filas extraidas); prueba +100. Total 276 altas+bajas, mas registro; movimiento previo separado. Sin commits.

Pendiente: build fresco global, suites existentes de rubrica/arquitectura e integracion PostgreSQL descartable coordinados. Unitarias con tx sintetica y tipos no acreditan locks bajo concurrencia real. Tarea no marcada DONE por implementador.

Reversion de unidad: reponer contenido anterior de los tres archivos migrados desde rutas originales en HEAD ajustando imports al movimiento TASK-004; retirar solo records/test propios y revertir sustitucion local de RevisionPort. Conservar movimientos y cambios ajenos; no usar git restore global. Primer paso: coordinador ejecuta build y reconcilia evidencia.
