# Frontend Study — extracción por casos de uso

Agente: /root/frontend_study, worker. Fecha: 2026-11-16.
Rama: codex/frontend-cohesion. Worktree: C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind. Base: dd6f4bc con corrección concurrente de contexto del coordinador.

## Alcance
TASK-004: contratos, transporte, errores, helpers y controlador separados, preservando HTTP e idempotencia. TASK-006 requiere GO del coordinador después de evidencia de etapa 1. Escritura sólo features/study, study-screen, prueba nueva frontend-study-cases y este registro. Aceptación existente protegida. Sin commits, servicios ni proveedores.

## Evidencia y estado
Inicio: árbol con cambios ajenos de grading, corrección de study-client y documentación del coordinador; preservados.
Contrato backend leído: NEW_ATTEMPT devuelve result.practice con ID del nuevo intento.
TASK-004: extraídos model/study-contracts.ts (DTO), model/study-commands.ts (datos de comandos y respuesta, puerto), model/study-transitions.ts (validación y respuestas), model/study-revision-controller.ts (control de revisión/contexto intacto), api/study-http.ts (HTTP/idempotencia) y api/study-error.ts (errores de transporte).
api.ts tiene sólo transporte/error y tipos; no exporta controlador ni helpers runtime. index.ts expone modelo/controlador. api/study-client.ts conserva reexports temporales para pruebas existentes protegidas y consumidores pendientes de TASK-006. Pantalla importa controlador por index.ts.

Comando baseline: node --test tests/frontend-study-context.test.mjs apps/web/src/features/study/api/study-client.test.mjs apps/web/src/features/study/model/study-payload.test.mjs apps/web/src/features/study/model/study-sequence.test.mjs: 24/24.
La primera extracción produjo mojibake por lectura Python sin encoding explícito: 23/24; corregido sin editar aceptación, rerun 24/24.
Comando ampliado: node --test tests/frontend-study-context.test.mjs apps/web/src/features/study/api/study-client.test.mjs apps/web/src/features/study/model/*.test.mjs tests/foxy-study-demand-panels.test.mjs: 41/41 GREEN.
Comando tipos: npx tsc --noEmit -p apps/web/tsconfig.json --incremental false: falla sólo en tres consumidores de MaterialsOperations en application/academic-ClassroomView.tsx (199, 201, 203), superficie concurrente ajena. El error propio inicial status faltante en StudyFolderInput fue corregido.
No se cambió comportamiento intencional en esta etapa, por eso se caracterizó antes/después con aceptación existente; no se creó prueba de implementación.

Estado: etapa 1 entregada para revisión; esperando GO explícito del coordinador para TASK-006. Pendiente: casos de uso, pantalla fina, selección por result.practice.id y prueba RED/GREEN nueva; navegador/build final a cargo del coordinador.

## Reversión
Restituir únicamente rutas de esta unidad desde su diff, preservando la corrección previa del coordinador y archivos ajenos. No usar reset del worktree.


## TASK-006 — casos y pantalla
GO explícito del coordinador recibido antes de comenzar esta etapa.

Responsabilidades:
- folders/use-study-folders.ts: colección, detalle, carga/recarga, errores y busy. folders/study-folder-operations.ts coordina revisión con invalidación de contexto y conserva el lock de la carpeta actual ante respuestas tardías. Pantalla conserva sesión, rutas y wiring.
- folders/study-folder-persistence.ts: operaciones nombradas de borradores, importación/análisis de plan, configuración y vista previa DOCX. Componentes no construyen createStudyClient.
- conversations/use-study-conversations.ts: selección, borrador por chat, búsqueda y renombrado. conversations/use-study-chat.ts: identidad/reintento de comando, envío pendiente, bloqueo de duplicado y cancelación.
- creations/use-study-creations.ts: selección y búsqueda/filtros. creations/study-creation-editor.tsx: lectura/edición y descarte del borrador de creación.
- practice/use-study-practice.ts: selección/preview y nuevo intento por result.practice.id. No consulta nuevamente el detalle ni usa la última posición.
- model/study-transitions.ts incorpora sólo la práctica devuelta por un comando confirmado antes del refresh: un refresh fallido conserva el intento disponible y la revisión confirmada. El guard generation/context del controlador se conserva.
- StudyRun, StudyCommand, StudyRevisionPort y el transporte usan StudyCommandData[A], con respuestas tipadas. Sin cambios HTTP.

Movimientos de vistas:
- ui/study-collection.tsx -> folders/study-folder-collection.tsx.
- ui/study-creation-dialog.tsx -> folders/study-folder-wizard.tsx.
- ui/study-practice.tsx -> practice/study-practice.tsx.
- Editor de creación inline en workspace -> creations/study-creation-editor.tsx.
- api/study-client.ts eliminado después de avisar al coordinador. createStudyClient -> api/study-http.ts; StudyError -> api/study-error.ts; DTO -> model/study-contracts.ts; helpers -> model/study-transitions.ts; controller -> model/study-revision-controller.ts.
- ui/study-wizard.tsx conserva editor real del plan y la entrada pública del wizard/colección. index.ts conserva nombres públicos y publica useStudyFolders.

CSS no fue modificado ni movido: las vistas movidas importan ui/study.module.css. Selectores/clases y orden de presentación conservados. La expansión de JSX/código comprimido genera un diff grande: las líneas de presentación son movimientos/formato mecánico, no un rediseño.

Evidencia test-first:
1. tests/frontend-study-cases.test.mjs: RED en nuevo intento por segunda consulta HTTP inesperada; el escenario de operaciones no tenía aún su módulo. GREEN posterior 2/2.
2. Confirmed new attempt + refresh fallido: RED por practices vacío; transición pura mínima -> GREEN 6/6.
3. Suite propia final cubre selección exacta sin lecturas extra, errores tardíos, lock B frente a A tardío, borradores por chat, identidad de reintento y conservación del intento confirmado.

Comandos:
- node --test tests/frontend-study-cases.test.mjs: 6/6 GREEN.
- node --test tests/frontend-study-cases.test.mjs tests/foxy-study-demand-panels.test.mjs tests/study-exact-generation-model.test.mjs tests/study-exact-generation-hook.test.mjs tests/study-exact-generation-ui.test.mjs apps/web/src/features/study/model/study-discovery.test.mjs apps/web/src/features/study/model/study-file-policy.test.mjs: 33/33 GREEN antes de agregar el sexto test propio.
- npx eslint apps/web/src/features/study apps/web/src/screens/study-screen.tsx: GREEN.
- npx tsc --noEmit -p apps/web/tsconfig.json --incremental false: GREEN completo en candidato posterior a retiro/movimientos. Las fallas anteriores de composición concurrente se resolvieron por sus escritores.

Aceptación protegida no editada por este worker. Coordinador informado de rutas retiradas y del seam de test de pantalla: useStudyFolders ahora se importa vía index y carga api.ts desde el interior de la feature. Los tests existentes necesitan la migración de rutas por su escritor autorizado. Hubo 41/41 antes del retiro del shim y 37/37 durante la separación; ejecutar de nuevo los nueve escenarios del guard desde la nueva ruta.

Límites: no ejecuté build ni navegador; no usé proveedores/datos/servicios, no hice commits ni toqué el tablero. TASK-006 entregado para verificación independiente, sin declarar DONE. Pendiente inmediato: coordinador reconcilia imports/manifiestos de pruebas y verifica suites completas/guard, build y UI sintética.
