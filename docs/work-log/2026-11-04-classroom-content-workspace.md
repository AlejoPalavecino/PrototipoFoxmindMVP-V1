# AULA-004 — Contenido y gestión del aula

- Agent / role: worker de contenido
- Session or task ID: /root/classroom_content
- Date: 2026-11-04
- Branch / worktree: codex/classroom-workspace-polish; checkout compartido
- Starting commit: b0393247ba104f275fd6c4b2296fdee591ca7661
- Phase and detailed task/spec links: [AULA-004](../../odd/tasks/classroom-workspace-polish.md); contrato vigente [funcional](../foxmind-v1-functional-spec.md)
- Status: in_progress

## Request and scope

Pulir Actividades, Progreso, Alumnos/Compañeros, Historial y Configuración según dirección crema/naranja aprobada. Mantener contratos, permisos, destinos, cancelación, revisión y archivo. Escritura limitada a los seis componentes asignados, CSS propio, prueba focal propia y este registro. No servicios externos, datos retenidos, secretos, commits ni publicación.

## Work performed

Leídos instrucciones del proyecto, roadmap, tareas, protocolo de registro y componentes. Git inicial sin modificaciones de código: solo registro coordinador y tarea sin seguimiento. Guía ui-ux-pro-max consultada: foco visible en controles y acceso táctil de 44px.

- `apps/classrooms-ui/Activities.tsx`: Revisar pendientes primero y primario, solo docente/publicada; acceso alumno primario; consulta y opciones en grupo accesible, conservando editor, permisos, filtros y confirmaciones.
- `apps/classrooms-ui/Progress.tsx`: aclaración de calificaciones publicadas; fórmulas y tratamiento de faltantes intactos.
- `apps/classrooms-ui/ClassroomRoster.tsx`: lista identificada por rol, estado vacío anunciado, fechas de ingreso explícitas y resumen distinguible; callbacks de resumen/remoción intactos.
- `apps/classrooms-ui/ClassroomHistory.tsx`: explicación de consulta por resumen y exclusión de indicadores actuales.
- `apps/classrooms-ui/ClassroomMembers.tsx`: secciones/lista identificadas accesiblemente; operaciones vigentes intactas.
- `apps/classrooms-ui/ClassroomSettings.tsx`: datos y opciones con nombres accesibles, guardado explícito y lifecycle separado. Revisión, conflictos y boundary disabled conservados.
- `apps/shared-ui/classroom-content-workspace.css`: estilos propios, todos bajo `.fm3d-theme .classroom-workspace`; crema/naranja, Fredoka/Segoe UI, foco, 44px, adaptación de tarjetas/métricas/listas y reduced motion. Requiere importación e integración del coordinador.
- `tests/classroom-content-workspace.test.mjs`: tres casos nuevos para prioridad docente, permisos/acceso alumno y agrupación de configuración archivada.

## Verification

- RED: `node --test tests/classroom-content-workspace.test.mjs` — salida 1, 0 PASS/3 FAIL por prioridad docente, clase primaria alumno y grupos ausentes, antes de implementar.
- GREEN: `node --test tests/classroom-content-workspace.test.mjs tests/education-experience.test.mjs tests/grading-ai-ui.test.mjs` — salida 0, 13 PASS/0 FAIL. Operaciones de revisión sin escritura y guardado IA vigente cubiertos.
- Regresión ampliada inicial con `tests/p8-progress-client.test.mjs`: 14 PASS/1 FAIL. El fallo busca tabs inline en ClassroomView, extraídos concurrentemente por el coordinador a ClassroomNavigation; informado para adaptación de esa prueba fuente, fuera de propiedad de este worker.
- `npx eslint apps/classrooms-ui/Activities.tsx apps/classrooms-ui/Progress.tsx apps/classrooms-ui/ClassroomRoster.tsx apps/classrooms-ui/ClassroomHistory.tsx apps/classrooms-ui/ClassroomMembers.tsx apps/classrooms-ui/ClassroomSettings.tsx` — salida 0.
- `npx tsc --noEmit -p apps/classrooms-ui/tsconfig.json` — salida 1: TS2307 en imports de módulos CSS de Agenda.tsx y Classrooms.tsx; configuración aislada no incluye declaraciones CSS. No se declara tipos aprobados; root debe usar el chequeo integrado vigente.
- `git diff --check` — salida 0; avisos de normalización CRLF en archivos de escritores ajenos.
- QA visual/navegador no ejecutada por este worker; importación CSS, especificidad frente a módulos del interior, 320/390/768/1440 y estados/roles requieren integración del coordinador. Sin pruebas con backend/servicios externos.

## Commits and outcomes

Sin commits.

## Handoff

Implementación y prueba focal entregadas; estado in_progress porque faltan QA y verificación integrada. Root solicitó cerrar sin cambios extra. Próxima acción exacta: importar `classroom-content-workspace.css` en el bundle compartido después de estilos previos, registrar tres casos nuevos en inventario, adaptar p8-progress-client a ClassroomNavigation y comprobar el candidato integrado en navegador. Root puede reforzar especificidad frente a classroom-interior-reference. Sin bloqueo de producto ni cambios de APIs/persistencia. No se marca AULA-004 ni fase global DONE.
