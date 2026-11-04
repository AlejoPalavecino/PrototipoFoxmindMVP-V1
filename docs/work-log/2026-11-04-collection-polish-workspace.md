# AULA-001 — Colección Mis aulas, implementación y evidencia focal

- Agent / role: collection worker
- Session or task ID: /root/collection_polish
- Date: 2026-11-04
- Branch / worktree: codex/classroom-workspace-polish; checkout compartido
- Starting commit: b0393247ba104f275fd6c4b2296fdee591ca7661
- Phase and detailed task/spec links: [AULA-001](../../odd/tasks/classroom-workspace-polish.md)
- Status: in_progress

## Request and scope
Colección compacta con Activas inicial/Archivadas, filtros combinados y chips; pendientes primero. Preservar APIs, autoridad/deduplicación, callbacks y CTA por rol. Sin commit, servicios ni datos retenidos. Root conserva integración, inventario y QA visual.

## Work performed
Inspeccionados AGENTS, roadmap, protocolo, tarea aprobada, componentes y pruebas de colección. Estado inicial con dos documentos de coordinación no versionados, conservados; los cambios simultáneos de otros agentes no se modificaron.

- `apps/classrooms-ui/ClassroomCollection.tsx`: estado activo inicial, sección accesible y mensajes de vacío por estado. Limpieza de criterios conserva estado, participación y búsqueda del padre.
- `apps/classrooms-ui/ClassroomCollectionFilters.tsx`: Activas/Archivadas explícitas con conteos de colección deduplicada; búsqueda/ciclo/división combinados, chips removibles. Estado ya no ocupa el desplegable ni cuenta como criterio avanzado. Mantiene filtros de participación existentes y controles de vista.
- `apps/classrooms-ui/ClassroomCollectionCard.tsx`: título, estado, materia/división/ciclo y docente solo para estudiante. Un único Entrar conserva callback. Se retiraron los textos redundantes de participación y Docente: Vos.
- `apps/classrooms-ui/Classrooms.tsx`: pendientes antes de colección, mismos callbacks/condiciones/confirmaciones; clase de página para alcance de estilos.
- `apps/shared-ui/classroom-collection-workspace.css`: banner más bajo, cards/lista compactas, chips/estados y responsive; foco/reduced motion. Root debe importarlo al final. No se alteraron los assets ni navbar común.
- `tests/classroom-collection-workspace.test.mjs`: tres pruebas de selección inicial/autoridad/conteos, intersección/chips y contrato por rol de tarjeta.
- `tests/classrooms-reference-controls.test.mjs`: expectativas obsoletas actualizadas por criterio aprobado: el estado se elige explícitamente fuera de Más filtros; limpiar filtros conserva Activas y no vuelve a mostrar archivadas.
- `collection-filter.ts` y sus contratos de bajo nivel permanecen sin cambios.

## Verification
RED antes de producción: `node --test tests/classroom-collection-workspace.test.mjs`: 2 tests, 0 PASS, 2 FAIL; inicial incluía archivadas y no existían chips removibles. Falla observada, exit 1.

GREEN final: `node --test tests/classroom-collection-workspace.test.mjs tests/classrooms-reference-controls.test.mjs tests/classrooms-reference-filter.test.mjs tests/foxmind-3d-flows-collection.test.mjs`: 14 PASS, 0 FAIL, 0 SKIP, exit 0. Incluye las tres pruebas nuevas y los contratos de autoridad, orden, normalización y callbacks existentes.

`npx eslint apps/classrooms-ui/ClassroomCollection.tsx apps/classrooms-ui/ClassroomCollectionFilters.tsx apps/classrooms-ui/ClassroomCollectionCard.tsx apps/classrooms-ui/Classrooms.tsx`: exit 0.

`npx tsc -p apps/classrooms-ui/tsconfig.json --noEmit`: exit 1, TS2307 por declaraciones CSS modules ausentes para `apps/agenda-ui/Agenda.tsx:1` y `apps/classrooms-ui/Classrooms.tsx:2`. Este config no incluye next-env; no se cambió configuración ajena. No declarar tipos globales aprobados con esta prueba.

`git diff --check`: exit 0 después de quitar dos líneas vacías finales introducidas por escritura. Avisos de normalización LF/CRLF, sin error.

Sin QA visual ejecutada por este agente. No se usó navegador, servicios ni datos retenidos. Integración CSS, QA a cuatro anchos/ambos roles y comprobación global corresponden al coordinador.

## Commits and outcomes
Sin commits ni publicación. Implementación focal y pruebas de comportamiento aprobadas; AULA-001 sigue pendiente de integración/QA y cierre del coordinador.

## Handoff
Primer paso: root importa `classroom-collection-workspace.css` al final del punto común de estilos y agrega `tests/classroom-collection-workspace.test.mjs` al inventario. Contrato CSS: `.collection-workspace-page` solo en raíz Mis aulas, `.collection-workspace` en la sección de colección; nuevas reglas de tarjetas llevan prefijo de página/colección para superar especificidad del módulo existente sin afectar interiores. Luego validar tipos desde la app web y QA 320/390/768/1440, tarjetas/lista, Activas/Archivadas, filtros/chips y pendientes/CTA para ambos roles. No hay bloqueo funcional conocido; límite pendiente es evidencia integrada y visual.

## Refinamiento solicitado por coordinador — retiro efectivo de rol UI

La entrega inicial conservaba los controles de participación por compatibilidad con pruebas anteriores. El coordinador aclaró que la propuesta los reemplaza por Activas/Archivadas. Se corrigió la implementación sin ocultarlos con CSS:

- `ClassroomCollection.tsx`: retirados estado/import de rol y props role/onRole; la colección llama al filtro puro con `all`. Mensaje vacío de activas sin referencia a participación.
- `ClassroomCollectionFilters.tsx`: retirados arreglo de roles, props y nav JSX Todas/Donde enseño/Donde estudio.
- `tests/classrooms-reference-controls.test.mjs`: limpiar conserva Archivadas y búsqueda; tarjetas/lista conserva orden combinado y ambos callbacks exactos.
- `tests/foxmind-3d-flows-collection.test.mjs`: UI comprueba inicial Activas, alternancia Archivadas, conteos/orden y ausencia real de controles obsoletos; búsqueda vacía continúa diferenciando ausencia de coincidencias. Las tres pruebas puras del filtro permanecen sin cambios.

RED antes de este refinamiento: `node --test tests/foxmind-3d-flows-collection.test.mjs tests/classrooms-reference-controls.test.mjs`: 7 PASS, 1 FAIL por controles obsoletos presentes en JSX, exit 1.

GREEN: `node --test tests/classroom-collection-workspace.test.mjs tests/classrooms-reference-controls.test.mjs tests/classrooms-reference-filter.test.mjs tests/foxmind-3d-flows-collection.test.mjs`: 14 PASS, 0 FAIL, 0 SKIP, exit 0.

`npx eslint apps/classrooms-ui/ClassroomCollection.tsx apps/classrooms-ui/ClassroomCollectionFilters.tsx`: exit 0. `git diff --check`: exit 0, solo avisos de normalización de fin de línea. No se alteraron filtros puros, estilos root ni imports/inventario. Sin contradicciones pendientes conocidas. QA integrada continúa a cargo del coordinador.
