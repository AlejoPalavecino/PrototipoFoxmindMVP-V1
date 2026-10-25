# FoxMind 3D — contrato y secuencia arquitectónica

- Agent / role: architect, agente delegado de diseño.
- Session or task ID: `/root/visual_architecture` (identificador real de tarea expuesto por el runtime).
- Date: 2026-10-25.
- Branch / worktree: inicio `codex/foxmind-3d-design-kit`; coordinador creó durante esta tarea `codex/foxmind-3d-migration` sobre la misma base en el checkout canónico `C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind`.
- Starting commit: `eecb769151b12abb5ae9e1f15839b54c772e446f`.
- Phase and detailed task/spec links: [D0–D10](../design/foxmind-3d/implementation-plan.md), [matriz](../design/foxmind-3d/coverage.json), [tarea de implementación](../../odd/tasks/foxmind-3d-migration.md).
- Status: completed.

## Request and scope

Diseñar el contrato compartido exacto y slices ejecutables de la migración visual completa, incluido Inicio real por membresías activas. El coordinador transmitió autorización humana actual para implementación local completa; esta tarea delegada solo escribe el documento de tarea y este registro. Sin código producto, tests, roadmap compartido, Engram writes, push, despliegue, secretos ni datos retenidos.

## Work performed

- Leídos AGENTS del proyecto y `apps/web/AGENTS.md`, protocolo de registros, roadmap, plan visual, foundations, matriz y contratos de flujo pertinentes.
- Aplicadas las skills `sdd-ambiguity-gate`, `clean-architecture`, `team-docs-strategy` y `cognitive-doc-design`.
- Inspeccionados estado Git y contratos públicos de aulas, Agenda y dominio. `apps/classrooms-ui/index.ts` no existe; el límite público actual se apoya en `api.ts` y `ClassroomsApp.tsx`. Manifest de marca localizado en `docs/design/foxmind-3d/sources/brand/manifest.json`.
- Escrito `odd/tasks/foxmind-3d-migration.md`: DoR listo, contrato Home puro y factories/UoW exactos, ampliación compatible de coverKey, estados/consultas acotadas/permisos/semántica de colas y miniagenda, interfaces gráficas, ownership para tres workers, etapas D0–D10, primer slice S0/D9-A y82 IDs de evidencia futura individualizados.
- Lecturas de implementación dirigidas confirmaron receptionPolicy (max general/individual, vencido en igualdad), grado privado/publicado y effective_grade_id, roles por periodos, límite Agenda93d/recurrencia53 y falta de agregado de eventos privados en upcoming. Esas observaciones fijan el contrato; no se ejecutó producto ni se alteró regla académica.
- Retirado Home/open y el puerto resolve al resolver observación del coordinador: cada adaptador Home usa el guard existente del recurso; los únicos nuevos endpoints son GET agregado y GET de módulo paginado. Sidebar/drawer y mixed simultáneo se documentan como sustitución visual autorizada de la topbar V1.

## Verification

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`: observados; cambios ajenos no rastreados preservados.
- Lecturas documentales y búsquedas dirigidas con `rg`: realizadas. Dos rutas indicadas inicialmente no existían (barrel UI y manifest abreviado); se localizaron sus superficies reales sin crear sustitutos. Una consulta rg con glob Windows y una lectura Raw/TotalCount incompatible fallaron; se corrigió el modo de lectura, sin cambios de archivos por esos fallos.
- Comprobación estructural PowerShell observada: coverage=82/expected82/missing0/duplicate0;334 líneas en la unidad de tarea; missing-links=0. `git diff --check` exit0. Branch actual observada `codex/foxmind-3d-migration`.
- Pruebas funcionales no ejecutadas: esta asignación produce diseño/documentación, no cambios de comportamiento.
- El coordinador informó baseline D0 y RED S0 de8 grupos en `tests/foxmind-3d-contracts.test.mjs`; esta tarea no ejecutó esas pruebas ni las presenta como prueba propia.

## Commits and outcomes

Sin commit propio. Diseño completo entregado al coordinador para implementación/pruebas; estados de producto siguen pendientes. Sin cambios fuera de las dos rutas asignadas; sin Engram por ausencia de registro runtime confirmado.

## Handoff

Primera tarea de producto pendiente: Worker1 consume S0 y RED ya observado para implementar `createHomeService`/`createHomeUnitOfWork` y participación/pendientes D9-A; runner amplía RED para review/feedback/miniagenda y guards. Worker2 puede avanzar D1 decorativo con interfaces acordadas; Worker3 cambia Plan default/COV solo después del RED correspondiente. Coordinador posee integración/roadmap/commits y reconciliación de82 IDs; este agente no marca fases completas. Sin ambigüedad de negocio pendiente.
