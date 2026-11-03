# UI-04 — Aulas expresivas

- Agent / role: classrooms / worker
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch / worktree: codex/foxmind-escritorio-expresivo
- Starting commit: ec024bc
- Phase and detailed task/spec links: [UI-04](../../odd/tasks/foxmind-escritorio-expresivo.md), [especificación §§2, 4–7](../foxmind-v1-functional-spec.md)
- Status: completed

## Request and scope

Aplicar la dirección Expresiva a la colección, el asistente de cuatro pasos y el interior por rol. Mantener los controles, las portadas vigentes y el guardado recuperable.

## Work performed

- Colección. Grilla de portadas con profundidad y lista compacta con participación identificada mediante texto y color.
- Asistente. `WizardGeneral.tsx` presenta una vista previa que refleja la portada, el nombre, la materia, la división y el ciclo lectivo del borrador actual. Conserva los radios, la revisión y el guardado existentes.
- Interior. `ClassroomHeader.tsx` aplica una variante de portada por rol. `classrooms-surface.module.css` distingue el Muro, Biblioteca y Progreso mediante los elementos específicos que ya componen esas vistas. El encabezado conserva una parte de la ilustración en móvil.

## Verification

- Antes de editar, controles y flujos de colección más navegación del asistente, 11/11.
- `node --test tests/classrooms-reference-controls.test.mjs tests/classrooms-reference-filter.test.mjs tests/foxmind-3d-flows-collection.test.mjs tests/wizard-reference-navigation.test.mjs tests/wizard-reference-drop.test.mjs tests/wizard-reference-suggestions.test.mjs tests/classroom-library-search.test.mjs`, 25/25.
- `node --test tests/p6-mobile-navigation.test.mjs tests/p5-web-client.test.mjs tests/audit-resource-lazy.test.mjs`, 12 casos aprobados, uno detenido por `P4 Docker network unavailable` antes de abrir navegador. La limpieza registró 0 fallas.
- `npx --no-install eslint apps/classrooms-ui/WizardGeneral.tsx apps/classrooms-ui/ClassroomHeader.tsx` pasó. `git diff --check` de los tres archivos pasó.

- `npx --no-install tsc -p apps/web/tsconfig.json --noEmit --incremental false` salió con código 0.
- Playwright con Edge contra el fixture local, datos sintéticos y movimiento reducido, 1280/390/320 px. Pasaron grilla y lista, actualización inmediata de la vista previa al editar nombre y portada, cuatro pasos presentes, pestañas exactas por rol, indicador de pestaña activo y ausencia de desbordamiento horizontal o excepciones de página. Capturas bajo `.test-artifacts/platform-polish/ui04/`. Tras detectar una columna heredada a 1280 px, ajusté la grilla y la segunda corrida confirmó tres columnas disponibles. El primer intento de carga del fixture agotó 30 s antes de que la ruta estuviera lista. El comando `ego-browser` no estaba instalado.
- El fixture no prueba guardado en base de datos, permisos del servidor ni apertura desde notificaciones.

## Commits and outcomes

Sin commits.

## Handoff

Entregar a coordinación las pruebas y capturas de UI-04. El recorrido autenticado móvil requiere el entorno Docker de pruebas.
