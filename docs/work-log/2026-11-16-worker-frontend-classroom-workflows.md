# Colección, ingreso y creación de aulas

- Agente `/root/frontend_authoring`, TASK-008; sesión no expuesta.
- Fecha 2026-11-16, rama `codex/frontend-cohesion`, worktree `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`; candidato base asignado `dd6f4bc` con cambios concurrentes preservados.
- Autorización: extraer responsabilidades de ClassroomsApp/Wizard conservando interfaces públicas y comportamiento según `docs/engineering/frontend/cohesion-refactor.md`.
- Escritura: dos componentes application asignados; carpetas nuevas collection/enrollment/creation de classrooms; index opcional; suite y registro propios. Sin cambios en pruebas heredadas, estilos, backend, contratos core o tablero.
- Evidencia inicial pendiente: RED de persistencia/cola, carga concurrente e ingreso antes de implementar.
- Límites: no servicios, proveedores, datos retenidos ni operaciones Git. Pruebas existentes únicamente con setup puro inspeccionado.
- Reversión: retirar nuevas unidades y restaurar únicamente cambios de los dos componentes de esta tarea, coordinando consumidores posteriores del root.
- Estado: en implementación; no DONE. Pendiente inmediato: pruebas RED.

## Responsabilidades extraídas

- `collection/collection-api.ts` (22 líneas): lecturas independientes y create/get/delete de pendientes mediante transporte inyectado. Conserva métodos, revisión, confirmación y abort.
- `collection/collection-requests.ts` (14) y `use-classroom-collection.ts` (29): un token por parte del catálogo; sólo la lectura vigente actualiza datos/errores. Las confirmaciones de eliminación/invitación invalidan lecturas anteriores.
- `enrollment/enrollment-api.ts` (17) y `use-classroom-enrollment.ts` (31): vista previa del código, normalización vigente de seis dígitos y confirmación explícita. El hook posee código/preview/error/apertura; navegación, actualización de notificaciones y mensajes globales permanecen en composición. Invitaciones conservan su operación accept/decline.
- `creation/creation-api.ts` (13): PATCH y publicación por revisión con puerto tipado. `draft-persistence.ts` (54) posee revisión, snapshot confirmado, cola compartida con extracción y fallo recuperable vigente. El payload editable mantiene un único dueño React; el controlador consulta su snapshot al ejecutar cada trabajo en cola. Publicar conserva el guardado previo explícito del Wizard.
- `creation/use-classroom-plan-file.ts` (118): una selección de archivo, upload, validación, polling y consulta manual. Recibe puertos tipados, cerrojo compartido y callbacks; no accede al programa ni a revisiones. Conserva formato/tamaño de archivo, respuestas tardías, estados de rechazo, abort y pausa con documento oculto.
- `creation/wizard-validation.ts` (24): validación de datos generales, archivo aprobado, nombres/límites del programa y propuesta aplicada antes de revisar.
- Entradas públicas existentes de ClassroomsApp y Wizard sin cambios de props. Application importa capacidades desde `features/classrooms/index.ts`; no quedaron imports privados a los casos nuevos. Los adaptadores sólo importan tipos y no requieren un api.ts raíz nuevo.
- ClassroomsApp: 440 → 379 líneas. Wizard: 397 → 268. No se comprimió JSX ni se trasladó el componente completo a un hook. Navegación entre features, pasos/foco y coordinación curricular permanecen en application.

## Evidencia y límites

- RED: `node --test tests/frontend-classroom-workflows.test.mjs` → 0/4 por módulos extraídos todavía inexistentes (`ENOENT`). Tras implementar → 4/4; ampliación final propia → 7 pruebas.
- Comando focalizado final: `node --test tests/frontend-classroom-workflows.test.mjs tests/classroom-creation-four-steps.test.mjs tests/classroom-wizard-file-step.test.mjs tests/wizard-reference-navigation.test.mjs tests/classrooms-reference-controls.test.mjs tests/classrooms-reference-filter.test.mjs` → 32/32, exit 0. Sin servicios ni proveedores: helpers cargan componentes/puertos sintéticos en memoria.
- Cubre cola de saves con payload más reciente/revisiones confirmadas, sticky failure, aplicación de extracción, identidad de cargas concurrentes, invalidación tras confirmar, preview/confirm separados, rutas/payload/abort, cuatro pasos, IA explícita, revisión, reintento de publicación y selección de archivo tardía.
- `npx eslint apps/web/src/features/classrooms/collection apps/web/src/features/classrooms/creation apps/web/src/features/classrooms/enrollment apps/web/src/application/academic-Classrooms.tsx apps/web/src/application/academic-Wizard.tsx` → exit 0.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json` → exit 0 en candidato final (repetido tras limpieza de imports). Durante la extracción detectó el wrapper upload sin Promise en todos los caminos; corregido con wrapper async. Un error concurrente de Foxy desapareció tras su integración por el escritor correspondiente.
- `git diff --check` sobre superficies propias → exit 0.
- Barrido previo con `tests/brujula-wizard-parity.test.mjs` → 29/30: único error de import al antiguo `curriculum/model/WizardPlanText.ts`, movido concurrentemente por root. Se informó al coordinador; prueba heredada no editada. No se declara ese archivo verde.
- `pending-classrooms.test.mjs` no ejecutado: contiene pruebas que levantan servidores HTTP, fuera del encargo. No se ejecutaron fixtures de DB ni servicios. Límite 50 de invitaciones batch y filtros/paginación existentes no fueron modificados.
- Sin pruebas visuales/build por este escritor. El coordinador verifica composición y navegador después de los movimientos mecánicos. No commits, publicación ni tablero.

## Mapa propuesto para el movimiento del coordinador

| Fuente vigente | Destino propuesto |
|---|---|
| application/academic-Classrooms.tsx | application/workflows/classroom-collection/ClassroomsApp.tsx |
| application/academic-Wizard.tsx | application/workflows/classroom-creation/ClassroomWizard.tsx |
| classrooms/ui/ClassroomCollection*.tsx y PendingClassroomCard.tsx | classrooms/collection/ (controles junto a su estado/caso) |
| classrooms/ui/PendingInvitations.tsx | classrooms/enrollment/PendingInvitations.tsx |
| classrooms/ui/WizardGeneral.tsx, WizardReview.tsx, ClassroomWizardCover.tsx, ClassroomProcessing.tsx | classrooms/creation/ (controles de creación junto a persistencia/archivo) |

No se movieron esos archivos ni estilos. El coordinador debe ajustar imports relativos, lazy Wizard/ClassroomView y rutas de fixtures al mover application, y conservar orden/selectores CSS antes de consolidar. No se introdujeron puentes en esta unidad.

## Entrega al coordinador

Producción liberada para sus movimientos. Tarea implementada y verificada de forma focalizada; no marcada DONE. Primer paso pendiente: reconciliar movimientos/fixtures heredados y verificar candidato completo. Reversión: restaurar únicamente cambios de academic-Classrooms/academic-Wizard e index de classrooms de esta unidad y retirar carpetas nuevas collection/enrollment/creation, suite propia y registro, preservando cualquier adaptación posterior del coordinador.
