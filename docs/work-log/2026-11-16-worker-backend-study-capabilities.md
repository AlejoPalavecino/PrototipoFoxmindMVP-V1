# TASK-017 / TASK-018 — Capacidades y protocolo de Estudio

- Agente: /root/backend_files_agenda_capabilities, worker; fecha 2026-11-16.
- Worktree/rama: C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind, codex/backend-capabilities.
- Autorización: encargo coordinador sobre diseño backend-capabilities aprobado. No commits, red, proveedores, DB o esquema.
- Superficie: modules/study, core/domain/study/engine.ts (contratos), bootstrap study-composition/runtime, guía y este registro. Se preserva trabajo concurrente.
- Secuencia: checkpoint TASK-017 antes de modificar protocolo TASK-018; coordinador verifica y mantiene tablero.
- Estado: caracterización inicial y contratos en curso.

## Checkpoint TASK-017

- 38 entradas originales→destino en `.test-artifacts/backend-capabilities/study-move.json`; incluye contratos que conservan su ruta como superficie exclusivamente tipada. Familias extraídas: fuentes/materiales, conversaciones, generación/edición de recursos, prácticas y repasos. Router común de forma/estado y ciclo de carpeta en folders; adaptadores/proveedores y HTTP conservados.
- Estado v1 conocido tipado en domain/state: conversaciones/turnos (IDs opcionales históricos), creaciones, prácticas/respuestas/feedback y exámenes/sesiones. Extensiones históricas de memoria y recibos siguen siendo JSON externo/no validado; no se agregó parser ni migración ni restricción de lectura a carpetas previas.
- StudyOptions.generate ahora recibe StudyInput y devuelve StudyResult; feedback usa StudyPractice/StudyAnswers y la salida real de generateDevelopmentFeedback. Eliminados casts del wiring runtime. La captura del protocolo previo ahora es una unión discriminada, sin cambiar su sentinela/replay todavía.
- Motor entrega contexto de schema tipado separado del prompt. schemaFor usa temas/referencias/count estructurados; no JSON.parse(prompt). Provider directo sin contexto conserva schema de vocabulario sin IDs contextuales.
- Autorización adicional root: completar exclusivamente tipos/fixtures propios. Cambiados sólo dos fixtures: deferred<StudyResult> y missingInformation de salida tardía cancelada; feedback completo con orientative/title/markdown/refs/missingInformation. Sin cambios en aserciones ni escenarios.

### Evidencia

- Baseline previa: `node --experimental-transform-types --test` engine/service/study-generation-cancellation/conversation-generation/exact-review-plan/exact-metadata/draft-plan-replacement/import-classroom-plan originales: 72/72 PASS.
- RED schema: `node --experimental-transform-types --test apps/api/src/modules/study/infrastructure/providers/study-response-schema.test.mjs`: 0 PASS/2 FAIL, contexto y enums ausentes.
- RED tipos: tsc noEmit detectó dos TS2578 de expect-error sin usar en generation-contract-types.test.ts (puerto unknown aceptaba entrada/salida inválida). El mismo comando global tuvo errores transitorios ajenos por movimientos académicos; no se presenta como RED global limpio.
- GREEN tipos focalizados: `$studyTypeFiles = @(rg --files apps/api/src/modules/study -g '*.ts'); node node_modules/typescript/bin/tsc --noEmit --target ES2023 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rewriteRelativeImportExtensions --types node @studyTypeFiles`: PASS; incluye todos los tests propios y los dos negativos expect-error.
- GREEN funcional: baseline movida más schema/upload-policy/session-event: 77/77 PASS. Se corrigió una proyección de history que había quitado ID al precisar tipos; la aceptación existente lo detectó y ahora conserva el objeto original. Aserciones intactas.
- `node scripts/check-boundaries.mjs`: PASS, 0 excepciones. Durante extracción detectó ciclos de tipos a través del barrel de folders; se eliminaron usando contratos compartidos sólo de tipos y estado puro.
- `study-agenda-conflicts.test.mjs` no pudo cargar session-event desde bootstrap/study-agenda-integration.ts aún sin remap externo. Coordinador debe remapear mapa global. No se editó esa integración por límite de escritura.

Pendiente checkpoint root antes de modificar protocolo TASK-018; sin build global/DB/proveedores/red. Primer paso siguiente: verificar 017 y preparar pruebas RED de protocolo explícito, conservando autorizaciones múltiples, receipts/cancelación y frontera de cada tx.

## TASK-018 — Protocolo explícito implementado

Gate de entrada: coordinador informó TASK-017 verificado con build global emitido capabilities, guard 0 y caracterización 78/78 más schema. Sólo después de ese gate se reemplazó el protocolo.

### Unidad y contratos

- `generation/application/protocol.ts`: `prepareStudyOperation`, `reserveStudyOperation`, `validatePreparedStudyOperation`, `executePreparedStudyOperation`, `applyPreparedStudyOperation`; `PreparedStudyOperation` y `GeneratedStudyOutput` son uniones discriminadas por generate/feedback.
- `generation/application/study-generation.ts`: reglas de preparación de Chat/herramientas/Plan, reserva de intención y aplicación de contenido. El input se prepara una vez por fase de autorización con la misma lógica dedicada, sin despacho ni escritura de recurso. Los puertos de preparación sólo permiten fuentes/archivos; no exponen generate, feedback o newId.
- `practices/application/feedback.ts`: preparación y aplicación de devolución. Conserva respuestas y resultado objetivo; aplica exclusivamente feedback.
- `domain/command-policy.ts`: forma de comandos y restricción de borrador extraídas sin duplicarlas. El router ordinario y el protocolo explícito usan la misma regla.
- `folders/application/service.ts`: conserva propiedad de UoW, revisión, recibos, cancelación y guardado. No contiene sentinela/captura ni vuelve a ejecutar runCommand para preparar, autorizar o aplicar generación. El dispatcher sólo atiende comandos ordinarios.
- `generation/application/commands.ts` queda limitado a la edición de creación; `practices/application/commands.ts` conserva intentos/respuestas/finalización. Sin reglas de generación duplicadas.
- Sin cambios adicionales a core/engine o bootstrap por TASK-018; mapa de movimientos de TASK-017 permanece vigente.

### Frontera transaccional preservada

1. Preparación bajo UoW de escritura/owner y revisión vigente: obtiene input autorizado, reserva únicamente el turno-intención si corresponde y confirma PENDING. No crea recurso, tarjeta de resultado ni respuesta del asistente.
2. Autorización posterior en otra UoW: relee carpeta, compara revisión/archivo y recompone/hash del input mediante función de preparación sin efectos. El proveedor puede renovar autorización por el callback existente.
3. Proveedor fuera de UoW; mismo perfil/contexto/configuración del wiring vigente, sin fallback o retry nuevo.
4. Aplicación bajo UoW de escritura: cancelación gana antes de comprobar revisión; luego valida de nuevo el snapshot y conserva la lectura/reautorización de fuentes posterior al I/O de la generación. Guarda recurso y recibo terminal juntos una vez.
5. Error: conserva su identidad, devuelve recibo CANCELLED si corresponde y marca FAILED sólo cuando ese mismo recibo continúa PENDING. Expiración/supersesión/replay mantienen sus revisiones anteriores.

La comprobación de revisión continúa bajo el lock de carpeta existente de la UoW. No se agregó un CAS SQL ni se cambió el WHERE de persistencia; no se atribuye una garantía nueva al adaptador.

### RED/GREEN y evidencia

- RED nuevo: `node --experimental-transform-types --test apps/api/src/modules/study/generation/application/tests/generation-protocol.test.mjs`: 0 PASS/3 FAIL por `protocol.prepareStudyOperation is not a function` antes de implementar.
- GREEN inicial: mismo protocolo y caracterización conversation-generation/cancellation/service: 36/36 PASS.
- Nuevos tests terminados: `generation-protocol.test.mjs` (6) y `generation-transaction-phases.test.mjs` (2). Preparación/validación sin proveedor, IDs, recursos, recibos ni mutación; reserva idempotente; revocación en validación y aplicación; feedback conserva respuestas; identidad del error; instrucción legacy española preservada; cuatro UoW separadas; proveedor fuera de tx; replay no vuelve a despachar ni guardar.
- El test de instrucción legacy tuvo RED adicional por una conversión de encoding introducida durante la extracción (`GenerÃ¡`); corregida a la instrucción original `Generá` antes del GREEN final.
- Tanda final: `$studyBehaviorTests = @(rg --files apps/api/src/modules/study -g '*.test.ts' -g '*.test.mjs' | Where-Object { $_ -notmatch '(database|integrations|http)\.test\.' }); node --experimental-transform-types --test @studyBehaviorTests`: 90/90 subtests PASS, 0 omitidos/fallidos. Incluye un smoke de carga del archivo de negativos de tipos; su comprobación real es tsc. Incluye las aceptaciones existentes de cancellation/conversation-generation/exact-review-plan sin modificar aserciones.
- Tipos: `$studyTypeFiles = @(rg --files apps/api/src/modules/study -g '*.ts'); node node_modules/typescript/bin/tsc --noEmit --target ES2023 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rewriteRelativeImportExtensions --types node @studyTypeFiles`: PASS.
- `node scripts/check-boundaries.mjs`: PASS, 0 excepciones congeladas.

### Entrega y límites

Nuevos tests para inventario del coordinador: `apps/api/src/modules/study/generation/application/tests/generation-protocol.test.mjs` y `generation-transaction-phases.test.mjs`; sintéticos/pure, sin servicios externos. APIs nuevas sólo de la capacidad interna generación; firmas públicas de StudyService y JSON persistido/HTTP conservados. No hay nuevo wiring externo obligatorio ni cambios de imports adicionales al mapa TASK-017.

No se ejecutó build global durante la concurrencia de TASK-020, DB, proveedores reales, red ni acceso a secretos/datos retenidos. Pendientes: build integrado fresco, suites SQL/HTTP pertinentes y revisión independiente del candidato por coordinador. No se marcó DONE, ni hubo commits/publicación.

Reversión de TASK-018: restaurar sólo los archivos Study del checkpoint TASK-017 preservado por root, retirar protocolo/study-generation/feedback/command-policy y dos tests nuevos; conservar el movimiento por capacidades y los contratos de TASK-017. Revisar el diff propio, sin reset global. Para revertir ambas tareas, invertir únicamente study-move.json y retirar agregados propios con revisión de consumidores externos; no hay datos que migrar.
