# TASK-010 / TASK-011 — Participation y Grading

- Agente: /root/backend_identity_capabilities, chuli_worker. Fecha: 2026-11-16.
- Rama/worktree: codex/backend-capabilities, C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind.
- Alcance autorizado por /root: capacidades participation/grading, contratos de repositorio, wiring de student/grading y guia grading. Identity congelado.
- Limites: preservar SQL/locks/tx, reglas, schema y producto. No servicios, DB, red, proveedores, secretos, commits ni build global concurrente.
- Estado: caracterizacion previa y mapa de colaboraciones en curso.

## Movimientos y responsabilidad

- TASK-010: 27 archivos Participation movidos por mapa `.test-artifacts/backend-capabilities/participation-move.json`. Capacidades attempts (acceso/editor, sesion, elegibilidad, eventos y adjuntos), questionnaires (respuestas/envio), practical-submissions (respuesta y archivos de entrega) e history (consultas/reapertura). Dominio puro compartido conservado.
- TASK-011: 21 archivos Grading movidos por `.test-artifacts/backend-capabilities/grading-move.json`. Capacidades review, publication, corrections, progress, assistance y student-analysis. Los workers/adaptadores IA conservaron SQL, perfiles, snapshots, presupuesto y semantica.
- Public APIs nombradas por capacidad; root public reexporta esos contratos y reglas puras. Los tipos hermanos se consumen por public.ts. Se retiro un ciclo de tipos heredado entre AttemptAttachments y Questionnaire usando un puerto consumidor local de assertAttemptWrite.
- Los adaptadores hermanos ya no se importan: student composition inyecta eventos/acceso/recepcion/readers a history/questionnaires/practical-submissions. Grading composition inyecta studentSnapshot/displayReferences al repositorio de progress. No hay adapters exportados por public.ts.
- Cinco consumidores de advanceRevision en ambos dominios usan RevisionPort de classrooms/public; se retira Materials como duenio indirecto de esa colaboracion.
- 93 operaciones de repositorio dejan rest unknown[] y aceptan objetos concretos; lockAttempt/lockGrade de review conservan write explicito y reciben el comando como tercer argumento. Relojes no reciben input vacio. Se tiparon identidades proyectadas en vez de Record<string,unknown>. Ninguna query SQL, lock, transaccion, decision funcional o schema fue alterada.

## Evidencia observada

- Antes de mover: `node --test tests/grading-participation-modules.test.mjs`: 35/35 PASS, con 14 fingerprints SQL, aislamiento de aplicacion y cinco escenarios de comportamiento.
- RED de los contratos nuevos: `node --experimental-transform-types --test apps/api/src/modules/participation/attempts/application/repository-contracts.test.mjs apps/api/src/modules/grading/review/application/repository-contracts.test.mjs`: 21 PASS/86 FAIL, 107 total. Causa esperada: el contrato anterior enviaba el objeto entero como un unico argumento SQL, frente a los parametros individuales esperados. Los siete relojes sin input y las 14 huellas permanecian verdes.
- GREEN mismo comando: 107/107 PASS. 93 comprobaciones de orden/valor de parametros sobre el tx recibido y 14 huellas exactas del SQL/locks anterior. Fuente real transpileada en memoria, sin DB.
- Caracterizacion por fuente: `node --experimental-transform-types --test apps/api/src/modules/participation/attempts/application/acceptance.test.mjs apps/api/src/modules/grading/review/application/acceptance.test.mjs`: 5/5 PASS. Copias de los cinco escenarios anteriores, sin debilitar assertions; imports y mocks adaptados a comandos. Preserva autoridad/lock, fraccion manual rechazada, auditoria→update→revision→aviso, alumno no esperado rechazado y revalidacion/recepcion confiable.
- Ejecucion conjunta de esos cuatro test files: 112/112 PASS. Tests compartidos originales sin editar por este agente.
- Tipos: TypeScript createProgram con tsconfig API y noEmit, getPreEmitDiagnostics filtrado a mis dos dominios y tres bootstrap: 0 errores propios. El arbol concurrente tenia 87 diagnosticos externos, por lo que NO acredita compilacion global PASS. Primer control propio detecto 15 problemas: RevisionPort era funcion y no objeto, nulls previos de deadline/origen, export de EditorCapability y actividad-topics movido concurrentemente; corregidos. repository-types.test.ts de ambos dominios incluye seis negativos con @ts-expect-error y llamadas validas comprobadas.
- `node node_modules/eslint/bin/eslint.js apps/api/src/modules/participation apps/api/src/modules/grading apps/api/src/bootstrap/academic-student-composition.ts apps/api/src/bootstrap/academic-grading-composition.ts apps/api/src/bootstrap/academic-student-runtime.ts`: PASS, exit 0.
- `checkBoundaries(process.cwd())` filtrado a /participation/ y /grading/: PASS, sin hallazgos ni ciclos propios.
- No build global concurrente, DB, SMTP, proveedor real, secrets, red o cambios de datos. Los fingerprints no acreditan ejecucion PostgreSQL ni concurrencia real.

## Handoff y pendientes del coordinador

- Remapear imports externos/tests/inventarios por los dos mapas completos. No hay puentes de compatibilidad con implementacion duplicada.
- Los repositorios de history/questionnaires/practical-submissions/progress son Omit de sus colaboraciones; los hosts autorizados ya las inyectan. Si otros tests construyen directamente estos repositorios, deben inyectar los mismos puertos sinteticos explicitamente.
- Shared grading-participation: mocks de submitAttempt reciben {attemptId, receivedAt, deadline, late}; insertCorrection recibe {gradeId, previousGrade, newGrade, reason, actorId}; lockAttempt/lockGrade reciben (tx, write, input). Mantener su evidencia funcional al adaptar firmas, no suprimir escenarios.
- Nuevos tests para inventario: attempts/application/{repository-contracts.test.mjs,acceptance.test.mjs,repository-types.test.ts} en Participation y review/application con los mismos nombres en Grading. Los acceptance propios duplican los escenarios shared: el coordinador puede retirarlos tras comprobar los originales remapeados para evitar duplicacion duradera.
- Compilacion fresca/tipos globales, inventario/runners, tests compartidos y DB aislada siguen pendientes. Tareas implementadas y verificadas por fuente, no DONE.
- Reversion: invertir exclusivamente los mapas de 27+21 movimientos, restaurar exports/comandos/wiring y guia de este corte desde diff revisado, retirar nuevos public/tests propios. No reset global ni revertir otros dominios. No hay datos a revertir.

### Reconciliacion final con coordinador

Los dos acceptance.test.mjs propios se usaron como evidencia temporal y se retiraron a pedido del coordinador para evitar duplicar los cinco escenarios de los 35 tests shared existentes. El resultado observado 112/112 corresponde a esa ejecucion temporal, no al inventario final. Quedan cuatro altas finales: participation/attempts/application/repository-contracts.test.mjs y repository-types.test.ts; grading/review/application/repository-contracts.test.mjs y repository-types.test.ts. Los .mjs son pruebas runtime; los .ts aportan negativos al typecheck. El coordinador preserva y remapea los 35 tests shared originales.
